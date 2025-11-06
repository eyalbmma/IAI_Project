using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using IAI_server.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace IAI_server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeocodingController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<GeocodingController> _logger;

    // Nominatim rate limiting: 1 request / sec
    private static readonly SemaphoreSlim _nominatimSemaphore = new(1, 1);
    private static DateTimeOffset _lastRequest = DateTimeOffset.MinValue;
    private static readonly TimeSpan _minInterval = TimeSpan.FromSeconds(1);

    public GeocodingController(IHttpClientFactory httpFactory, ILogger<GeocodingController> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    [HttpPost("geocode")]
    public async Task<IActionResult> Geocode([FromBody] GeocodeRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Address))
            return BadRequest(new { error = "Address cannot be empty" });

        await _nominatimSemaphore.WaitAsync();
        try
        {
            var since = DateTimeOffset.UtcNow - _lastRequest;
            if (since < _minInterval)
                await Task.Delay(_minInterval - since);

            _lastRequest = DateTimeOffset.UtcNow;

            var client = _httpFactory.CreateClient();
            client.DefaultRequestHeaders.UserAgent.TryParseAdd("IAI_server/1.0");

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(request.Address)}&format=json&limit=1&addressdetails=0&accept-language=he";
            var resp = await client.GetAsync(url);

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("Nominatim returned {Status}", resp.StatusCode);
                return StatusCode(500, new { error = "Failed to geocode address" });
            }

            var json = await resp.Content.ReadAsStringAsync();
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var results = JsonSerializer.Deserialize<List<NominatimResult>>(json, opts);

            if (results == null || results.Count == 0)
                return NotFound(new { error = "Address not found" });

            var r = results[0];

            if (!double.TryParse(r.Lat, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat) ||
                !double.TryParse(r.Lon, NumberStyles.Float, CultureInfo.InvariantCulture, out var lon))
            {
                _logger.LogError("Failed parsing lat/lon from Nominatim: {@Result}", r);
                return StatusCode(500, new { error = "Failed to geocode address" });
            }

            var response = new GeocodeResponse
            {
                Lat = lat,
                Lng = lon,
                FormattedAddress = r.DisplayName
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while geocoding '{Address}'", request.Address);
            return StatusCode(500, new { error = "Failed to geocode address" });
        }
        finally
        {
            _nominatimSemaphore.Release();
        }
    }

    private class NominatimResult
    {
        [JsonPropertyName("lat")]
        public string Lat { get; set; } = string.Empty;

        [JsonPropertyName("lon")]
        public string Lon { get; set; } = string.Empty;

        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; } = string.Empty;
    }
}
