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
                   ApiKey="YOUR_GOOGLE_MAPS_API_KEY"
                   MapId="YOUR_CUSTOM_MAP_ID"
                   OnMapReady="@OnMapReadyCallback" />

@code {
    private GoogleMapComponent mapComponent = default!;

    private async Task OnMapReadyCallback()
    {
        Console.WriteLine("Map is ready!");
    }
}
```

### Component Parameters

| Parameter   | Type            | Description                                                                            |
|-------------|-----------------|----------------------------------------------------------------------------------------|
| `ApiKey`    | `string`        | **Required**. Your Google Maps API key.                                                |
| `MapId`     | `string`        | **Required**. A custom map ID for styled maps.                                         |
| `OnMapReady`| `EventCallback` | Optional. A callback invoked when the map is fully loaded and ready to use.            |
|_____________|_________________|________________________________________________________________________________________|

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
    - `Id`: Unique identifier for the point.
    - `Position`: A `PositionPoint` specifying the location.
    - `Description`: A description for the marker.
    - `SvgIcon`: An SVG string for a custom marker icon.
    - `HtmlContent`: HTML content for the marker's info window.
    - `Color`: Optional color for the marker (default: `"black"`).
  - Example:
    ```csharp
    var routePoint = new RoutePoint(
        id: "point1",
        point: new PositionPoint(37.7749f, -122.4194f),
        description: "San Francisco",
        svgIcon: "<svg>...</svg>",
        htmlContent: "<h3>San Francisco</h3>",
        color: "blue"
    );
    ```

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

5. **`ShowRoute(PositionPoint startPoint, PositionPoint endPoint, string travelMode = "DRIVING")`**:
   - Displays a route between two points.
   - Supported `travelMode` values: `"DRIVING"`, `"WALKING"`, `"BICYCLING"`, `"TRANSIT"`.
   - Example:
     ```csharp
     var start = new PositionPoint(37.7749f, -122.4194f);
     var end = new PositionPoint(34.0522f, -118.2437f);
     await mapComponent.ShowRoute(start, end, "DRIVING");
     ```

6. **`ShowRouteWithWaypoints(IEnumerable<RoutePoint> points, string travelMode = "DRIVING")`**:
   - Displays a route with waypoints.
   - Example:
     ```csharp
     var points = new List<RoutePoint>
     {
         new RoutePoint("point1", new PositionPoint(37.7749f, -122.4194f), "San Francisco", "", ""),
         new RoutePoint("point2", new PositionPoint(36.1699f, -115.1398f), "Las Vegas", "", "")
     };
     await mapComponent.ShowRouteWithWaypoints(points, "DRIVING");
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

### Example: Full Implementation

Below is an example of a Razor page that uses the `GoogleMapComponent` to display a map, add a marker, and show a route.

```razor
@using BlazorBasics.Maps.Google
@using BlazorBasics.Maps.Google.Models

<GoogleMapComponent @ref="mapComponent"
                   ApiKey="YOUR_GOOGLE_MAPS_API_KEY"
                   MapId="YOUR_CUSTOM_MAP_ID"
                   OnMapReady="@OnMapReadyCallback" />

@code {
    private GoogleMapComponent mapComponent = default!;

    private async Task OnMapReadyCallback()
    {
        // Add a marker
        var point = new RoutePoint(
            id: "point1",
            point: new PositionPoint(37.7749f, -122.4194f),
            description: "San Francisco",
            svgIcon: "<svg width='24' height='24'><circle cx='12' cy='12' r='10' fill='red'/></svg>",
            htmlContent: "<h3>San Francisco</h3>"
        );
        await mapComponent.AddPoint(point);

        // Center the map
        await mapComponent.CenterMap(new PositionPoint(37.7749f, -122.4194f));

        // Show a route
        var start = new PositionPoint(37.7749f, -122.4194f);
        var end = new PositionPoint(34.0522f, -118.2437f);
        await mapComponent.ShowRoute(start, end, "DRIVING");
    }
}
```

## Notes

- **JavaScript Interop**: The library relies on the `loadGoogleMaps.js` file for Google Maps API interactions. Ensure this file is correctly implemented and includes functions like `load`, `initMap`, `addPoint`, `removePoint`, `centerMap`, `cleanMap`, `showRoute`, `showRouteWithWaypoints`, `highlightMarker`, and `unhighlightMarker`.
- **Error Handling**: The component checks for a valid `ApiKey`. If missing, it displays a message: "Api Key is missing!".
- **Coordinate Validation**: The `PositionPoint` struct validates latitude and longitude to prevent invalid coordinates.
- **Custom Styling**: Use the `MapId` parameter to apply custom map styles created in the Google Cloud Console.

## Troubleshooting

- **Map Not Loading**: Verify that the `ApiKey` and `MapId` are valid and the Maps JavaScript API is enabled in the Google Cloud Console.

## Contributing

If you encounter issues or have suggestions for improvements, please submit an issue or pull request to the repository hosting this library.