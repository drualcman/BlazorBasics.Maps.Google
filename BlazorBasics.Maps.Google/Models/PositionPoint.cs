namespace BlazorBasics.Maps.Google.Models;
#nullable enable
public readonly struct PositionPoint : IEquatable<PositionPoint>
{
    public float Latitude { get; init; }
    public float Longitude { get; init; }
    public PositionPoint(float latitude, float longitude)
    {
        ValidateCoordinates(latitude, longitude);
        Latitude = latitude;
        Longitude = longitude;
    }

    private static void ValidateCoordinates(float latitude, float longitude)
    {
        if (float.IsNaN(latitude) || float.IsInfinity(latitude))
            throw new ArgumentException("Latitude cannot be NaN or infinity.", nameof(latitude));
        if (float.IsNaN(longitude) || float.IsInfinity(longitude))
            throw new ArgumentException("Longitude cannot be NaN or infinity.", nameof(longitude));
        if (latitude < -90 || latitude > 90)
            throw new ArgumentException("The latitude must be between - 90 and 90 degrees.", nameof(latitude));
        if (longitude < -180 || longitude > 180)
            throw new ArgumentException("The longitude must be between -180 and 180 degrees.", nameof(longitude));
    }

    public bool Equals(PositionPoint other) => Latitude == other.Latitude && Longitude == other.Longitude;
    public override bool Equals(object? obj) => obj is PositionPoint other && Equals(other);
    public override int GetHashCode() => HashCode.Combine(Latitude, Longitude);
    public static bool operator ==(PositionPoint left, PositionPoint right) => left.Equals(right);
    public static bool operator !=(PositionPoint left, PositionPoint right) => !left.Equals(right);
    public override string ToString() => $"Latitude: {Latitude}, Longitude: {Longitude}";
}