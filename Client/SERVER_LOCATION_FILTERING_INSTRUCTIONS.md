# הוראות ליישום פילטר מיקום נוכחי בשרת (Location-Based Filtering)

## סקירה כללית

הצד לקוח (Angular) שולח בקשות עם פרמטרים של מיקום המשתמש הנוכחי כדי לסנן מודעות לפי קרבתן הגיאוגרפית. השרת צריך לטפל בפרמטרים אלה ולסנן את המודעות בהתאם.

## פרמטרים חדשים ב-API

כאשר המשתמש מסמן את "Near Me" בדף, הצד לקוח שולח את הפרמטרים הבאים ל-`GET /api/Ads`:

### Query Parameters חדשים:

```
?userLat=32.0047771     // קו רוחב של המשתמש (חובה אם יש פילטר מיקום)
&userLng=34.7513617     // קו אורך של המשתמש (חובה אם יש פילטר מיקום)
&radius=10              // רדיוס בקילומטרים (אופציונלי, ברירת מחדל: 10)
```

### דוגמה לבקשה מלאה:

```
GET /api/Ads?userLat=32.0047771&userLng=34.7513617&radius=10&page=1&pageSize=10
```

## לוגיקה נדרשת בשרת

### שלב 1: זיהוי פרמטרי מיקום

השרת צריך לבדוק אם הפרמטרים `userLat` ו-`userLng` קיימים בבקשה:
- **אם קיימים**: יש לסנן מודעות לפי מיקום
- **אם לא קיימים**: להחזיר את כל המודעות (כמו קודם)

### שלב 2: חישוב מרחק בין נקודות גיאוגרפיות

יש להשתמש בנוסחת Haversine לחישוב המרחק בין שתי נקודות על כדור הארץ:

```csharp
// נוסחת Haversine - מחזירה מרחק בקילומטרים
public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
{
    const double R = 6371; // רדיוס כדור הארץ בקילומטרים
    var dLat = ToRadians(lat2 - lat1);
    var dLon = ToRadians(lon2 - lon1);
    
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    
    var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    var distance = R * c;
    
    return distance;
}

private static double ToRadians(double degrees)
{
    return degrees * (Math.PI / 180);
}
```

### שלב 3: סינון מודעות

1. **רק מודעות עם מיקום**: לסנן רק מודעות שיש להן `location.lat` ו-`location.lng`
2. **חישוב מרחק**: לחשב את המרחק בין מיקום המשתמש למיקום כל מודעה
3. **סינון לפי רדיוס**: להחזיר רק מודעות שהמרחק שלהן קטן או שווה ל-`radius`

### שלב 4: מיון (אופציונלי אך מומלץ)

כאשר יש פילטר מיקום, מומלץ למיין את המודעות לפי:
1. **מרחק** (מהקרוב ביותר לרחוק ביותר) - מומלץ
2. **ואז** לפי `sortBy` שהמשתמש בחר (date, price, title)

## מבנה הקוד הנדרש

### 1. עדכון DTO/Model של Query Parameters

```csharp
public class AdsQueryParams
{
    public string? Q { get; set; }
    public string? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? HasLocation { get; set; }
    
    // פרמטרים חדשים למיקום נוכחי
    public double? UserLat { get; set; }   // קו רוחב של המשתמש
    public double? UserLng { get; set; }   // קו אורך של המשתמש
    public double? Radius { get; set; }   // רדיוס בקילומטרים (ברירת מחדל: 10)
    
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; }
    public string? SortDir { get; set; } // "asc" או "desc"
}
```

### 2. עדכון Controller - GET /api/Ads

```csharp
[HttpGet]
public async Task<ActionResult<AdsResponse>> GetAds([FromQuery] AdsQueryParams queryParams)
{
    // קבלת כל המודעות מהמסד נתונים
    var query = _dbContext.Ads.AsQueryable();
    
    // סינון רגיל (קיים)
    if (!string.IsNullOrWhiteSpace(queryParams.Q))
    {
        query = query.Where(a => 
            a.Title.Contains(queryParams.Q) || 
            a.Description.Contains(queryParams.Q));
    }
    
    if (!string.IsNullOrWhiteSpace(queryParams.Category))
    {
        query = query.Where(a => a.Category == queryParams.Category);
    }
    
    if (queryParams.MinPrice.HasValue)
    {
        query = query.Where(a => a.Price >= queryParams.MinPrice.Value);
    }
    
    if (queryParams.MaxPrice.HasValue)
    {
        query = query.Where(a => a.Price <= queryParams.MaxPrice.Value);
    }
    
    if (queryParams.HasLocation == true)
    {
        query = query.Where(a => a.Location != null && 
                                 a.Location.Lat.HasValue && 
                                 a.Location.Lng.HasValue);
    }
    
    // ===== סינון מיקום נוכחי - לוגיקה חדשה =====
    List<Ad> adsList = new List<Ad>();
    
    if (queryParams.UserLat.HasValue && queryParams.UserLng.HasValue)
    {
        // יש פילטר מיקום - צריך לסנן לפי מרחק
        var userLat = queryParams.UserLat.Value;
        var userLng = queryParams.UserLng.Value;
        var radius = queryParams.Radius ?? 10; // ברירת מחדל: 10 ק"מ
        
        // לשלוף את כל המודעות עם מיקום
        adsList = await query
            .Where(a => a.Location != null && 
                       a.Location.Lat.HasValue && 
                       a.Location.Lng.HasValue)
            .ToListAsync();
        
        // לחשב מרחק ולסנן
        var filteredAds = adsList
            .Select(ad => new
            {
                Ad = ad,
                Distance = CalculateDistance(
                    userLat, 
                    userLng, 
                    ad.Location!.Lat!.Value, 
                    ad.Location.Lng!.Value
                )
            })
            .Where(x => x.Distance <= radius)
            .OrderBy(x => x.Distance) // מיין לפי מרחק (קרוב לרחוק)
            .ThenBy(x => x.Ad.CreatedAt) // ואז לפי תאריך
            .Select(x => x.Ad)
            .ToList();
        
        adsList = filteredAds;
    }
    else
    {
        // אין פילטר מיקום - לשלוף כרגיל
        adsList = await query.ToListAsync();
    }
    
    // ===== מיון (אם לא מיין לפי מרחק) =====
    if (!(queryParams.UserLat.HasValue && queryParams.UserLng.HasValue))
    {
        // מיון רגיל רק אם אין פילטר מיקום
        var sortDir = queryParams.SortDir?.ToLower() == "asc" 
            ? System.ComponentModel.ListSortDirection.Ascending 
            : System.ComponentModel.ListSortDirection.Descending;
        
        adsList = queryParams.SortBy?.ToLower() switch
        {
            "price" => sortDir == System.ComponentModel.ListSortDirection.Ascending
                ? adsList.OrderBy(a => a.Price ?? 0).ToList()
                : adsList.OrderByDescending(a => a.Price ?? 0).ToList(),
            "title" => sortDir == System.ComponentModel.ListSortDirection.Ascending
                ? adsList.OrderBy(a => a.Title).ToList()
                : adsList.OrderByDescending(a => a.Title).ToList(),
            _ => sortDir == System.ComponentModel.ListSortDirection.Ascending
                ? adsList.OrderBy(a => a.CreatedAt).ToList()
                : adsList.OrderByDescending(a => a.CreatedAt).ToList()
        };
    }
    
    // ===== Pagination =====
    var total = adsList.Count;
    var totalPages = (int)Math.Ceiling(total / (double)queryParams.PageSize);
    var pagedAds = adsList
        .Skip((queryParams.Page - 1) * queryParams.PageSize)
        .Take(queryParams.PageSize)
        .ToList();
    
    return Ok(new AdsResponse
    {
        Items = pagedAds,
        Total = total,
        Page = queryParams.Page,
        PageSize = queryParams.PageSize,
        TotalPages = totalPages
    });
}

// פונקציית עזר לחישוב מרחק
private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
{
    const double R = 6371; // רדיוס כדור הארץ בקילומטרים
    var dLat = ToRadians(lat2 - lat1);
    var dLon = ToRadians(lon2 - lon1);
    
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    
    var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    var distance = R * c;
    
    return distance;
}

private static double ToRadians(double degrees)
{
    return degrees * (Math.PI / 180);
}
```

## תרחישים לבדיקה

### תרחיש 1: בקשה עם מיקום נוכחי
```
GET /api/Ads?userLat=32.0047771&userLng=34.7513617&radius=5
```
**צפוי**: מודעות במרחק של עד 5 ק"מ, ממוינות לפי מרחק (קרוב לרחוק)

### תרחיש 2: בקשה עם מיקום נוכחי + רדיוס גדול
```
GET /api/Ads?userLat=32.0047771&userLng=34.7513617&radius=50
```
**צפוי**: מודעות במרחק של עד 50 ק"מ

### תרחיש 3: בקשה בלי מיקום נוכחי
```
GET /api/Ads?page=1&pageSize=10
```
**צפוי**: כל המודעות (ללא סינון מיקום), ממוינות לפי `sortBy`

### תרחיש 4: בקשה עם מיקום + פילטרים אחרים
```
GET /api/Ads?userLat=32.0047771&userLng=34.7513617&radius=10&category=מכוניות&minPrice=100
```
**צפוי**: מודעות במרחק של עד 10 ק"מ, בקטגוריה "מכוניות", במחיר מינימלי של 100

## נקודות חשובות

1. **רק מודעות עם מיקום**: כאשר יש פילטר מיקום, להחזיר רק מודעות שיש להן `location.lat` ו-`location.lng`

2. **ברירת מחדל ל-radius**: אם לא נשלח `radius`, להשתמש ב-10 ק"מ

3. **מיון**: כאשר יש פילטר מיקום, למיין לפי מרחק תחילה (הקרוב ביותר ראשון)

4. **Pagination**: Pagination צריך להיעשות **אחרי** הסינון לפי מרחק

5. **Validation**: לוודא ש-`userLat` ו-`userLng` בטווח תקין:
   - `userLat`: בין -90 ל-90
   - `userLng`: בין -180 ל-180
   - `radius`: חיובי (לפחות 1)

## דוגמה לבדיקת Validation

```csharp
if (queryParams.UserLat.HasValue && queryParams.UserLng.HasValue)
{
    if (queryParams.UserLat.Value < -90 || queryParams.UserLat.Value > 90)
    {
        return BadRequest(new { error = "Invalid latitude. Must be between -90 and 90." });
    }
    
    if (queryParams.UserLng.Value < -180 || queryParams.UserLng.Value > 180)
    {
        return BadRequest(new { error = "Invalid longitude. Must be between -180 and 180." });
    }
    
    if (queryParams.Radius.HasValue && queryParams.Radius.Value <= 0)
    {
        return BadRequest(new { error = "Radius must be greater than 0." });
    }
}
```

## סיכום

השרת צריך:
1. ✅ לזהות אם יש פרמטרי `userLat` ו-`userLng`
2. ✅ לסנן מודעות שיש להן מיקום
3. ✅ לחשב מרחק בין מיקום המשתמש למיקום כל מודעה
4. ✅ להחזיר רק מודעות בטווח הרדיוס
5. ✅ למיין לפי מרחק (קרוב לרחוק)
6. ✅ לבצע pagination על התוצאות המסוננות

