namespace BlazorBasics.Maps.Google.Models;
public class MapClickEventArgs(string? pointId, PositionPoint? point, string? address, AddressDetails? details)
{
    public string? PointId => pointId;
    public PositionPoint? Point => point;
    public string? Address => address;
    public AddressDetails? Details => details;
}
