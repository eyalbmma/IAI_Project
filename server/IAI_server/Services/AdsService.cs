using IAI_server.Contracts;
using IAI_server.Domain;
using IAI_server.Domain.ValueObjects;
using IAI_server.Persistence;

namespace IAI_server.Services;

public class AdsService : IAdsService
{
    private readonly IAdsRepository _repo;
    private readonly ILogger<AdsService> _logger;
    private const int MaxPageSize = 100;

    public AdsService(IAdsRepository repo, ILogger<AdsService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<AdDto> CreateAsync(CreateAdRequest request)
    {
        var now = DateTimeOffset.UtcNow;
        var ad = new Ad
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Price = request.Price,
            Category = request.Category,
            Contact = request.Contact is null ? null : new Contact
            {
                Name = request.Contact.Name,
                Email = request.Contact.Email,
                Phone = request.Contact.Phone
            },
            Location = request.Location is null ? null : new Location
            {
                Address = request.Location.Address,
                Lat = request.Location.Lat,
                Lng = request.Location.Lng
            },
            CreatedAt = now,
            UpdatedAt = now
        };

        var list = await _repo.ReadAllAsync();
        list.Add(ad);
        await _repo.WriteAllAsync(list);
        _logger.LogInformation("Created ad {Id}", ad.Id);

        return MapToDto(ad);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var list = await _repo.ReadAllAsync();
        var existing = list.FirstOrDefault(x => x.Id == id);
        if (existing is null) return false;
        list.Remove(existing);
        await _repo.WriteAllAsync(list);
        _logger.LogInformation("Deleted ad {Id}", id);
        return true;
    }

    public async Task<AdDto?> GetByIdAsync(Guid id)
    {
        var list = await _repo.ReadAllAsync();
        var ad = list.FirstOrDefault(x => x.Id == id);
        return ad is null ? null : MapToDto(ad);
    }

    public async Task<PagedResult<AdDto>> GetListAsync(AdsQueryParams query)
    {
        var list = await _repo.ReadAllAsync();
        // initial filtering (text/category/price/hasLocation)
        IEnumerable<Ad> filtered = list;

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var q = query.Q.Trim();
            filtered = filtered.Where(a =>
                (!string.IsNullOrEmpty(a.Title) && a.Title.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(a.Description) && a.Description.Contains(q, StringComparison.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
            filtered = filtered.Where(a => string.Equals(a.Category, query.Category, StringComparison.OrdinalIgnoreCase));

        if (query.MinPrice.HasValue)
            filtered = filtered.Where(a => (a.Price ?? 0) >= query.MinPrice.Value);

        if (query.MaxPrice.HasValue)
            filtered = filtered.Where(a => (a.Price ?? 0) <= query.MaxPrice.Value);

        if (query.HasLocation.HasValue)
        {
            if (query.HasLocation.Value)
                filtered = filtered.Where(a => a.Location?.Lat.HasValue == true && a.Location?.Lng.HasValue == true);
            else
                filtered = filtered.Where(a => a.Location == null || !a.Location.Lat.HasValue || !a.Location.Lng.HasValue);
        }

        // Location-based filtering: if userLat & userLng provided, compute distances and filter by radius
        var useLocationFilter = query.UserLat.HasValue && query.UserLng.HasValue;
        List<Ad> finalList;

        if (useLocationFilter)
        {
            var userLat = query.UserLat!.Value;
            var userLng = query.UserLng!.Value;
            var radiusKm = query.Radius ?? 10.0;

            // only ads that have valid lat & lng
            var withLocation = filtered
                .Where(a => a.Location?.Lat.HasValue == true && a.Location?.Lng.HasValue == true)
                .ToList();

            var projected = withLocation
                .Select(a => new
                {
                    Ad = a,
                    Distance = CalculateDistance(userLat, userLng, a.Location!.Lat!.Value, a.Location.Lng!.Value)
                })
                .Where(x => x.Distance <= radiusKm);

            // order primarily by distance
            var orderedByDistance = projected.OrderBy(x => x.Distance);

            // then apply secondary sort if requested
            var sortBy = (query.SortBy ?? "createdAt").ToLowerInvariant();
            var dir = (query.SortDir ?? "desc").ToLowerInvariant();

            // Use 'var' so the compiler infers the anonymous type, not dynamic
            var ordered = sortBy switch
            {
                "price" => dir == "asc"
                    ? orderedByDistance.ThenBy(x => x.Ad.Price ?? decimal.MinValue)
                    : orderedByDistance.ThenByDescending(x => x.Ad.Price ?? decimal.MinValue),
                "title" => dir == "asc"
                    ? orderedByDistance.ThenBy(x => x.Ad.Title)
                    : orderedByDistance.ThenByDescending(x => x.Ad.Title),
                "updatedat" => dir == "asc"
                    ? orderedByDistance.ThenBy(x => x.Ad.UpdatedAt)
                    : orderedByDistance.ThenByDescending(x => x.Ad.UpdatedAt),
                "createdat" => dir == "asc"
                    ? orderedByDistance.ThenBy(x => x.Ad.CreatedAt)
                    : orderedByDistance.ThenByDescending(x => x.Ad.CreatedAt),
                _ => dir == "asc"
                    ? orderedByDistance.ThenBy(x => x.Ad.CreatedAt)
                    : orderedByDistance.ThenByDescending(x => x.Ad.CreatedAt)
            };

            finalList = ordered.Select(x => x.Ad).ToList();
        }
        else
        {
            // normal sorting when no location filter
            var sortBy = (query.SortBy ?? "createdAt").ToLowerInvariant();
            var dir = (query.SortDir ?? "desc").ToLowerInvariant();
            filtered = (sortBy, dir) switch
            {
                ("title", "asc") => filtered.OrderBy(a => a.Title),
                ("title", "desc") => filtered.OrderByDescending(a => a.Title),
                ("price", "asc") => filtered.OrderBy(a => a.Price ?? decimal.MinValue),
                ("price", "desc") => filtered.OrderByDescending(a => a.Price ?? decimal.MinValue),
                ("updatedat", "asc") => filtered.OrderBy(a => a.UpdatedAt),
                ("updatedat", "desc") => filtered.OrderByDescending(a => a.UpdatedAt),
                ("createdat", "asc") => filtered.OrderBy(a => a.CreatedAt),
                _ => filtered.OrderByDescending(a => a.CreatedAt)
            };

            finalList = filtered.ToList();
        }

        // Pagination (safe)
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var total = finalList.Count;
        var items = finalList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        return new PagedResult<AdDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdDto?> UpdateAsync(Guid id, UpdateAdRequest request)
    {
        var list = await _repo.ReadAllAsync();
        var existing = list.FirstOrDefault(x => x.Id == id);
        if (existing is null) return null;

        if (!string.IsNullOrEmpty(request.Title)) existing.Title = request.Title;
        if (!string.IsNullOrEmpty(request.Description)) existing.Description = request.Description;
        if (request.Price.HasValue) existing.Price = request.Price;
        if (!string.IsNullOrEmpty(request.Category)) existing.Category = request.Category;

        if (request.Contact is not null)
        {
            existing.Contact ??= new Contact();
            existing.Contact.Name = request.Contact.Name ?? existing.Contact.Name;
            existing.Contact.Email = request.Contact.Email;
            existing.Contact.Phone = request.Contact.Phone;
        }

        if (request.Location is not null)
        {
            existing.Location ??= new Location();
            existing.Location.Address = request.Location.Address ?? existing.Location.Address;
            existing.Location.Lat = request.Location.Lat ?? existing.Location.Lat;
            existing.Location.Lng = request.Location.Lng ?? existing.Location.Lng;
        }

        existing.UpdatedAt = DateTimeOffset.UtcNow;
        await _repo.WriteAllAsync(list);
        _logger.LogInformation("Updated ad {Id}", id);
        return MapToDto(existing);
    }

    private static AdDto MapToDto(Ad ad) =>
        new AdDto
        {
            Id = ad.Id,
            Title = ad.Title,
            Description = ad.Description,
            Price = ad.Price,
            Category = ad.Category,
            Contact = ad.Contact,
            Location = ad.Location,
            CreatedAt = ad.CreatedAt,
            UpdatedAt = ad.UpdatedAt
        };

    // Haversine distance - returns kilometers
    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0; // Earth radius in km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var distance = R * c;

        return distance;
    }

    private static double ToRadians(double deg) => deg * (Math.PI / 180.0);
}
