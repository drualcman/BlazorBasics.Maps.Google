namespace BlazorBasics.Maps.Google;

public partial class GoogleMapComponent
{
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
}
