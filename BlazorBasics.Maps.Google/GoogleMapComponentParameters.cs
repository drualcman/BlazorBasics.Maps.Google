namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    [Parameter] public string ApiKey { get; set; } = string.Empty;
    [Parameter] public string MapId { get; set; } = string.Empty;
    [Parameter] public bool ClosePopupWhenClickOnMap { get; set; } = true;
    [Parameter] public bool ClosePopupWhenClickOther { get; set; }
    [Parameter] public EventCallback OnMapReady { get; set; }
    [Parameter] public EventCallback<MapClickEventArgs> OnClick { get; set; }
}
