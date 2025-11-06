using IAI_server.Domain.ValueObjects;

namespace IAI_server.Contracts;

public class CreateAdRequest
{
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public Contact? Contact { get; set; }
    public Location? Location { get; set; }
}
