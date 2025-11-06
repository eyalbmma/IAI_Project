# הוראות לבניית שירות Geocoding בצד השרת

## סקירה כללית
צריך לבנות endpoint ב-API שיקבל כתובת טקסטואלית ויחזיר את קואורדינטות ה-latitude ו-longitude של הכתובת.

## פרטי ה-Endpoint

### Route
```
POST /api/geocoding/geocode
```

### Request Body
```json
{
  "address": "string"
}
```

**דוגמה:**
```json
{
  "address": "keren hayesod 25 bat yam"
}
```

### Response (Success - 200 OK)
```json
{
  "lat": 31.7683,
  "lng": 35.2137,
  "formattedAddress": "כרן היסוד 25, בת ים, ישראל" // Optional
}
```

### Response (Error - 400 Bad Request)
```json
{
  "error": "Address cannot be empty"
}
```

### Response (Error - 404 Not Found)
```json
{
  "error": "Address not found"
}
```

### Response (Error - 500 Internal Server Error)
```json
{
  "error": "Failed to geocode address"
}
```

## אפשרויות ליישום

### אפשרות 1: OpenStreetMap Nominatim (מומלץ לפיתוח)
**יתרונות:** חינמי, לא דורש API key, מתאים לפיתוח  
**חסרונות:** יש rate limiting (1 request לשנייה), לא מתאים לייצור בכמויות גדולות

**השימוש:**
```csharp
// Install NuGet package: System.Net.Http.Json

[HttpPost("geocode")]
public async Task<IActionResult> Geocode([FromBody] GeocodeRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Address))
    {
        return BadRequest(new { error = "Address cannot be empty" });
    }

    try
    {
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("User-Agent", "IAI_Server/1.0");
        
        var encodedAddress = Uri.EscapeDataString(request.Address);
        var url = $"https://nominatim.openstreetmap.org/search?q={encodedAddress}&format=json&limit=1";
        
        var response = await httpClient.GetAsync(url);
        
        if (!response.IsSuccessStatusCode)
        {
            return StatusCode(500, new { error = "Failed to geocode address" });
        }

        var content = await response.Content.ReadAsStringAsync();
        var results = JsonSerializer.Deserialize<List<NominatimResult>>(content);
        
        if (results == null || results.Count == 0)
        {
            return NotFound(new { error = "Address not found" });
        }

        var result = results[0];
        return Ok(new GeocodeResponse
        {
            Lat = double.Parse(result.lat),
            Lng = double.Parse(result.lon),
            FormattedAddress = result.display_name
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Failed to geocode address" });
    }
}

// DTOs
public class GeocodeRequest
{
    public string Address { get; set; } = string.Empty;
}

public class GeocodeResponse
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string? FormattedAddress { get; set; }
}

// Nominatim Response Model
public class NominatimResult
{
    public string lat { get; set; } = string.Empty;
    public string lon { get; set; } = string.Empty;
    public string display_name { get; set; } = string.Empty;
}
```

**חשוב:** יש להוסיף delay של 1 שנייה בין קריאות כדי לא לעבור על rate limit.

### אפשרות 2: Google Geocoding API
**יתרונות:** אמין, מדויק, תומך בישראל  
**חסרונות:** דורש API key, יש עלויות לאחר חבילת החינם

**השימוש:**
```csharp
// Install NuGet package: Google.Maps.Geocoding (או להשתמש ב-HttpClient ישירות)

[HttpPost("geocode")]
public async Task<IActionResult> Geocode([FromBody] GeocodeRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Address))
    {
        return BadRequest(new { error = "Address cannot be empty" });
    }

    try
    {
        var apiKey = _configuration["GoogleMaps:ApiKey"]; // להוסיף ל-appsettings.json
        var encodedAddress = Uri.EscapeDataString(request.Address);
        var url = $"https://maps.googleapis.com/maps/api/geocode/json?address={encodedAddress}&key={apiKey}";
        
        using var httpClient = new HttpClient();
        var response = await httpClient.GetAsync(url);
        
        if (!response.IsSuccessStatusCode)
        {
            return StatusCode(500, new { error = "Failed to geocode address" });
        }

        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<GoogleGeocodeResponse>(content);
        
        if (result?.status != "OK" || result.results == null || result.results.Length == 0)
        {
            return NotFound(new { error = "Address not found" });
        }

        var location = result.results[0].geometry.location;
        return Ok(new GeocodeResponse
        {
            Lat = location.lat,
            Lng = location.lng,
            FormattedAddress = result.results[0].formatted_address
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Failed to geocode address" });
    }
}

// Google Response Models
public class GoogleGeocodeResponse
{
    public string status { get; set; } = string.Empty;
    public GoogleResult[]? results { get; set; }
}

public class GoogleResult
{
    public GoogleGeometry geometry { get; set; } = new();
    public string formatted_address { get; set; } = string.Empty;
}

public class GoogleGeometry
{
    public GoogleLocation location { get; set; } = new();
}

public class GoogleLocation
{
    public double lat { get; set; }
    public double lng { get; set; }
}
```

### אפשרות 3: שירות Geocoding מובנה של .NET (אם קיים)
בודקים אם יש NuGet package מתאים או שירות של Microsoft.

## הוראות יישום ב-Visual Studio 2022 עם Copilot

### שלב 1: יצירת Controller
1. פתח את הפרויקט ב-Visual Studio 2022
2. לחץ ימין על תיקיית `Controllers` (או היכן שנמצאים ה-controllers שלך)
3. בחר `Add` > `Controller`
4. בחר `API Controller - Empty`
5. קרא לו `GeocodingController`

### שלב 2: הוספת DTOs
צור קלאסים חדשים:
- `GeocodeRequest.cs`
- `GeocodeResponse.cs`

### שלב 3: יישום ה-Endpoint
העתק את הקוד מהאפשרות שבחרת (מומלץ להתחיל עם Nominatim לפיתוח)

### שלב 4: הוספת CORS (אם צריך)
אם הצד לקוח רץ על פורט אחר, ודא ש-CORS מוגדר:
```csharp
// ב-Program.cs או Startup.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
             .AllowAnyHeader()
             .AllowAnyMethod();
    });
});

// אחרי app.UseRouting()
app.UseCors("AllowAngular");
```

### שלב 5: בדיקה
1. הרץ את השרת
2. פתח Swagger UI
3. נסה את ה-endpoint עם כתובת לדוגמה
4. ודא שהתשובה תואמת את הפורמט המצופה

## הערות חשובות

1. **Rate Limiting:** אם משתמשים ב-Nominatim, יש להוסיף rate limiting בצד השרת (1 request לשנייה)
2. **Error Handling:** חשוב לטפל בכל סוגי השגיאות (network errors, invalid addresses, etc.)
3. **Caching:** מומלץ להוסיף caching של כתובות שכבר נבדקו (למשל עם Redis או Memory Cache)
4. **Security:** אם משתמשים ב-Google API, שמור את ה-API key ב-secrets ולא בקוד

## בדיקות מומלצות

1. כתובת תקינה - "keren hayesod 25 bat yam"
2. כתובת לא קיימת - "xyz123 nonexistent address"
3. כתובת ריקה - ""
4. כתובת null
5. כתובת עם תווים מיוחדים - "רחוב הרצל 15, תל אביב"
6. כתובת באנגלית - "Dizengoff Street 100, Tel Aviv"

## דוגמה לקוד מלא (Nominatim)

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace IAI_Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GeocodingController : ControllerBase
    {
        private readonly ILogger<GeocodingController> _logger;
        private static DateTime _lastRequestTime = DateTime.MinValue;
        private static readonly TimeSpan MinRequestInterval = TimeSpan.FromSeconds(1);

        public GeocodingController(ILogger<GeocodingController> logger)
        {
            _logger = logger;
        }

        [HttpPost("geocode")]
        public async Task<IActionResult> Geocode([FromBody] GeocodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Address))
            {
                return BadRequest(new { error = "Address cannot be empty" });
            }

            // Rate limiting for Nominatim
            var timeSinceLastRequest = DateTime.UtcNow - _lastRequestTime;
            if (timeSinceLastRequest < MinRequestInterval)
            {
                await Task.Delay(MinRequestInterval - timeSinceLastRequest);
            }
            _lastRequestTime = DateTime.UtcNow;

            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "IAI_Server/1.0");
                
                var encodedAddress = Uri.EscapeDataString(request.Address);
                var url = $"https://nominatim.openstreetmap.org/search?q={encodedAddress}&format=json&limit=1";
                
                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Nominatim API returned status {StatusCode}", response.StatusCode);
                    return StatusCode(500, new { error = "Failed to geocode address" });
                }

                var content = await response.Content.ReadAsStringAsync();
                var results = JsonSerializer.Deserialize<List<NominatimResult>>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (results == null || results.Count == 0)
                {
                    return NotFound(new { error = "Address not found" });
                }

                var result = results[0];
                return Ok(new GeocodeResponse
                {
                    Lat = double.Parse(result.Lat),
                    Lng = double.Parse(result.Lon),
                    FormattedAddress = result.DisplayName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error geocoding address: {Address}", request.Address);
                return StatusCode(500, new { error = "Failed to geocode address" });
            }
        }
    }

    public class GeocodeRequest
    {
        public string Address { get; set; } = string.Empty;
    }

    public class GeocodeResponse
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string? FormattedAddress { get; set; }
    }

    public class NominatimResult
    {
        [JsonPropertyName("lat")]
        public string Lat { get; set; } = string.Empty;
        
        [JsonPropertyName("lon")]
        public string Lon { get; set; } = string.Empty;
        
        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; } = string.Empty;
    }
}
```

## אחרי היישום

לאחר שבנית את ה-endpoint בשרת:
1. ודא שהוא עובד ב-Swagger
2. הפעל את האפליקציה Angular
3. נסה להזין כתובת בטופס - הקואורדינטות אמורות להתמלא אוטומטית

