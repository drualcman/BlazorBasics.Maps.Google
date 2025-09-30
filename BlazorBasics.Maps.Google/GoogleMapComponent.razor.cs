namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    [Parameter] public string ApiKey { get; set; } = string.Empty;
    [Parameter] public string MapId { get; set; } = string.Empty;
    [Parameter] public EventCallback OnMapReady { get; set; }

    private string DOMMapId = $"map_{Guid.NewGuid()}";
    private string ScriptId = "BlazorBasicsMapsGoogleScript";
    private IJSObjectReference? _googleMapsModule;

    protected override void OnParametersSet()
    {
        if (string.IsNullOrWhiteSpace(ApiKey))
            throw new ArgumentException("API Key is required to load Google Maps.", nameof(ApiKey));
        if (string.IsNullOrWhiteSpace(MapId))
            throw new ArgumentException("MapId is required to identify the map instance.", nameof(MapId));
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender && !string.IsNullOrWhiteSpace(ApiKey))
        {
            // Import the JS module from your assembly
            _googleMapsModule = await JS.InvokeAsync<IJSObjectReference>(
                "import", $"./{ContentHelper.ContentPath}/loadGoogleMaps.js");

            bool loaded = await _googleMapsModule.InvokeAsync<bool>("load", ApiKey, ScriptId);
            if (loaded)
            {
                await _googleMapsModule.InvokeVoidAsync("initMap", DOMMapId, MapId);

                if (OnMapReady.HasDelegate)
                {
                    await OnMapReady.InvokeAsync();
                }
            }
        }
    }

    public async Task AddPoint(RoutePoint point)
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("addPoint",
                point.Id, point.Position.Latitude, point.Position.Longitude,
                point.Description, point.SvgIcon, point.HtmlContent);
        }
    }

    public async Task RemovePoint(string id)
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("removePoint", id);
        }
    }

    public async Task CenterMap(PositionPoint point)
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("centerMap", point.Latitude, point.Longitude);
        }
    }

    public async Task ClearMap()
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("cleanMap");
        }
    }

    public async Task ShowRoute(PositionPoint startPoint, PositionPoint endPoint, string travelMode = "DRIVING")
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("showRoute",
                startPoint.Latitude, startPoint.Longitude,
                endPoint.Latitude, endPoint.Longitude,
                travelMode);
        }
    }

    public async Task ShowRouteWithWaypoints(IEnumerable<RoutePoint> points, string travelMode = "DRIVING")
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("showRouteWithWaypoints", points, travelMode);
        }
    }

    public async Task HighlightMarker(string id)
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("highlightMarker", id);
        }
    }

    public async Task UnhighlightMarker(string id)
    {
        if (_googleMapsModule is not null)
        {
            await _googleMapsModule.InvokeVoidAsync("unhighlightMarker", id);
        }
    }
}
