let markers = new Map();
let map = null;
let directionsService = null;
let routes = new Map();
let activeMarker = null;
let geocoder = null;
let mapClickListener = null;
let dotNetHelper = null;
let mapClickMethodName = null;
let infoWindows = new Map();  // Nuevo: Trackea InfoWindows para cerrarlas en clean

// Variable global para la promesa (debe estar fuera de la función para que sea accesible)
let loadResolve = null;
let loadReject = null;

// Función callback global que Google llama cuando la API está lista
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

// Asignar al window para que sea global (solo una vez, al cargar el JS)
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

        // El callback maneja el éxito, pero onerror para fallos de red
        script.onerror = () => {
            if (loadReject) {
                loadReject("Failed to load Google Maps script.");
                loadResolve = null;
                loadReject = null;
            }
        };

        // No necesitamos onload porque el callback lo reemplaza
        document.head.appendChild(script);

        // Asignar la promesa actual
        loadResolve = resolve;
        loadReject = reject;
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
    geocoder = new google.maps.Geocoder();
    console.info('initMap:', elementId);
}

// Función compartida para geocodificar y enviar a Blazor
function sendClickToBlazor(lat, lng, markerId = null) {
    // Enviar datos a Blazor vía JSInterop
    if (dotNetHelper && mapClickMethodName) {
        const latLng = new google.maps.LatLng(lat, lng);
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

            dotNetHelper.invokeMethodAsync(mapClickMethodName, lat, lng, address, placeDetails, markerId);
        });
    }
}

function enableMapClick(dotNetReference, methodName) {
    if (!map) {
        console.warn("Map not initialized. Cannot enable click handling.");
        return false;
    }

    if (mapClickListener) {
        return false;
    }

    dotNetHelper = dotNetReference;
    mapClickMethodName = methodName;

    mapClickListener = google.maps.event.addListener(map, 'click', (event) => {
        const latLng = event.latLng;
        const lat = latLng.lat();
        const lng = latLng.lng();

        // Llamar a la función compartida (con markerId null para clics en mapa)
        sendClickToBlazor(lat, lng, null);
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

    marker.id = id;  // Agregar ID al marker para remociones
    marker.originalContent = markerContent;
    marker.isFromRoute = false;
    markers.set(id, marker);

    let infoWindow = null;
    if (htmlContent) {
        infoWindow = new google.maps.InfoWindow({
            content: htmlContent
        });
        infoWindows.set(id, infoWindow);  // Trackear para cierre

        // Handler para clic en marcador
        const onMarkerClick = () => {
            const markerPosition = marker.position;  // Fijado: era normPos, que no existía

            // Center smoothly if needed (without jumping too far)
            const bounds = map.getBounds();
            if (!bounds || !bounds.contains(markerPosition)) {
                map.panTo(markerPosition);
            }

            // Open InfoWindow exactly over the marker position
            infoWindow.setPosition(markerPosition);
            infoWindow.open({
                map: map
            });

            // Enviar a Blazor con el ID del marcador
            sendClickToBlazor(lat, lng, id);
        };

        marker.addListener("click", onMarkerClick);
    } else {
        // Si no hay htmlContent, aún así enviar a Blazor al clic
        const onMarkerClick = () => {
            sendClickToBlazor(lat, lng, id);
        };
        marker.addListener("click", onMarkerClick);
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
        // Cerrar InfoWindow si existe
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
    // Remover marcadores
    markers.forEach((marker, id) => {
        try {
            marker.setMap(null);
            // Cerrar InfoWindow asociada
            if (infoWindows.has(id)) {
                infoWindows.get(id).close();
                infoWindows.delete(id);
            }
        } catch (e) {
            console.error('Error removing marker', e);
        }
    });
    markers.clear();
    console.log('Markers cleared');

    // Remover rutas
    routes.forEach((routeData, id) => {
        try {
            removeRoute(id);
        } catch (e) {
            console.error('Error removing route', e);
        }
    });
    routes.clear();
    console.log('Routes cleared');

    // Cierre exhaustivo de InfoWindows restantes (por si acaso)
    infoWindows.forEach((iw) => iw.close());
    infoWindows.clear();
    console.log('InfoWindows cleared');
    return true;
}

// Normaliza un objeto Posición que pueda venir del Directions result (LatLng object o LatLngLiteral)
function normalizePosition(pos) {
    if (!pos) return null;
    if (typeof pos.lat === "function") {
        return { lat: pos.lat(), lng: pos.lng() };
    }
    return { lat: Number(pos.lat), lng: Number(pos.lng) };
}

function placeRouteMarker(routeId, point, position, isEndpoint, idx, color, localMarkers) {
    const normPos = normalizePosition(position) || toLatLng(point.position);
    const markerLat = normPos.lat;
    const markerLng = normPos.lng;
    const markerId = point.id || `${routeId}-p${idx}`;

    let markerContent;
    if (point.svgIcon && isEndpoint) {
        const img = document.createElement("img");
        img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(point.svgIcon)}`;
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
        div.style.backgroundColor = point.color || color || "green";
        div.style.transform = "translate(-50%, -50%)";
        div.style.position = "absolute";
        div.style.cursor = "pointer";
        div.style.userSelect = "none";
        markerContent = div;
    }

    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: normPos,
        map: map,
        content: markerContent
    });

    marker.id = markerId;  // Asignar ID para remociones
    marker.originalContent = markerContent;
    marker.isFromRoute = true;
    markers.set(markerId, marker);
    localMarkers.push(marker);

    let infoWindow = null;
    if (point.htmlContent) {
        infoWindow = new google.maps.InfoWindow({
            content: point.htmlContent
        });
        infoWindows.set(markerId, infoWindow);  // Trackear
    }

    const attachClickHandler = () => {
        const onClick = () => {
            if (activeMarker && activeMarker !== marker) {
                try { activeMarker.content = activeMarker.originalContent; } catch { }
            }

            const clone = markerContent.cloneNode(true);
            clone.style.transform = "translate(-50%, -50%) scale(1.6)";
            clone.style.position = "absolute";
            marker.content = clone;
            activeMarker = marker;

            setTimeout(() => {
                if (activeMarker === marker) {
                    try { marker.content = marker.originalContent; } catch { }
                    activeMarker = null;
                }
            }, 3000);

            const markerPosition = marker.position || normPos;
            const bounds = map.getBounds();
            if (!bounds || !bounds.contains(markerPosition)) {
                map.panTo(markerPosition);
            }

            if (infoWindow) {
                infoWindow.setPosition(markerPosition);
                infoWindow.open({ map: map });
            }

            sendClickToBlazor(markerLat, markerLng, markerId);
        };

        try {
            markerContent.addEventListener("click", onClick);
        } catch {
            try {
                google.maps.event.addListener(marker, "gmp-click", onClick);
            } catch (ee) {
                console.error("Could not attach click handler to marker content.", ee);
            }
        }
    };

    attachClickHandler();
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

    // Si ya existe una ruta con este ID, la eliminamos antes
    if (routes.has(id)) {
        removeRoute(id);
    }

    const renderer = createDirectionsRenderer(color);

    const origin = toLatLng(startPoint.position);
    const destination = toLatLng(endPoint.position);

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
            renderer.setDirections(result);
            const route = result.routes[0];
            const localMarkers = [];

            // Marcadores de inicio y fin (como en showRouteWithWaypoints)
            const startLeg = route.legs[0];
            const endLeg = route.legs[route.legs.length - 1];

            placeRouteMarker(id, startPoint, startLeg.start_location, true, 0, color, localMarkers);
            placeRouteMarker(id, endPoint, endLeg.end_location, true, 1, color, localMarkers);

            routes.set(id, { renderer: renderer, markers: localMarkers });
        } else {
            console.warn("Directions request failed due to: " + status);
        }
    });

    return true;
}

// Helper para asegurar que siempre devolvemos números desde tu DTO
function toLatLng(latLong) {
    if (!latLong || typeof latLong.latitude === "undefined" || typeof latLong.longitude === "undefined") {
        console.error("Invalid latLong object received:", latLong);
        return { lat: 0, lng: 0 };
    }
    return {
        lat: Number(latLong.latitude),
        lng: Number(latLong.longitude)
    };
};

function showRouteWithWaypoints(id, points, travelMode = "DRIVING", color = "#4285F4") {
    if (!map || !directionsService) {
        console.warn("Map not initialized. Cannot showRouteWithWaypoints.");
        return false;
    }

    // Eliminar ruta previa si existe
    if (routes.has(id)) {
        removeRoute(id);
    }

    const renderer = createDirectionsRenderer(color);
    const localMarkers = [];

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
            renderer.setDirections(result);

            const route = result.routes[0];

            // Colocación de marcadores restaurada para snapping correcto
            // origen
            const startLeg = route.legs[0];
            placeRouteMarker(id, points[0], startLeg.start_location, true, 0, color, localMarkers);

            // intermedios alineados con la ruta (leg.end_location)
            for (let i = 0; i < route.legs.length - 1; i++) {
                const leg = route.legs[i];
                placeRouteMarker(id, points[i + 1], leg.end_location, false, i + 1, color, localMarkers);
            }

            // destino
            const lastLeg = route.legs[route.legs.length - 1];
            placeRouteMarker(id, points[points.length - 1], lastLeg.end_location, true, points.length - 1, color, localMarkers);

            routes.set(id, { renderer: renderer, markers: localMarkers });
        } else {
            console.warn("Directions request failed due to: " + status);
        }
    });

    return true;
}

function highlightMarker(id, color = "#006400") {
    if (!map || !markers.has(id)) {
        console.warn("Map not initialized. Cannot highlightMarker or not found marker ID:", id, markers);
        return false;
    }

    const marker = markers.get(id);

    // Restore previous active marker if exists
    if (activeMarker && activeMarker !== marker) {
        try { activeMarker.content = activeMarker.originalContent; } catch { /* ignore */ }
    }

    if (!marker.originalContent) {
        console.warn("Marker " + id + " has no original content stored.");
        return false;
    }

    // Clone original content
    const clone = marker.originalContent.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.transform = "translate(-50%, -50%) scale(1.6)";

    // Apply highlight color if background-based (circle/div)
    if (clone.style && clone.style.backgroundColor) {
        clone.style.backgroundColor = color;
    }

    // If it’s an <img> (e.g., SVG marker), we can tint via CSS filter
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

function createDirectionsRenderer(color) {
    return new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
            strokeColor: color || "#4285F4", // default Google blue
            strokeOpacity: 0.8,
            strokeWeight: 5
        },
        map: map
    });
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
            routeData.renderer.setMap(null);
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