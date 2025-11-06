namespace IAI_server.Contracts;

public class GeocodeResponse
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string? FormattedAddress { get; set; }
}
