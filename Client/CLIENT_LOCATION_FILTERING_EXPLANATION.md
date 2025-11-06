# הסבר על פילטר מיקום נוכחי - צד לקוח (Angular)

## סקירה כללית

הצד לקוח (Angular) מאפשר למשתמש לסנן מודעות לפי המיקום הנוכחי שלו. המשתמש יכול לסמן "Near Me" והמערכת תבקש את מיקומו ותסנן מודעות רק באיזור הקרוב.

## איך זה עובד - זרימת הנתונים

### 1. הממשק המשתמש (UI)

בדף רשימת המודעות (`/ads`), המשתמש רואה:
- **Checkbox "Near Me"** - מאפשר למשתמש לסנן לפי מיקום נוכחי
- **שדה רדיוס** - מופיע רק כשהפילטר פעיל, ברירת מחדל: 10 ק"מ

### 2. מה קורה כשמשתמש מסמן "Near Me"

#### שלב א': בקשה למיקום
```typescript
// הקוד משתמש ב-Geolocation API של הדפדפן
navigator.geolocation.getCurrentPosition(
  (position) => {
    // הצלחה - קיבלנו מיקום
    this.currentLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    // טוען מודעות עם פילטר מיקום
    this.loadAds();
  },
  (error) => {
    // שגיאה - הצגת הודעת שגיאה למשתמש
    this.locationError = 'Location access denied...';
  }
);
```

**מה קורה:**
- הדפדפן מבקש הרשאה מהמשתמש לגשת למיקום
- אם המשתמש מאשר → מקבלים `latitude` ו-`longitude`
- אם המשתמש מסרב → מציגים הודעת שגיאה

#### שלב ב': שליחת בקשה לשרת
```typescript
// הפרמטרים שנשלחים לשרת:
const params: AdsQueryParams = {
  userLat: 32.0047771,    // קו רוחב של המשתמש
  userLng: 34.7513617,    // קו אורך של המשתמש
  radius: 10,             // רדיוס בקילומטרים
  page: 1,
  pageSize: 10,
  // ... פילטרים נוספים אם יש
};
```

**הבקשה לשרת:**
```
GET /api/Ads?userLat=32.0047771&userLng=34.7513617&radius=10&page=1&pageSize=10
```

### 3. מה קורה כשמשתמש משנה את הרדיוס

```typescript
// הקוד מאזין לשינויים בשדה הרדיוס
this.searchForm.get('locationRadius')?.valueChanges.pipe(
  debounceTime(500),  // מחכה 500ms שהמשתמש יסיים להקליד
  distinctUntilChanged()  // רק אם הערך באמת השתנה
).subscribe(() => {
  // טוען מחדש את המודעות עם הרדיוס החדש
  this.loadAds();
});
```

**מה קורה:**
- המשתמש משנה את הרדיוס (למשל מ-10 ל-20 ק"מ)
- הקוד מחכה 500ms (debounce) שהמשתמש יסיים להקליד
- שולח בקשה חדשה לשרת עם הרדיוס החדש

### 4. מה קורה כשמשתמש מבטל את הפילטר

```typescript
// כשמבטלים את ה-checkbox
if (!useLocation) {
  this.currentLocation = null;  // איפוס המיקום
  this.locationError = null;    // איפוס שגיאות
  this.loadAds();  // טוען מודעות ללא פילטר מיקום
}
```

**הבקשה לשרת:**
```
GET /api/Ads?page=1&pageSize=10
```
(ללא פרמטרי userLat/userLng)

## מבנה הנתונים

### AdsQueryParams - הפרמטרים שנשלחים לשרת

```typescript
export interface AdsQueryParams {
  // פילטרים רגילים
  q?: string;              // חיפוש טקסטואלי
  category?: string;       // קטגוריה
  minPrice?: number;       // מחיר מינימלי
  maxPrice?: number;       // מחיר מקסימלי
  hasLocation?: boolean;   // רק מודעות עם מיקום
  
  // פילטר מיקום נוכחי (חדש)
  userLat?: number;        // קו רוחב של המשתמש
  userLng?: number;        // קו אורך של המשתמש
  radius?: number;         // רדיוס בקילומטרים
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // מיון
  sortBy?: string;         // 'createdAt', 'price', 'title'
  sortDir?: 'asc' | 'desc';
}
```

### מתי נשלחים הפרמטרים?

**פילטר מיקום נשלח רק אם:**
1. ✅ המשתמש סמן את "Near Me" (`useCurrentLocation = true`)
2. ✅ הצלחנו לקבל את מיקום המשתמש (`currentLocation != null`)
3. ✅ אין שגיאות בקבלת המיקום

**אם אחד מהתנאים לא מתקיים:**
- הפרמטרים `userLat`, `userLng`, `radius` **לא נשלחים** לשרת
- השרת מחזיר את כל המודעות (ללא סינון מיקום)

## לוגיקה של הקוד

### 1. אתחול הקומפוננטה

```typescript
ngOnInit(): void {
  this.initializeForm();      // יצירת הטופס
  this.setupSearch();         // הגדרת listeners
  this.loadAds();             // טעינה ראשונית
}
```

### 2. יצירת הטופס

```typescript
private initializeForm(): void {
  this.searchForm = this.fb.group({
    useCurrentLocation: [false],  // Checkbox "Near Me"
    locationRadius: [10],         // רדיוס ברירת מחדל: 10 ק"מ
    // ... שאר השדות
  });
  
  // האזנה לשינויים ב-"Near Me"
  this.searchForm.get('useCurrentLocation')?.valueChanges.subscribe(useLocation => {
    if (useLocation && !this.currentLocation) {
      // המשתמש סמן - צריך לקבל מיקום
      this.getCurrentLocation();
    } else if (!useLocation) {
      // המשתמש ביטל - איפוס וטעינה מחדש
      this.currentLocation = null;
      this.loadAds();
    }
  });
}
```

### 3. קבלת מיקום המשתמש

```typescript
getCurrentLocation(): void {
  // בדיקה אם הדפדפן תומך
  if (!navigator.geolocation) {
    this.locationError = 'Geolocation is not supported';
    return;
  }

  this.gettingLocation = true;  // מצב טעינה

  navigator.geolocation.getCurrentPosition(
    (position) => {
      // הצלחה
      this.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      this.gettingLocation = false;
      this.loadAds();  // טעינה עם פילטר מיקום
    },
    (error) => {
      // שגיאה
      this.gettingLocation = false;
      // טיפול בשגיאות לפי סוג
      switch (error.code) {
        case error.PERMISSION_DENIED:
          this.locationError = 'Location access denied...';
          break;
        // ... שגיאות אחרות
      }
    }
  );
}
```

### 4. טעינת מודעות עם פילטר מיקום

```typescript
private loadAds(): void {
  const formValue = this.searchForm.value;
  const params: AdsQueryParams = {
    page: this.page,
    pageSize: this.pageSize
  };

  // הוספת פילטר מיקום רק אם:
  // 1. המשתמש ביקש ("Near Me" מסומן)
  // 2. יש לנו מיקום תקין
  if (this.useCurrentLocation && this.currentLocation) {
    params.userLat = this.currentLocation.lat;
    params.userLng = this.currentLocation.lng;
    params.radius = formValue.locationRadius || 10;
  }

  // שליחה לשרת
  this.adsApi.getAds(params).subscribe({
    next: (response) => {
      this.ads = response.items;
      // ...
    }
  });
}
```

## תרחישי שימוש

### תרחיש 1: משתמש מסמן "Near Me" בפעם הראשונה
1. המשתמש לוחץ על "Near Me"
2. הדפדפן מבקש הרשאה למיקום
3. המשתמש מאשר
4. הקוד מקבל `lat` ו-`lng`
5. הקוד שולח בקשה לשרת עם `userLat`, `userLng`, `radius`
6. השרת מחזיר מודעות בקרבת המשתמש

### תרחיש 2: משתמש משנה רדיוס
1. המשתמש משנה את הרדיוס מ-10 ל-20 ק"מ
2. הקוד מחכה 500ms (debounce)
3. הקוד שולח בקשה חדשה עם `radius=20`
4. השרת מחזיר מודעות ברדיוס 20 ק"מ

### תרחיש 3: משתמש מבטל "Near Me"
1. המשתמש מסיר את הסימון
2. `currentLocation` מתאפס ל-`null`
3. הקוד שולח בקשה **ללא** `userLat`, `userLng`, `radius`
4. השרת מחזיר את כל המודעות (ללא סינון מיקום)

### תרחיש 4: משתמש מסרב להרשאה
1. המשתמש לוחץ על "Near Me"
2. הדפדפן מבקש הרשאה
3. המשתמש מסרב
4. הקוד מציג הודעת שגיאה: "Location access denied"
5. ה-checkbox מתבטל אוטומטית
6. לא נשלחת בקשה עם פילטר מיקום

## מה השרת צריך לעשות

השרת צריך:

1. **לזהות** אם יש פרמטרי `userLat` ו-`userLng` בבקשה
2. **לסנן** רק מודעות שיש להן מיקום (`location.lat` ו-`location.lng`)
3. **לחשב** מרחק בין מיקום המשתמש למיקום כל מודעה (נוסחת Haversine)
4. **להחזיר** רק מודעות שהמרחק שלהן ≤ `radius`
5. **למיין** לפי מרחק (קרוב לרחוק) - מומלץ
6. **לבצע** pagination על התוצאות המסוננות

## סיכום - מה הלקוח עושה

| פעולה | מה קורה בצד לקוח | מה נשלח לשרת |
|------|------------------|--------------|
| משתמש מסמן "Near Me" | בקשת מיקום מהדפדפן | `GET /api/Ads?userLat=X&userLng=Y&radius=10` |
| משתמש משנה רדיוס | debounce + טעינה מחדש | `GET /api/Ads?userLat=X&userLng=Y&radius=20` |
| משתמש מבטל "Near Me" | איפוס מיקום + טעינה | `GET /api/Ads` (ללא פרמטרי מיקום) |
| משתמש מסרב להרשאה | הודעת שגיאה | כלום (לא נשלח) |

## נקודות חשובות לשרת

1. **פרמטרים אופציונליים**: `userLat`, `userLng`, `radius` לא תמיד קיימים
   - אם **לא קיימים** → להחזיר את כל המודעות (ללא סינון מיקום)
   - אם **קיימים** → לסנן לפי מרחק

2. **Validation**: לוודא שהערכים תקינים:
   - `userLat`: בין -90 ל-90
   - `userLng`: בין -180 ל-180
   - `radius`: חיובי (לפחות 1)

3. **ברירת מחדל ל-radius**: אם לא נשלח, להשתמש ב-10 ק"מ

4. **רק מודעות עם מיקום**: כשמסננים לפי מיקום, להחזיר רק מודעות שיש להן `location.lat` ו-`location.lng`

