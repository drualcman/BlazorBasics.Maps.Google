let markers = new Map();
let map = null;
let directionsService = null;
let directionsRenderer = null;
let routeMarkers = [];
let activeMarker = null;
let geocoder = null;
let mapClickListener = null;
let dotNetHelper = null;
let mapClickMethodName = null;

function load(apiKey, scriptId) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(scriptId) && window.google && window.google.maps) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker&v=beta`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.google && window.google.maps) {
                resolve(true);
            } else {
                reject("Google Maps API did not load correctly.");
            }
        };
        script.onerror = () => reject("Failed to load Google Maps script.");
        document.head.appendChild(script);
    });
}

function initMap(elementId, mapId) {
    map = new google.maps.Map(document.getElementById(elementId), {
        center: { lat: 0, lng: 0 },
        zoom: 16,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        rotateControl: false,
        gestureHandling: "cooperative",
        mapId: mapId
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        map: map
    });

    geocoder = new google.maps.Geocoder();
}

function enableMapClick(dotNetReference, methodName) {

    console.log("Map click handler.", dotNetReference, methodName);
    if (!map) {
        console.warn("Map not initialized. Cannot enable click handling.");
        return false;
    }

    if (mapClickListener) {
        console.warn("Map click handler already enabled.");
        return false;
    }

    dotNetHelper = dotNetReference;
    mapClickMethodName = methodName;

    mapClickListener = google.maps.event.addListener(map, 'click', (event) => {
        const latLng = event.latLng;
        const lat = latLng.lat();
        const lng = latLng.lng();

        // Realizar geocodificación inversa para obtener la dirección
        geocoder.geocode({ location: latLng }, (results, status) => {
            let address = '';
            let placeDetails = null;

            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                const result = results[0];
                address = result.formatted_address || '';
                // Información adicional: componentes de la dirección (opcional)
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

            // Enviar datos a Blazor vía JSInterop
            if (dotNetHelper && mapClickMethodName) {
                dotNetHelper.invokeMethodAsync(mapClickMethodName, lat, lng, address, placeDetails);
            }
        });
    });

    console.log("Map click handler enabled.");
    return true;
}

function disableMapClick() {
    if (mapClickListener) {
        google.maps.event.removeListener(mapClickListener);
        mapClickListener = null;
        dotNetHelper = null;
        mapClickMethodName = null;
        console.log("Map click handler disabled.");
        return true;
    }
    return false;
}

function addPoint(id, lat, lng, desc, svgIcon, htmlContent) {
    if (!map) return false;
    if (markers.has(id) && markers.get(id).isFromRoute) {
        console.warn("Cannot override route marker with addPoint, id: " + id);
        return false;
    }

    const position = new google.maps.LatLng(lat, lng);

    let markerContent = null;
    if (svgIcon) {
        const img = document.createElement("img");
        img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`;
        img.style.width = "100px";   // mismo tamaño que antes
        img.style.height = "100px";
        img.style.transform = "translate(-50%, -50%)"; // centra el icono
        img.style.position = "absolute"; // evita desplazamientos
        markerContent = img;
    }

    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: position,
        map: map,
        title: desc,
        content: markerContent
    });

    marker.originalContent = markerContent;
    marker.isFromRoute = false;
    markers.set(id, marker);

    if (htmlContent) {
        const infoWindow = new google.maps.InfoWindow({
            content: htmlContent
        });

        marker.addListener("click", () => {
            infoWindow.open({
                anchor: marker,
                map,
                shouldFocus: false
            });
        });
    }
}

function centerMap(lat, lng) {
    if (!map) return false;
    map.setCenter({ lat: lat, lng: lng });
}

function removePoint(id) {
    if (!markers.has(id)) return false;
    const marker = markers.get(id);
    marker.setMap(null);
    markers.delete(id);
}

function cleanMap() {
    markers.forEach((marker) => marker.setMap(null));
    markers.clear();

    if (directionsRenderer) {
        directionsRenderer.setMap(null);
        directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
    }
}

function showRoute(startLat, startLng, endLat, endLng, travelMode = "DRIVING") {
    if (!map || !directionsService || !directionsRenderer) return false;

    const request = {
        origin: { lat: startLat, lng: startLng },
        destination: { lat: endLat, lng: endLng },
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            console.warn("Directions request failed due to: " + status);
        }
    });
}

function showRouteWithWaypoints(points, travelMode = "DRIVING") {
    if (!map || !directionsService || !directionsRenderer) return false;

    console.log(points);

    // Helper para asegurar que siempre devolvemos números desde tu DTO
    const toLatLng = (latLong) => {
        if (!latLong || typeof latLong.latitude === "undefined" || typeof latLong.longitude === "undefined") {
            console.error("Invalid latLong object received:", latLong);
            return { lat: 0, lng: 0 };
        }
        return {
            lat: Number(latLong.latitude),
            lng: Number(latLong.longitude)
        };
    };

    // Normaliza un objeto Posición que pueda venir del Directions result (LatLng object o LatLngLiteral)
    const normalizePosition = (pos) => {
        if (!pos) return null;
        if (typeof pos.lat === "function") {
            return { lat: pos.lat(), lng: pos.lng() };
        }
        return { lat: Number(pos.lat), lng: Number(pos.lng) };
    };

    // limpiar marcadores previos (compatible con Marker y AdvancedMarkerElement)
    routeMarkers.forEach(m => {
        if (!m) return;
        if (typeof m.setMap === "function") {
            try { m.setMap(null); } catch { /* ignore */ }
        } else {
            try { m.map = null; } catch { /* ignore */ }
        }
    });
    routeMarkers = [];
    activeMarker = null;

    if (!points || points.length < 2) {
        console.warn("At least 2 points (start and end) are required.");
        return false;
    }

    const origin = toLatLng(points[0].position);
    const destination = toLatLng(points[points.length - 1].position);

    const waypoints = [];
    for (let i = 1; i < points.length - 1; i++) {
        waypoints.push({
            location: toLatLng(points[i].position),
            stopover: true
        });
    }

    const request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
            directionsRenderer.setDirections(result);

            const route = result.routes[0];

            // origen
            const startLeg = route.legs[0];
            placeMarker(points[0], startLeg.start_location, true, 0);

            // intermedios alineados con la ruta (leg.end_location)
            for (let i = 0; i < route.legs.length; i++) {
                const leg = route.legs[i];
                if (i < route.legs.length - 1) {
                    placeMarker(points[i + 1], leg.end_location, false, i + 1);
                }
            }

            // destino
            const lastLeg = route.legs[route.legs.length - 1];
            placeMarker(points[points.length - 1], lastLeg.end_location, true, points.length - 1);
        } else {
            console.warn("Directions request failed due to: " + status);
        }
    });

    function placeMarker(p, position, isEndpoint, idx) {
        const normPos = normalizePosition(position) || toLatLng(p.position);

        // crear content (SVG en extremos, círculo intermedio)
        let markerContent;
        if (p.svgIcon && isEndpoint) {
            const img = document.createElement("img");
            img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(p.svgIcon)}`;
            img.style.width = "100px";
            img.style.height = "100px";
            // keep center on coord and allow pointer events
            img.style.transform = "translate(-50%, -50%)";
            img.style.position = "absolute";
            img.style.cursor = "pointer";
            img.style.userSelect = "none";
            markerContent = img;
        } else {
            const div = document.createElement("div");
            div.style.width = "12px";
            div.style.height = "12px";
            div.style.borderRadius = "50%";
            div.style.backgroundColor = p.color || "blue";
            div.style.transform = "translate(-50%, -50%)";
            div.style.position = "absolute";
            div.style.cursor = "pointer";
            div.style.userSelect = "none";
            markerContent = div;
        }

        // Crear AdvancedMarkerElement usando la posición normalizada
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: normPos,
            map: map,
            content: markerContent
        });

        // guardamos el content original para restaurar luego
        marker.originalContent = markerContent;

        // si hay htmlContent, creamos InfoWindow y añadimos handler en el elemento DOM
        if (p.htmlContent) {
            const infoWindow = new google.maps.InfoWindow({
                content: p.htmlContent
            });

            // handler que abre el popup y hace la animación
            const onClick = (ev) => {
                // restore previous active
                if (activeMarker && activeMarker !== marker) {
                    try { activeMarker.content = activeMarker.originalContent; } catch { /* ignore */ }
                }

                // efecto agrandar
                if (markerContent && markerContent.tagName === "DIV") {
                    const clone = markerContent.cloneNode(true);
                    // mantener centrado y escalar
                    clone.style.transform = "translate(-50%, -50%) scale(1.6)";
                    clone.style.position = "absolute";
                    marker.content = clone;
                } else if (markerContent && markerContent.tagName === "IMG") {
                    const clone = markerContent.cloneNode(true);
                    // escalamos visualmente (también mantenemos translate para centrar)
                    clone.style.transform = "translate(-50%, -50%) scale(1.6)";
                    clone.style.position = "absolute";
                    // si prefieres cambiar width/height en vez de scale, puedes hacerlo aquí
                    marker.content = clone;
                }

                activeMarker = marker;

                // restaurar tras 3s
                setTimeout(() => {
                    if (activeMarker === marker) {
                        try { marker.content = marker.originalContent; } catch { /* ignore */ }
                        activeMarker = null;
                    }
                }, 3000);

                // abrir InfoWindow en la coordenada normalizada
                if (normPos) {
                    // use open with map+position (robusto)
                    infoWindow.open({
                        anchor: marker,
                        map: map,
                        shouldFocus: true,
                        pixelOffset: new google.maps.Size(0, -20)
                    });
                } else {
                    // fallback
                    infoWindow.open(map);
                }
            };

            // IMPORTANT: attach listener to the content DOM node (works reliably)
            try {
                markerContent.addEventListener("click", onClick);
            } catch (e) {
                // si por alguna razón no se puede (null), intentamos usar evento de marker
                try {
                    google.maps.event.addListener(marker, "gmp-click", onClick);
                } catch (ee) {
                    console.error("Could not attach click handler to marker content.", ee);
                }
            }
        }

        routeMarkers.push(marker);
        marker.isFromRoute = true;
        markers.set(p.id || `route-${idx}`, marker);
    }
}


function highlightMarker(id) {
    if (!map || !markers.has(id)) return false;

    const marker = markers.get(id);

    // Restaurar el activo previo
    if (activeMarker && activeMarker !== marker) {
        try { activeMarker.content = activeMarker.originalContent; } catch { /* ignore */ }
    }

    if (!marker.originalContent) {
        console.warn("Marker " + id + " has no original content stored.");
        return false;
    }

    // Crear un clon del content original escalado
    const clone = marker.originalContent.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.transform = "translate(-50%, -50%) scale(1.6)";
    marker.content = clone;

    activeMarker = marker;
    return true;
}

function unhighlightMarker(id) {
    if (!map || !markers.has(id)) return false;

    const marker = markers.get(id);
    if (marker.originalContent) {
        marker.content = marker.originalContent;
    }

    if (activeMarker && activeMarker === marker) {
        activeMarker = null;
    }
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
    highlightMarker,
    unhighlightMarker
};