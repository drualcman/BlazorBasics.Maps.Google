namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    public async Task AddPoint(RoutePoint point)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("addPoint",
                point.Id, point.Position.Latitude, point.Position.Longitude,
                point.Description, point.SvgIcon, point.HtmlContent);
        }
    }

    public async Task RemovePoint(string id)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("removePoint", id);
        }
    }

    public async Task CenterMap(PositionPoint point)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("centerMap", point.Latitude, point.Longitude);
        }
    }

    public async Task ClearMap()
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("cleanMap");
        }
    }

    public async Task ShowRoute(RoutePoint startPoint, RoutePoint endPoint, string travelMode = "DRIVING", string routeId = "Route", string color = "#1a73e8")
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("showRoute",
                routeId,
                startPoint, endPoint,
                travelMode, color);
        }
    }

    public async Task ShowRouteWithWaypoints(IEnumerable<RoutePoint> points, string travelMode = "DRIVING", string routeId = "Route", string color = "#1a73e8")
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("showRouteWithWaypoints", routeId, points, travelMode, color);
        }
    }

    public async Task RemoveRoute(string routeId)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("removeRoute", routeId);
        }
    }


    public async Task HighlightMarker(string id, string color = "#006400")
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("highlightMarker", id, color);
        }
    }

    public async Task UnhighlightMarker(string id)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("unhighlightMarker", id);
        }
    }

    private PositionPoint? CreatePositionPoint(double? lat, double? lng)
    {
        if (lat is null || lng is null)
        {
            return null;
        }

        try
        {
            return new PositionPoint((float)lat, (float)lng);
        }
        catch
        {
            return null;
        }
    }

    public async Task EnablePopupCloseOnClickOutside()
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("enablePopupCloseOnClickOutside");
        }
    }

    public async Task DisablePopupCloseOnClickOutside()
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("disablePopupCloseOnClickOutside");
        }
    }

    public async Task CloseAllPopups()
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("closeAllPopups");
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (GoogleMapsModule is not null)
        {
            if (dotNetRef is not null)
            {
                dotNetRef.Dispose();
                await GoogleMapsModule.InvokeVoidAsync("disableMapClick");
            }
            await GoogleMapsModule.DisposeAsync();
        }
    }
}
