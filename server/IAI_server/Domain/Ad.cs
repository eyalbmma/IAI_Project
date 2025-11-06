using IAI_server.Domain.ValueObjects;

namespace IAI_server.Domain;

public class Ad
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public Contact? Contact { get; set; }
    public Location? Location { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
