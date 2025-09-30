namespace BlazorBasics.InputFileExtended.Helpers;
internal static class ContentHelper
{
    public static string ContentPath => $"_content/{typeof(ContentHelper).Assembly.GetName().Name}";
}
