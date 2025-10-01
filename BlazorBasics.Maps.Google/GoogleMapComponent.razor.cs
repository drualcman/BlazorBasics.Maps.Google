namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    [Parameter] public string ApiKey { get; set; } = string.Empty;
    [Parameter] public string MapId { get; set; } = string.Empty;
    [Parameter] public EventCallback OnMapReady { get; set; }

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
                "import", $"./{ContentHelper.ContentPath}/loadGoogleMaps.js");

            bool loaded = await GoogleMapsModule.InvokeAsync<bool>("load", ApiKey, ScriptId);
            if (loaded)
            {
                await GoogleMapsModule.InvokeVoidAsync("initMap", DOMMapId, MapId);
                await GoogleMapsModule.InvokeVoidAsync("enableMapClick", dotNetRef, "OnMapClick");

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

    [JSInvokable]
    public void OnMapClick(double lat, double lng, string address, AddressDetails? placeDetails)
    {
        // Aquí manejas el evento: lat/lng, dirección, y detalles adicionales
        Console.WriteLine($"Clic en: {lat}, {lng} - Dirección: {address}");

        if (placeDetails != null)
        {
            // Ahora puedes acceder tipado, con IntelliSense y sin casting
            Console.WriteLine($"Calle: {placeDetails.Route} {placeDetails.StreetNumber}");
            Console.WriteLine($"Barrio: {placeDetails.Neighborhood}");
            Console.WriteLine($"Ciudad: {placeDetails.Locality}");
            Console.WriteLine($"País: {placeDetails.Country}");
            // ... y más lógica, como guardar en una lista o actualizar UI
        }
        else
        {
            Console.WriteLine("No se pudieron obtener detalles de la dirección.");
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
