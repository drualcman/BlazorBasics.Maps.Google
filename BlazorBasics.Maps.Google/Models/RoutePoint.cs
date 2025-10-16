namespace BlazorBasics.Maps.Google.Models;
public class RoutePoint(string id, PositionPoint point, string description, string svgIcon, string htmlContent, string routeColour = "", string pointColour = "",
        RouteArrowOptions? arrowOptions = null)
{
    public string Id => id;
    public PositionPoint Position => point;
    public string Description => description;
    public string SvgIcon => svgIcon;
    public string HtmlContent => htmlContent;
    public string RouteColour => routeColour;
    public string PointColour => pointColour;
    public RouteArrowOptions ArrowOptions => arrowOptions ?? new RouteArrowOptions();
}
