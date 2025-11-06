using IAI_server.Contracts;

namespace IAI_server.Services;

public interface IAdsService
{
    Task<PagedResult<AdDto>> GetListAsync(AdsQueryParams query);
    Task<AdDto?> GetByIdAsync(Guid id);
    Task<AdDto> CreateAsync(CreateAdRequest request);
    Task<AdDto?> UpdateAsync(Guid id, UpdateAdRequest request);
    Task<bool> DeleteAsync(Guid id);
}
