using IAI_server.Domain;

namespace IAI_server.Persistence;

public interface IAdsRepository
{
    Task<List<Ad>> ReadAllAsync();
    Task WriteAllAsync(IEnumerable<Ad> ads);
}
