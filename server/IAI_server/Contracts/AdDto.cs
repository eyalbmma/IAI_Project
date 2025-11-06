using IAI_server.Domain.ValueObjects;

namespace IAI_server.Contracts;

public class AdDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public string Description { get; init; } = default!;
    public decimal? Price { get; init; }
    public string? Category { get; init; }
    public Contact? Contact { get; init; }
    public Location? Location { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
