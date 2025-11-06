namespace IAI_server.Contracts;

public class AdsQueryParams
{
    // query string parameters mapped from request
    public string? Q { get; set; }
    public string? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? HasLocation { get; set; }

    // Location-based filtering (optional)
    // Model binding will pick up query params named userLat, userLng, radius
    public double? UserLat { get; set; }
    public double? UserLng { get; set; }
    public double? Radius { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "createdAt";
    public string SortDir { get; set; } = "desc";
}
