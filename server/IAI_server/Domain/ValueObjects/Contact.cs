namespace IAI_server.Domain.ValueObjects;

public class Contact
{
    // Make Name nullable so you can create Contact instances internally
    // Validation rules will still require a name when appropriate.
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
}