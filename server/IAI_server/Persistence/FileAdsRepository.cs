using System.Text;
using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using IAI_server.Domain;
using Microsoft.Extensions.Configuration;

namespace IAI_server.Persistence
{
    public class FileAdsRepository : IAdsRepository
    {
        private readonly string _adsPath;
        private readonly IFileLock _fileLock;

        // Keep injected dependencies you already use (IConfiguration, IFileLock, etc.)
        public FileAdsRepository(IFileLock fileLock, IConfiguration configuration)
        {
            _fileLock = fileLock;
            _adsPath = configuration.GetValue<string>("Data:AdsFilePath") ?? "Data/ads.json";
        }

        private static JsonSerializerOptions JsonOptions => new JsonSerializerOptions
        {
            WriteIndented = true,
            // Option 1: emit Hebrew (and other non-ASCII) as-is
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping

            // Or Option 2: allow broad Unicode ranges
            // Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };

        // Example helper to persist an object (replace your current File.WriteAllText(JsonSerializer.Serialize(...)) calls)
        private void SaveToFile<T>(T value)
        {
            var json = JsonSerializer.Serialize(value, JsonOptions);
            // Ensure UTF-8 (no BOM) and write
            File.WriteAllText(_adsPath, json, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        }

        // Example helper to load from file
        private T? LoadFromFile<T>()
        {
            if (!File.Exists(_adsPath))
                return default;

            var json = File.ReadAllText(_adsPath, Encoding.UTF8);
            return JsonSerializer.Deserialize<T>(json, JsonOptions);
        }

        public async Task<List<Ad>> ReadAllAsync()
        {
            await _fileLock.WaitAsync(_adsPath);
            try
            {
                if (!File.Exists(_adsPath))
                    return new List<Ad>();

                var content = await File.ReadAllTextAsync(_adsPath);
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
                _fileLock.Release(_adsPath);
            }
        }

        public async Task WriteAllAsync(IEnumerable<Ad> ads)
        {
            await _fileLock.WaitAsync(_adsPath);
            try
            {
                var dir = Path.GetDirectoryName(_adsPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                var tempPath = _adsPath + ".tmp";
                var json = JsonSerializer.Serialize(ads, JsonOptions);
                await File.WriteAllTextAsync(tempPath, json, new System.Text.UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

                if (File.Exists(_adsPath))
                {
                    var backup = _adsPath + ".bak";
                    File.Replace(tempPath, _adsPath, backup, ignoreMetadataErrors: true);
                    if (File.Exists(backup)) File.Delete(backup);
                }
                else
                {
                    File.Move(tempPath, _adsPath);
                }
            }
            finally
            {
                _fileLock.Release(_adsPath);
            }
        }
    }
}
