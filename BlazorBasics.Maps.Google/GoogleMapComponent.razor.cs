namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    [Parameter] public string ApiKey { get; set; } = string.Empty;
    [Parameter] public string MapId { get; set; } = string.Empty;
    [Parameter] public EventCallback OnMapReady { get; set; }
    [Parameter] public EventCallback<MapClickEventArgs> OnClick { get; set; }

    private string DOMMapId = $"map_{Guid.NewGuid()}";
    private string ScriptId = "BlazorBasicsMapsGoogleScript";
    private IJSObjectReference? GoogleMapsModule;
    private DotNetObjectReference<GoogleMapComponent>? dotNetRef;

    protected override void OnInitialized()
    {
        dotNetRef = DotNetObjectReference.Create(this);
    }

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
            GoogleMapsModule = await JS.InvokeAsync<IJSObjectReference>(
                "import", $"./{ContentHelper.ContentPath}/loadGoogleMaps.js?v={DateTime.Now.Ticks}");

            bool loaded = await GoogleMapsModule.InvokeAsync<bool>("load", ApiKey, ScriptId);
            if (loaded)
            {
                await GoogleMapsModule.InvokeVoidAsync("initMap", DOMMapId, MapId);
                if (OnClick.HasDelegate)
                {
                    await GoogleMapsModule.InvokeVoidAsync("enableMapClick", dotNetRef, "OnMapClick");
                }
                if (OnMapReady.HasDelegate)
                {
                    await OnMapReady.InvokeAsync();
                }
            }
        }
    }

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

    public async Task ShowRoute(PositionPoint startPoint, PositionPoint endPoint, string travelMode = "DRIVING")
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("showRoute",
                startPoint.Latitude, startPoint.Longitude,
                endPoint.Latitude, endPoint.Longitude,
                travelMode);
        }
    }

    public async Task ShowRouteWithWaypoints(IEnumerable<RoutePoint> points, string travelMode = "DRIVING")
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("showRouteWithWaypoints", points, travelMode);
        }
    }

    public async Task HighlightMarker(string id)
    {
        if (GoogleMapsModule is not null)
        {
            await GoogleMapsModule.InvokeVoidAsync("highlightMarker", id);
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

    [JSInvokable]
    public async Task OnMapClick(double? lat, double? lng, string address, AddressDetails? placeDetails, string? markerId)
    {
        PositionPoint? point = CreatePositionPoint(lat, lng);
        MapClickEventArgs place = new MapClickEventArgs(markerId, point, address, placeDetails);
        if (OnClick.HasDelegate)
        {
            await OnClick.InvokeAsync(place);
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
