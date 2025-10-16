namespace BlazorBasics.Maps.Google.Models;
public struct RouteArrowOptions
{
    public bool Enabled { get; set; }
    public ArrowType ArrowType { get; set; } // e.g. "FORWARD_CLOSED_ARROW", "FORWARD_OPEN_ARROW"
    public double Scale { get; set; }
    public string Color { get; set; }
    public int Offset { get; set; } // e.g. "50"
    public int RepeatPixels { get; set; } // e.g. "100"

    public RouteArrowOptions(
        bool enabled = false,
        ArrowType arrowType = ArrowType.FORWARD_OPEN_ARROW,
        double scale = 5.0,
        string color = "#1a73e8",
        int offset = 50,
        int repeatPixels = 100)
    {
        Enabled = enabled;
        ArrowType = arrowType;
        Scale = scale;
        Color = color;
        Offset = offset;
        RepeatPixels = repeatPixels;
    }
}
