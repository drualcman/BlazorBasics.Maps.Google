namespace BlazorBasics.Maps.Google.Models;
public class RoutePoint(string id, PositionPoint point, string description, string svgIcon, string htmlContent, string color = "black")
{
    public string Id => id;
    public PositionPoint Position => point;
    public string Description => description;
    public string SvgIcon => svgIcon;
    public string HtmlContent => htmlContent;
    public string Color => color;
}
