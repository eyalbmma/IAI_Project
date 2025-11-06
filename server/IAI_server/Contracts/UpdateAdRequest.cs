using IAI_server.Domain.ValueObjects;

namespace IAI_server.Contracts;

public class UpdateAdRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public Contact? Contact { get; set; }
    public Location? Location { get; set; }
}
