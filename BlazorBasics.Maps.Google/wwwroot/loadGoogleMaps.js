let markers = new Map();
let map = null;
let directionsService = null;
let routes = new Map();
let activeMarker = null;
let geocoder = null;
let mapClickListener = null;
let dotNetHelper = null;
let mapClickMethodName = null;
let infoWindows = new Map();
let myElementId = null;
let myMapId = null;
let loadResolve = null;
let loadReject = null;

function googleMapsCallback() {
    if (window.google && window.google.maps) {
        if (loadResolve) {
            loadResolve(true);
            loadResolve = null;
            loadReject = null;
        }
    } else {
        if (loadReject) {
            loadReject("Google Maps API did not load correctly.");
            loadResolve = null;
            loadReject = null;
        }
    }
}

if (!window.googleMapsCallback) {
    window.googleMapsCallback = googleMapsCallback;
}

function load(apiKey, scriptId) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(scriptId) && window.google && window.google.maps) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker&loading=async&callback=googleMapsCallback`;
        script.async = true;
        script.defer = true;

        script.onerror = () => {
            if (loadReject) {
                loadReject("Failed to load Google Maps script.");
                loadResolve = null;
                loadReject = null;
            }
        };

        document.head.appendChild(script);
        loadResolve = resolve;
        loadReject = reject;
    });
}

function initMap(elementId, mapId) {
    myElementId = elementId;
    myMapId = mapId;
    map = new google.maps.Map(document.getElementById(myElementId), {
        center: { lat: 0, lng: 0 },
        zoom: 16,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        rotateControl: false,
        gestureHandling: "cooperative",
        mapId: myMapId
    });

    directionsService = new google.maps.DirectionsService();
    geocoder = new google.maps.Geocoder();
    console.info('initMap:', myElementId);
}

function sendClickToBlazor(lat, lng, markerId = null) {
    if (dotNetHelper && mapClickMethodName) {
        const latLng = new google.maps.LatLng(lat, lng);
        geocoder.geocode({ location: latLng }, (results, status) => {
            let address = '';
            let placeDetails = null;

            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                const result = results[0];
                address = result.formatted_address || '';
                placeDetails = {
                    streetNumber: '',
                    route: '',
                    neighborhood: '',
                    locality: '',
                    administrativeArea: '',
                    country: '',
                    postalCode: ''
                };
                result.address_components.forEach(component => {
                    const types = component.types;
                    if (types.includes('street_number')) placeDetails.streetNumber = component.long_name;
                    if (types.includes('route')) placeDetails.route = component.long_name;
                    if (types.includes('neighborhood') || types.includes('sublocality')) placeDetails.neighborhood = component.long_name;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) placeDetails.locality = component.long_name;
                    if (types.includes('administrative_area_level_1')) placeDetails.administrativeArea = component.long_name;
                    if (types.includes('country')) placeDetails.country = component.long_name;
                    if (types.includes('postal_code')) placeDetails.postalCode = component.long_name;
                });
            } else {
                console.warn('Geocoder failed due to: ' + status);
            }

            dotNetHelper.invokeMethodAsync(mapClickMethodName, lat, lng, address, placeDetails, markerId);
        });
    }
}

function enableMapClick(dotNetReference, methodName) {
    if (!map) {
        console.warn("Map not initialized. Cannot enable click handling.");
        return false;
    }
    if (mapClickListener) return false;

    dotNetHelper = dotNetReference;
    mapClickMethodName = methodName;

    mapClickListener = google.maps.event.addListener(map, 'click', (event) => {
        const latLng = event.latLng;
        sendClickToBlazor(latLng.lat(), latLng.lng(), null);
    });
    console.info('Map click enabled');
    return true;
}

function disableMapClick() {
    if (mapClickListener) {
        google.maps.event.removeListener(mapClickListener);
        mapClickListener = null;
        dotNetHelper = null;
        mapClickMethodName = null;
        console.info('Map click disabled');
        return true;
    }
    return false;
}

function addPoint(id, lat, lng, desc, svgIcon, htmlContent) {
    if (!map) {
        console.warn("Map not initialized. Cannot addPoint.");
        return false;
    }
    if (markers.has(id) && markers.get(id).isFromRoute) {
        console.warn("Cannot override route marker with addPoint, id: " + id);
        return false;
    }

    const position = new google.maps.LatLng(lat, lng);

    let markerContent = null;
    if (svgIcon) {
        const img = document.createElement("img");
        img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`;
        img.style.transform = "translate(-50%, -50%)";
        img.style.position = "absolute";
        markerContent = img;
    }

    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: position,
        map: map,
        title: desc,
        content: markerContent
    });

    marker.id = id;
    marker.originalContent = markerContent;
    marker.isFromRoute = false;
    markers.set(id, marker);

    let infoWindow = null;
    if (htmlContent) {
        infoWindow = new google.maps.InfoWindow({ content: htmlContent });
        infoWindows.set(id, infoWindow);

        const onMarkerClick = () => {
            const markerPosition = marker.position;
            const bounds = map.getBounds();
            if (!bounds || !bounds.contains(markerPosition)) {
                map.panTo(markerPosition);
            }
            infoWindow.setPosition(markerPosition);
            infoWindow.open({ map: map });
            sendClickToBlazor(lat, lng, id);
        };
        marker.addListener("click", onMarkerClick);
    } else {
        marker.addListener("click", () => sendClickToBlazor(lat, lng, id));
    }
    return true;
}

function centerMap(lat, lng) {
    if (!map) return false;
    map.setCenter({ lat: lat, lng: lng });  
    return true;
}

function removePoint(id) {
    if (!markers.has(id)) {
        console.warn('removePoint: nor found ID:', id);
        return false;
    }
    const marker = markers.get(id);
    try {
        marker.setMap(null);
        if (infoWindows.has(id)) {
            infoWindows.get(id).close();
            infoWindows.delete(id);
        }
        markers.delete(id);
    } catch (e) {
        console.error('Error removePoint:', e);
        return false;
    }
    return true;
}

function cleanMap() {
    markers.clear();
    routes.clear();
    infoWindows.clear();
    initMap(myElementId, myMapId);
    console.log('Map cleared');
    return true;
}

function normalizePosition(pos) {
    if (!pos) return null;
    if (typeof pos.lat === "function") return { lat: pos.lat(), lng: pos.lng() };
    return { lat: Number(pos.lat), lng: Number(pos.lng) };
}

function toLatLng(latLong) {
    if (!latLong || typeof latLong.latitude === "undefined" || typeof latLong.longitude === "undefined") {
        return { lat: 0, lng: 0 };
    }
    return { lat: Number(latLong.latitude), lng: Number(latLong.longitude) };
}

function placeRouteMarker(routeId, point, position, idx, color, localMarkers) {
    const normPos = normalizePosition(position) || toLatLng(point.position);
    const markerLat = normPos.lat;
    const markerLng = normPos.lng;
    const markerId = point.id || `${routeId}-p${idx}`;

    let markerContent;
    if (point.svgIcon) {
        const img = document.createElement("img");
        img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(point.svgIcon)}`;
        img.style.transform = "translate(-50%, -50%)";
        img.style.position = "absolute";
        img.style.cursor = "pointer";
        markerContent = img;
    } else {
        const div = document.createElement("div");
        div.style.width = "12px";
        div.style.height = "12px";
        div.style.borderRadius = "50%";
        div.style.backgroundColor = point.color || color || "green";
        div.style.transform = "translate(-50%, -50%)";
        div.style.position = "absolute";
        div.style.cursor = "pointer";
        markerContent = div;
    }

    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: normPos,
        map: map,
        content: markerContent
    });

    marker.id = markerId;
    marker.originalContent = markerContent;
    marker.isFromRoute = true;
    markers.set(markerId, marker);
    localMarkers.push(marker);

    if (point.htmlContent) {
        const iw = new google.maps.InfoWindow({ content: point.htmlContent });
        infoWindows.set(markerId, iw);

        const onMarkerClick = () => {
            const markerPosition = marker.position;
            const bounds = map.getBounds();
            if (!bounds || !bounds.contains(markerPosition)) {
                map.panTo(markerPosition);
            }
            iw.setPosition(markerPosition);
            iw.open({ map: map });
            sendClickToBlazor(markerLat, markerLng, markerId);
        };

        // Escucha el click tanto si el marker usa content HTML como imagen
        try {
            markerContent.addEventListener("click", onMarkerClick);
        } catch {
            google.maps.event.addListener(marker, "gmp-click", onMarkerClick);
        }

    } else {
        // Sin InfoWindow, solo reporta el click
        try {
            markerContent.addEventListener("click", () => sendClickToBlazor(markerLat, markerLng, markerId));
        } catch {
            google.maps.event.addListener(marker, "gmp-click", () => sendClickToBlazor(markerLat, markerLng, markerId));
        }
    }

}

function createDirectionsRenderer(color, arrowOptions = null) {
    const polylineOptions = {
        strokeColor: color || "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 5
    };

    // Add arrows if enabled
    if (arrowOptions && arrowOptions.enabled === true) {
        const arrowTypes = [
            "CIRCLE",                  // 0
            "FORWARD_CLOSED_ARROW",    // 1
            "FORWARD_OPEN_ARROW",      // 2
            "BACKWARD_CLOSED_ARROW",   // 3
            "BACKWARD_OPEN_ARROW",     // 4
        ];
        let arrowTypeString = arrowTypes[arrowOptions.arrowType] || "FORWARD_CLOSED_ARROW";

        if (google.maps.SymbolPath[arrowTypeString] === undefined || google.maps.SymbolPath[arrowTypeString] === null) {
            console.warn(`Arrow type ${arrowTypeString} not found, using default`);
            arrowOptions.arrowType = 1;
        }

        polylineOptions.icons = [{
            icon: {
                path: arrowOptions.arrowType,
                scale: arrowOptions.scale || 10,
                strokeColor: arrowOptions.color || color || "#1a73e8"
            },
            offset: arrowOptions.offset ? arrowOptions.offset + "%" : "50%",
            repeat: (arrowOptions.repeatPixels || 100) + "px"
        }];
    }

    return new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: polylineOptions,
        map: map
    });
}

function showRoute(id, startPoint, endPoint, travelMode = "DRIVING", color = "#4285F4") {
    if (!map || !directionsService) {
        console.warn("Map not initialized. Cannot showRoute.");
        return false;
    }

    if (!startPoint || !endPoint) {
        console.error("StartPoint and EndPoint are required.");
        return false;
    }

    if (routes.has(id)) removeRoute(id);

    const arrowOptions = startPoint.arrowOptions || null;
    const renderer = createDirectionsRenderer(color, arrowOptions);

    const origin = toLatLng(startPoint.position);
    const destination = toLatLng(endPoint.position);

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes.length > 0) {
            renderer.setDirections(result);
            const route = result.routes[0];
            const localMarkers = [];

            // Coloca los puntos
            const startLeg = route.legs[0];
            const endLeg = route.legs[route.legs.length - 1];
            placeRouteMarker(id, startPoint, startLeg.start_location, 0, color, localMarkers);
            placeRouteMarker(id, endPoint, endLeg.end_location, 1, color, localMarkers);

            // Ajustar el zoom automáticamente a toda la ruta
            const bounds = new google.maps.LatLngBounds();
            route.overview_path.forEach((pos) => bounds.extend(pos));
            map.fitBounds(bounds);

            routes.set(id, { renderer: renderer, markers: localMarkers });
        } else {
            console.warn("Directions request failed due to: " + status);
        }
    });

    return true;
}

function showRouteWithWaypoints(id, points, travelMode = "DRIVING", defaultColor = "#4285F4") {
    if (!map || !directionsService) {
        console.warn("Map not initialized. Cannot showRouteWithWaypoints.");
        return false;
    }
    if (routes.has(id)) removeRoute(id);
    if (!points || points.length < 2) {
        console.warn("At least 2 points (start and end) are required.");
        return false;
    }

    const localMarkers = [];
    const renderers = [];
    const bounds = new google.maps.LatLngBounds(); // acumula todos los puntos

    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];

        const routeColour = (start.routeColour && start.routeColour.trim() !== "") ? start.routeColour : defaultColor;
        const pointColour = (start.pointColour && start.pointColour.trim() !== "") ? start.pointColour : defaultColor;
        const arrowOptions = start.arrowOptions || null;
        const renderer = createDirectionsRenderer(routeColour, arrowOptions);
        renderers.push(renderer);

        const origin = toLatLng(start.position);
        const destination = toLatLng(end.position);

        const request = {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode[travelMode]
        };

        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result && result.routes.length > 0) {
                renderer.setDirections(result);
                const route = result.routes[0];
                const leg = route.legs[0];

                placeRouteMarker(id, start, leg.start_location, i, pointColour, localMarkers);
                if (i === points.length - 2) {
                    placeRouteMarker(id, end, leg.end_location, i + 1, pointColour, localMarkers);
                }

                // Extiende los límites con todos los puntos del tramo
                route.overview_path.forEach((pos) => bounds.extend(pos));

                // Si es el último tramo, ajusta el zoom
                if (i === points.length - 2) {
                    map.fitBounds(bounds);
                }
            } else {
                console.warn("Directions request failed for segment " + i + " due to: " + status);
            }
        });
    }

    routes.set(id, { renderer: renderers, markers: localMarkers });
    return true;
}


function highlightMarker(id, color = "#006400") {
    if (!map || !markers.has(id)) {
        console.warn("Map not initialized. Cannot highlightMarker or not found marker ID:", id, markers);
        return false;
    }
    const marker = markers.get(id);
    if (activeMarker && activeMarker !== marker) {
        try { activeMarker.content = activeMarker.originalContent; } catch { }
    }
    if (!marker.originalContent) return false;

    const clone = marker.originalContent.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.transform = "translate(-50%, -50%) scale(1.6)";
    if (clone.style && clone.style.backgroundColor) {
        clone.style.backgroundColor = color;
    }
    if (clone.tagName === "IMG") {
        clone.style.filter = "drop-shadow(0 0 6px " + color + ")";
    }
    marker.content = clone;
    activeMarker = marker;
    return true;
}

function unhighlightMarker(id) {
    if (!map || !markers.has(id)) {
        console.warn('unhighlightMarker: Not found marker ID:', id);
        return false;
    }
    const marker = markers.get(id);
    if (marker.originalContent) {
        marker.content = marker.originalContent;
    }
    if (activeMarker && activeMarker === marker) {
        activeMarker = null;
    }
    return true;
}


function removeRoute(id) {
    if (!routes.has(id)) {
        return false;
    }

    const routeData = routes.get(id);

    // Limpiar markers de esa ruta
    if (routeData.markers && routeData.markers.length > 0) {
        routeData.markers.forEach(m => {
            const markerId = m.id || id;  // Usa m.id si existe, fallback a routeId
            if (markers.has(markerId)) {
                markers.delete(markerId);
            }
            try {
                m.setMap(null);
                // Cerrar InfoWindow si existe
                if (infoWindows.has(markerId)) {
                    infoWindows.get(markerId).close();
                    infoWindows.delete(markerId);
                }
            } catch (e) {
                console.error('Error while remove route:', e);
            }
        });
    }

    // Limpiar renderer
    if (routeData.renderer) {
        try {
            if (Array.isArray(routeData.renderer)) {
                routeData.renderer.forEach(r => {
                    if (r && typeof r.setMap === "function") {
                        r.setMap(null);
                    }
                });
            } else if (typeof routeData.renderer.setMap === "function") {
                routeData.renderer.setMap(null);
            }
        } catch (e) {
            console.error('Error on renderer:', e);
        }
    }

    routes.delete(id);
    return true;
}

// Export API
export {
    load,
    initMap,
    enableMapClick,
    disableMapClick,
    addPoint,
    centerMap,
    removePoint,
    cleanMap,
    showRoute,
    showRouteWithWaypoints,
    removeRoute,
    highlightMarker,
    unhighlightMarker
};
