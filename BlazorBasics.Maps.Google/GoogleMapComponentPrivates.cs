namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
    private string DOMMapId = $"map_{Guid.NewGuid()}";
    private string ScriptId = "BlazorBasicsMapsGoogleScript";
    private IJSObjectReference? GoogleMapsModule;
    private DotNetObjectReference<GoogleMapComponent>? dotNetRef;
}
