using System.Text.Json;
using IAI_server.Domain;
using Microsoft.Extensions.Configuration;

namespace IAI_server.Persistence;

public class FileAdsRepository : IAdsRepository
{
    private readonly string _path;
    private readonly IFileLock _fileLock;
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public FileAdsRepository(IFileLock fileLock, IConfiguration configuration)
    {
        _fileLock = fileLock;
        _path = configuration.GetValue<string>("Data:AdsFilePath") ?? "Data/ads.json";
    }

    public async Task<List<Ad>> ReadAllAsync()
    {
        await _fileLock.WaitAsync(_path);
        try
        {
            if (!File.Exists(_path))
                return new List<Ad>();

            var content = await File.ReadAllTextAsync(_path);
            if (string.IsNullOrWhiteSpace(content)) return new List<Ad>();
            try
            {
                var items = JsonSerializer.Deserialize<List<Ad>>(content);
                return items ?? new List<Ad>();
            }
            catch
            {
                // If file is corrupted, return empty list; service layer handles business logic
                return new List<Ad>();
            }
        }
        finally
        {
            _fileLock.Release(_path);
        }
    }

    public async Task WriteAllAsync(IEnumerable<Ad> ads)
    {
        await _fileLock.WaitAsync(_path);
        try
        {
            var dir = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            var tempPath = _path + ".tmp";
            var json = JsonSerializer.Serialize(ads, _jsonOptions);
            await File.WriteAllTextAsync(tempPath, json);

            if (File.Exists(_path))
            {
                var backup = _path + ".bak";
                File.Replace(tempPath, _path, backup, ignoreMetadataErrors: true);
                if (File.Exists(backup)) File.Delete(backup);
            }
            else
            {
                File.Move(tempPath, _path);
            }
        }
        finally
        {
            _fileLock.Release(_path);
        }
    }
}
