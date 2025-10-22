# Blazor Google Maps Library Documentation

## Overview

The `BlazorBasics.Maps.Google` library is a Blazor component designed to integrate Google Maps functionality into Blazor applications. It provides a simple and reusable way to display a Google Map, add markers (points), manage routes, and interact with the map programmatically. The library uses JavaScript interop to communicate with the Google Maps JavaScript API and supports common map operations such as adding points, showing routes, and highlighting markers.

This library is ideal for Blazor developers who need to embed interactive maps with custom markers and routes in their web applications. It abstracts the complexity of Google Maps JavaScript API interactions while providing a clean C# interface.

## Prerequisites

To use this library, you need:

- A Google Maps API key with the Maps JavaScript API enabled. Obtain it from the [Google Cloud Console](https://console.cloud.google.com/).
- A Blazor application (Server or WebAssembly).

## Installation

1. **Install the NuGet Package**:
   - Install the `BlazorBasics.Maps.Google` NuGet package in your Blazor project using the Package Manager or the .NET CLI:
     ```bash
     dotnet add package BlazorBasics.Maps.Google
     ```

2. **Add CSS Styling**:
   - Ensure the map container has appropriate styling. For example, add the following CSS to your stylesheet (e.g., `wwwroot/css/site.css`):

     ```css
     .map {
         height: 400px; /* Adjust height as needed */
         width: 100%;
     }
     ```

3. **Include the Component in Your Razor Page**:
   - Add the `GoogleMapComponent` to your Razor page and provide the required parameters (`ApiKey` and `MapId`).

## Usage

### Basic Setup

To display a Google Map, include the `GoogleMapComponent` in your Razor page and provide a valid Google Maps API key and a custom Map ID. Optionally, specify an `OnMapReady` callback to execute code once the map is initialized.

```razor
@using BlazorBasics.Maps.Google

<GoogleMapComponent @ref="mapComponent"
                  ApiKey="TU_CLAVE_DE_API_DE_GOOGLE_MAPS"
                  MapId="TU_ID_DE_MAPA_PERSONALIZADO"
                  OnMapReady="@OnMapReadyCallback"
                  OnClick="@OnMapClickCallback" />

@code {
    private GoogleMapComponent mapComponent = default!;

    private async Task OnMapReadyCallback()
    {
        Console.WriteLine("Map is ready!");
    }
    
    private void OnMapClickCallback(MapClickEventArgs args)
    {
        Console.WriteLine($"Lat: {args.Point?.Latitude}, Lng: {args.Point?.Longitude}");
        Console.WriteLine($"Address: {args.Address}");
    }
}
```

### Component Parameters

| Parameter   | Type                               | Description                                                                   |
|-------------|------------------------------------|-------------------------------------------------------------------------------|
| `ApiKey`    | `string`                           | **Required**. Your Google Maps API key.                                       |
| `MapId`     | `string`                           | **Required**. A custom map ID for styled maps.                                |
| `OnMapReady`| `EventCallback`                    | Optional. A callback invoked when the map is fully loaded and ready to use.   |
| `OnClick`   | `EventCallback<MapClickEventArgs>` | Optional. A callback that is invoked when the map or a marker is clicked.     |
|             |                                    | It returns the coordinates and address details.                               |

### Models

The library includes two main models:

- **`PositionPoint`**:
  - Represents a geographic coordinate with `Latitude` and `Longitude`.
  - Validates coordinates to ensure they are within valid ranges (`Latitude`: -90 to 90, `Longitude`: -180 to 180).
  - Example:
    ```csharp
    var point = new PositionPoint(latitude: 37.7749f, longitude: -122.4194f);
    ```

- **`RoutePoint`**:
  - Represents a marker on the map with additional metadata.
  - Properties:
    - Id: Unique identifier for the point.
    - Position: A `PositionPoint` specifying the location.
    - Description: A description for the marker.
    - SvgIcon: An SVG string for a custom marker icon.
    - HtmlContent: HTML content for the marker's info window.
    - Color: Optional color for the marker. Default `"black"`.
    - ArrowOptions: A `RouteArrowOptions`. Optional settings for displaying arrows on routes. Default `new RouteArrowOptions()`.
  - Example:
    ```csharp
    var routePoint = new RoutePoint(
        id: "point1",
        point: new PositionPoint(37.7749f, -122.4194f),
        description: "San Francisco",
        svgIcon: "<svg>...</svg>",
        htmlContent: "<h3>San Francisco</h3>",
        color: "blue",
        arrowOptions: new RouteArrowOptions()
    );
    ```

- **`ArrowType`**:
  - Enumeral with Google Arrow Types.
  - Values:
    - `CIRCLE`
    - `FORWARD_CLOSED_ARROW`
    - `FORWARD_OPEN_ARROW,`
    - `BACKWARD_CLOSED_ARROW,`
    - `BACKWARD_OPEN_ARROW`

- **`RouteArrowOptions`**:
  - Set parameters to show arrows with flow direction.
  - Properties:
    - Enabled: Show or not the arrows. Default false.
    - ArrowType: Enumeral `ArrowType` with display arrow type. Default `ArrowType.FORWARD_OPEN_ARROW`.
    - Scale: Arrow scale. Default 5.0
    - Color: Arrow color. Default "#1a73e8".
    - Offset: Arrow offset. Default 50.
    - RepeatPixels: Repeat the arrow every X pixels. Default 100.
  
- **`MapClickEventArgs`**:
    - Event arguments for the OnClick callback. Contains information about the point where the click was made.
    - Properties:
      - PointId: The marker ID if one was clicked; otherwise, null.
      - Point: A PositionPoint with the click coordinates.
      - Address: A string containing the address formatted at the point of the click (reverse geocoding).
      - Details: An AddressDetails object with the address components broken down.

- **`AddressDetails`**
    - Contains the broken-down components of an address obtained from reverse geocoding.
    - Properties: 
      - Street Number
      - Route
      - Neighborhood
      - Locality
      - Administrative Area (state/province)
      - Country
      - Postal Code.

### Available Methods

The `GoogleMapComponent` provides the following methods to interact with the map:

1. **`AddPoint(RoutePoint point)`**:
   - Adds a marker to the map at the specified position with custom properties.
   - Example:
     ```csharp
     var point = new RoutePoint("point1", new PositionPoint(37.7749f, -122.4194f), "San Francisco", "<svg>...</svg>", "<h3>San Francisco</h3>");
     await mapComponent.AddPoint(point);
     ```

2. **`RemovePoint(string id)`**:
   - Removes a marker from the map by its ID.
   - Example:
     ```csharp
     await mapComponent.RemovePoint("point1");
     ```

3. **`CenterMap(PositionPoint point)`**:
   - Centers the map on the specified coordinates.
   - Example:
     ```csharp
     var point = new PositionPoint(37.7749f, -122.4194f);
     await mapComponent.CenterMap(point);
     ```

4. **`ClearMap()`**:
   - Removes all markers and routes from the map.
   - Example:
     ```csharp
     await mapComponent.ClearMap();
     ```

5. **`ShowRoute(PositionPoint startPoint, PositionPoint endPoint, string travelMode = "DRIVING", string routeId = "Route", string color = "#1a73e8")`**:
   - Displays a route between two points.
   - Supported `travelMode` values: `"DRIVING"`, `"WALKING"`, `"BICYCLING"`, `"TRANSIT"`.
   - Example:
     ```csharp
     var start = new PositionPoint(37.7749f, -122.4194f);
     var end = new PositionPoint(34.0522f, -118.2437f);
     await mapComponent.ShowRoute(start, end, "DRIVING", "route1", "red");
     ```

6. **`ShowRouteWithWaypoints(IEnumerable<RoutePoint> points, string travelMode = "DRIVING", string routeId = "Route", string color = "#1a73e8")`**:
   - Displays a route with waypoints.
   - Example:
     ```csharp
     var points = new List<RoutePoint>
     {
         new RoutePoint("point1", new PositionPoint(37.7749f, -122.4194f), "San Francisco", "", ""),
         new RoutePoint("point2", new PositionPoint(36.1699f, -115.1398f), "Las Vegas", "", "")
     };
     await mapComponent.ShowRouteWithWaypoints(points, "DRIVING", "route1", "red");
     ```

7. **`HighlightMarker(string id)`**:
   - Highlights a marker by its ID (e.g., changes its appearance).
   - Example:
     ```csharp
     await mapComponent.HighlightMarker("point1");
     ```

8. **`UnhighlightMarker(string id)`**:
   - Removes highlighting from a marker by its ID.
   - Example:
     ```csharp
     await mapComponent.UnhighlightMarker("point1");
     ```

9. **`RemoveRoute(string routeId)`**:
   - Removes route by its ID.
   - Example:
     ```csharp
     await mapComponent.RemoveRoute("route1");
     ```

### Example: Full Implementation

Below is an example of a Razor page that uses the `GoogleMapComponent` to display a map, add a marker, and show a route.

```razor
@page "/map-example"
@using BlazorBasics.Maps.Google
@using BlazorBasics.Maps.Google.Models

<h3>Example Interactive Map</h3>

<GoogleMapComponent @ref="mapComponent"
                  ApiKey="TU_CLAVE_DE_API_DE_GOOGLE_MAPS"
                  MapId="TU_ID_DE_MAPA_PERSONALIZADO"
                  OnMapReady="@OnMapReadyCallback"
                  OnClick="@OnMapClickCallback" />

<p>@clickedAddress</p>

@code {
    private GoogleMapComponent mapComponent = default!;
    private string clickedAddress = "Haz clic en el mapa para ver la dirección aquí.";

    private async Task OnMapReadyCallback()
    {
        // Add marker
        var sanFranciscoPoint = new RoutePoint(
            id: "SF",
            point: new PositionPoint(37.7749f, -122.4194f),
            description: "San Francisco",
            svgIcon: "<svg width='24' height='24'><circle cx='12' cy='12' r='10' fill='blue'/></svg>",
            htmlContent: "<h3>San Francisco</h3>"
        );
        await mapComponent.AddPoint(sanFranciscoPoint);
        await mapComponent.RemovePoint("marker-id");

        // Centrer el map
        await mapComponent.CenterMap(new PositionPoint(37.6f, -120f));

        // Show route
        var start = new PositionPoint(37.7749f, -122.4194f); // San Francisco
        var end = new PositionPoint(34.0522f, -118.2437f);   // Los Angeles
        await mapComponent.ShowRoute(startPoint: start, endPoint: end, travelMode: "DRIVING", routeId: "route-id", color: "red");
        var points = new List<RoutePoint>
        {
            new RoutePoint(id: "SF", point: new PositionPoint(37.7749f, -122.4194f), description: "San Francisco", svgIcon: "", htmlContent: "", color: "red"),
            new RoutePoint(id: "LV", point: new PositionPoint(36.1699f, -115.1398f), description: "Las Vegas", svgIcon: "", htmlContent: "", color: "yellow"),
            new RoutePoint(id: "LA", point: new PositionPoint(34.0522f, -118.2437f), description: "Los Angeles", svgIcon: "", htmlContent: "", color: "green")
        };
        await mapComponent.ShowRouteWithWaypoints(points, travelMode: "DRIVING", routeId: "route-id", color: "green");
        await mapComponent.RemoveRoute("route-id");
        await mapComponent.HighlightMarker("marker-id", color: "black");
        await mapComponent.UnhighlightMarker("marker-id");
        await mapComponent.ClearMap();
    }

    private void OnMapClickCallback(MapClickEventArgs args)
    {
        if (args.PointId is not null)
        {
            clickedAddress = $"Click on marker ID: {args.PointId}.";
        }
        if (args.Address is not null)
        {
            clickedAddress = $"Clic address: {args.Address}";
            // Also from details ...
            // var country = args.Details?.Country;
        }
        else
        {
            clickedAddress = "Can't get the address.";
        }
        StateHasChanged();
    }
}
```

## Notes

- **JavaScript Interop**: The library relies on the `loadGoogleMaps.js` file for Google Maps API interactions. Ensure this file is correctly implemented and includes functions like `load`, `initMap`, `addPoint`, `removePoint`, `centerMap`, `cleanMap`, `showRoute`, `showRouteWithWaypoints`, `highlightMarker`, `unhighlightMarker`, `enableMapClick` and `disableMapClick` .
- **Error Handling**: The component checks for a valid `ApiKey`. If missing, it displays a message: "API Key is required to load Google Maps.".
- **Error Handling**: The component checks for a valid `MapId`. If missing, it displays a message: "MapId is required to identify the map instance.".
- **Coordinate Validation**: The `PositionPoint` struct validates latitude and longitude to prevent invalid coordinates.
- **Custom Styling**: Use the `MapId` parameter to apply custom map styles created in the Google Cloud Console.

## Troubleshooting

- **Map Not Loading**: Verify that the `ApiKey` and `MapId` are valid and the Maps JavaScript API is enabled in the Google Cloud Console.

## Contributing

If you encounter issues or have suggestions for improvements, please submit an issue or pull request to the repository hosting this library.