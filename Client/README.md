# Ads Board - Client Application

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [פונקציונליות המסכים](#פונקציונליות-המסכים)
3. [ארכיטקטורה וטכנולוגיות](#ארכיטקטורה-וטכנולוגיות)
4. [מבנה הקוד](#מבנה-הקוד)
5. [תשתית API ו-Observables](#תשתית-api-ו-observables)
6. [העברת מידע בין קומפוננטות](#העברת-מידע-בין-קומפוננטות)
7. [הוראות בדיקה](#הוראות-בדיקה)

---

## סקירה כללית

אפליקציית Ads Board היא אפליקציית Angular 17 standalone המאפשרת ניהול מודעות (יצירה, עריכה, מחיקה, חיפוש וסינון). האפליקציה מתחברת לשרת ASP.NET Core ומשתמשת בגיאוקודינג אוטומטי להמרת כתובות לקואורדינטות.

### תכונות עיקריות:
- ✅ יצירה ועריכה של מודעות
- ✅ חיפוש וסינון מתקדם (קטגוריה, מחיר, מיקום)
- ✅ סינון לפי מיקום נוכחי של המשתמש
- ✅ גיאוקודינג אוטומטי של כתובות
- ✅ עמידה ב-ARIA accessibility
- ✅ טיפול בשגיאות מרכזי
- ✅ ניהול מצב טעינה גלובלי

---

## פונקציונליות המסכים

### 1. מסך רשימת מודעות (`AdsListComponent`)

**נתיב:** `/ads`

**תפקיד:** הצגת רשימת כל המודעות עם אפשרויות חיפוש, סינון וניווט.

**פונקציונליות:**
- **חיפוש טקסטואלי:** שדה חיפוש עם debounce (300ms) לחיפוש בכותרת ותיאור
- **סינון לפי קטגוריה:** שדה טקסט לסינון לפי קטגוריה
- **סינון לפי מחיר:** שדות min/max price
- **סינון לפי מיקום:**
  - Checkbox "Has Location" - מציג רק מודעות עם מיקום
  - Checkbox "Near Me" - מציג מודעות בקרבת המיקום הנוכחי של המשתמש
  - בחירת רדיוס (1-100 ק"מ) לסינון לפי מרחק
- **מיון:** לפי תאריך יצירה, מחיר או כותרת (עולה/יורד)
- **עמודים:** תמיכה ב-pagination עם 10 מודעות לעמוד
- **ניווט:** לחיצה על כרטיס מודעה מעבירה למסך פרטי המודעה

**איך לבדוק:**
1. פתח את האפליקציה - תראה רשימת מודעות
2. נסה לחפש טקסט - התוצאות מתעדכנות אוטומטית
3. סנן לפי קטגוריה/מחיר - בדוק שהסינון עובד
4. סמן "Has Location" - רק מודעות עם כתובת יוצגו
5. סמן "Near Me" - תן הרשאה למיקום, בדוק שהרדיוס עובד
6. שנה מיון - בדוק שהרשימה מתעדכנת
7. לחץ על מודעה - תועבר למסך פרטים

---

### 2. מסך יצירה/עריכה מודעה (`AdsFormComponent`)

**נתיבים:** `/ads/new` (יצירה), `/ads/:id/edit` (עריכה)

**תפקיד:** טופס ליצירה או עריכה של מודעה.

**פונקציונליות:**

#### שדות הטופס:
- **Title** (חובה): כותרת המודעה, 1-80 תווים
- **Description** (חובה): תיאור המודעה, 1-2000 תווים
- **Price** (אופציונלי): מחיר, חיובי בלבד
- **Category** (אופציונלי): קטגוריה

#### פרטי קשר (חובה):
- **Name** (חובה): שם איש קשר
- **Phone** (אופציונלי): טלפון
- **Email** (אופציונלי): אימייל (חייב להיות בפורמט תקין)
- **Validation:** לפחות אחד מהם (Phone או Email) חייב להיות מוזן

#### מיקום (אופציונלי):
- **Address** (אופציונלי): כתובת טקסטואלית
- **Latitude/Longitude** (אופציונלי): קואורדינטות ידניות
- **גיאוקודינג אוטומטי:**
  - בעת הזנת כתובת, האפליקציה מחכה 1.5 שניות (debounce) עד שהמשתמש מסיים להקליד
  - לאחר מכן שולחת בקשה לשרת להמרת הכתובת לקואורדינטות
  - הקואורדינטות מתעדכנות אוטומטית בשדות Lat/Lng
  - אם הכתובת לא נמצאה (404), מוצגת הודעת שגיאה
  - אם המשתמש מתקן את הכתובת, נשלחת בקשה חדשה אוטומטית
- **Validation:** אם יש כתובת, חייבים להיות גם Lat ו-Lng

#### תכונות נוספות:
- **טיפול בשגיאות:** הצגת שגיאות ולידציה בזמן אמת
- **Loading states:** מצב טעינה בעת שמירה או טעינת מודעה קיימת
- **Cancel:** כפתור ביטול שמחזיר לרשימה

**איך לבדוק:**

**יצירת מודעה חדשה:**
1. לחץ על "Create New Ad"
2. מלא את כל השדות החובה (Title, Description, Contact Name)
3. נסה לשמור בלי שדות חובה - בדוק שהשגיאות מוצגות
4. נסה email לא תקין - בדוק שהשגיאה מוצגת
5. נסה contact בלי phone ובלי email - בדוק שהשגיאה מוצגת
6. הזן כתובת תקינה (למשל: "הרצל 16 נתניה") - בדוק שהקואורדינטות מתמלאות אוטומטית
7. הזן כתובת שגויה (למשל: "גדגדג 123") - בדוק שהשגיאה מוצגת
8. מחק את הכתובת השגויה והזן כתובת תקינה - בדוק שבקשה חדשה נשלחת והקואורדינטות מתעדכנות
9. הזן כתובת, מחק אותה, והזן אותה שוב - בדוק שלא נשלחת בקשה מיותרת (caching)
10. שמור את המודעה - בדוק שהמעבר למסך פרטים עובד

**עריכת מודעה קיימת:**
1. פתח מודעה קיימת
2. לחץ על "Edit"
3. שנה שדות
4. שמור - בדוק שהעדכון עובד

---

### 3. מסך פרטי מודעה (`AdsDetailsComponent`)

**נתיב:** `/ads/:id`

**תפקיד:** הצגת כל הפרטים של מודעה בודדת.

**פונקציונליות:**
- הצגת כל שדות המודעה (כותרת, תיאור, מחיר, קטגוריה, קשר, מיקום)
- כפתור "Edit" למעבר למסך עריכה
- כפתור "Delete" למחיקת המודעה (עם אישור)
- כפתור "Back" לחזרה לרשימה
- טיפול בשגיאות (אם המודעה לא נמצאה)

**איך לבדוק:**
1. לחץ על מודעה מהרשימה
2. בדוק שכל הפרטים מוצגים נכון
3. לחץ "Edit" - בדוק שהמעבר למסך עריכה עובד
4. לחץ "Delete" - בדוק שהאישור מוצג
5. אשר מחיקה - בדוק שהחזרה לרשימה עובדת
6. לחץ "Back" - בדוק שהחזרה לרשימה עובדת

---

### 4. קומפוננטת חיפוש (`SearchBarComponent`)

**תפקיד:** קומפוננטה משותפת (shared) לחיפוש טקסטואלי.

**פונקציונליות:**
- שדה קלט עם placeholder ניתן להגדרה
- מעבר אירוע `searchChange` לקומפוננטה ההורה
- שימוש ב-Reactive Forms

**איך לבדוק:**
- הקומפוננטה משולבת ב-`AdsListComponent` - בדוק שהחיפוש עובד שם

---

## ארכיטקטורה וטכנולוגיות

### Angular 17 Standalone Components

האפליקציה בנויה על **Angular 17** עם **Standalone Components** - כל קומפוננטה היא עצמאית ואינה דורשת NgModule. זה מאפשר:
- Bundle size קטן יותר (tree-shaking טוב יותר)
- Lazy loading קל יותר
- קוד נקי יותר ללא תלות ב-NgModules

### מבנה התיקיות

```
src/app/
├── app.component.ts          # קומפוננטה ראשית
├── app-routing.ts             # הגדרות routing
├── core/                      # תשתית משותפת
│   ├── config/
│   │   └── environment.ts    # הגדרות סביבה
│   ├── interceptors/
│   │   ├── error.interceptor.ts    # טיפול בשגיאות
│   │   └── loading.interceptor.ts  # ניהול מצב טעינה
│   ├── models/
│   │   └── ad.model.ts        # מודלים של מודעות
│   └── services/
│       ├── api-client.service.ts   # שירות HTTP מרכזי
│       ├── ads-api.service.ts      # שירות ספציפי למודעות
│       └── geocoding.service.ts    # שירות גיאוקודינג
├── features/                  # תכונות לפי domain
│   └── ads/
│       ├── ads-list/          # רשימת מודעות
│       ├── ads-form/           # טופס יצירה/עריכה
│       └── ads-details/        # פרטי מודעה
└── shared/                     # קומפוננטות משותפות
    └── components/
        └── search-bar/         # קומפוננטת חיפוש
```

### עקרונות ארכיטקטורה

1. **SRP (Single Responsibility Principle):** כל קומפוננטה/שירות אחראי על דבר אחד
2. **Dependency Injection:** שימוש ב-`inject()` function (Angular 17)
3. **Feature-based structure:** ארגון לפי features ולא לפי סוג קבצים
4. **Separation of Concerns:** הפרדה בין UI, לוגיקה עסקית, ותשתית

---

## מבנה הקוד

### קומפוננטות

#### 1. `AppComponent`
- **תפקיד:** קומפוננטה ראשית, מכילה רק `<router-outlet>`
- **תלויות:** `RouterOutlet` בלבד

#### 2. `AdsListComponent`
- **תפקיד:** ניהול רשימת מודעות, חיפוש וסינון
- **תלויות:**
  - `AdsApiService` - לטעינת מודעות
  - `Router` - לניווט
  - `FormBuilder` - לטופס חיפוש/סינון
  - `SearchBarComponent` - קומפוננטת חיפוש
- **State management:** משתמש ב-Reactive Forms לניהול מצב הטופס

#### 3. `AdsFormComponent`
- **תפקיד:** ניהול טופס יצירה/עריכה
- **תלויות:**
  - `AdsApiService` - לשמירה/טעינה
  - `GeocodingService` - לגיאוקודינג
  - `Router`, `ActivatedRoute` - לניווט וזיהוי מצב עריכה
  - `FormBuilder` - לבניית הטופס
- **State management:** 
  - Reactive Forms לניהול הטופס
  - `Subject<string>` לניהול זרם הגיאוקודינג
  - משתני state: `geocodingInProgress`, `geocodingError`, `lastGeocodedAddress`

#### 4. `AdsDetailsComponent`
- **תפקיד:** הצגת פרטי מודעה
- **תלויות:**
  - `AdsApiService` - לטעינת מודעה
  - `Router`, `ActivatedRoute` - לניווט וזיהוי ID

#### 5. `SearchBarComponent`
- **תפקיד:** קומפוננטת חיפוש משותפת
- **תלויות:** `FormControl` בלבד
- **Output:** `searchChange` EventEmitter

### שירותים

#### 1. `ApiClientService`
- **תפקיד:** שירות HTTP מרכזי - נקודת כניסה יחידה לכל קריאות API
- **תכונות:**
  - מטפל בכל סוגי ה-HTTP methods (GET, POST, PUT, PATCH, DELETE)
  - הוספת headers אוטומטית (Content-Type, Accept)
  - בניית query parameters
  - טיפול בסיסי בשגיאות (delegates ל-interceptor)
- **מדוע נבחר:**
  - **SRP:** כל שירות אחר לא צריך לדעת איך לעשות HTTP
  - **DRY:** אין חזרה על קוד HTTP
  - **Centralized configuration:** קל לשנות base URL או headers במקום אחד

#### 2. `AdsApiService`
- **תפקיד:** שירות ספציפי למודעות - עוטף את `ApiClientService`
- **תכונות:**
  - מתודות: `getAds()`, `getAd()`, `createAd()`, `updateAd()`, `deleteAd()`
  - מחזיר `Observable<T>` לכל פעולה
- **מדוע נבחר:**
  - **Domain separation:** לוגיקה ספציפית למודעות נפרדת מתשתית HTTP
  - **Testability:** קל לבדוק את הלוגיקה העסקית בנפרד

#### 3. `GeocodingService`
- **תפקיד:** שירות גיאוקודינג - המרת כתובות לקואורדינטות
- **תכונות:**
  - מתודה `geocodeAddress(address: string): Observable<GeocodingResult>`
  - משתמש ב-`ApiClientService` לקריאה ל-`/Geocoding/geocode`
- **מדוע נבחר:**
  - **Separation of concerns:** לוגיקת גיאוקודינג נפרדת מלוגיקת מודעות
  - **Reusability:** ניתן להשתמש בשירות זה בקומפוננטות אחרות

### Interceptors

#### 1. `errorInterceptor`
- **תפקיד:** נרמול שגיאות HTTP למסרים ידידותיים למשתמש
- **תכונות:**
  - מטפל ב-ProblemDetails format מהשרת
  - ממיר status codes למסרים ברורים
  - מוסיף `userMessage` לאובייקט השגיאה
- **מדוע נבחר:**
  - **Centralized error handling:** כל השגיאות מטופלות במקום אחד
  - **Consistency:** כל הקומפוננטות מקבלות שגיאות באותו פורמט

#### 2. `loadingInterceptor`
- **תפקיד:** ניהול מצב טעינה גלובלי
- **תכונות:**
  - עוקב אחר מספר בקשות פעילות
  - מוסיף/מסיר class `loading` ל-`document.body`
  - ניתן להרחבה לשירות loading מרכזי
- **מדוע נבחר:**
  - **Automatic:** כל בקשה HTTP מעדכנת את מצב הטעינה אוטומטית
  - **No boilerplate:** הקומפוננטות לא צריכות לנהל loading state ידנית

---

## תשתית API ו-Observables

### RxJS Observables - מדוע?

האפליקציה משתמשת ב-**RxJS Observables** לכל פעולות אסינכרוניות. זה מאפשר:

1. **Composability:** שילוב של מספר פעולות אסינכרוניות בקלות
2. **Cancellation:** ביטול בקשות ישנות כשמגיעה בקשה חדשה
3. **Error handling:** טיפול בשגיאות בצורה אלגנטית
4. **Debouncing/Throttling:** אופטימיזציה של בקשות (למשל, גיאוקודינג)

### סוגי Observables בשימוש

#### 1. HTTP Observables (`Observable<T>`)
- **מקור:** `HttpClient` ב-`ApiClientService`
- **שימוש:** כל קריאת API מחזירה `Observable<T>`
- **דוגמה:**
```typescript
this.adsApi.getAds(params).subscribe({
  next: (response) => { /* handle success */ },
  error: (err) => { /* handle error */ }
});
```

#### 2. Form Value Changes (`Observable<string>`)
- **מקור:** `FormControl.valueChanges`
- **שימוש:** מעקב אחר שינויים בשדות טופס
- **דוגמה:**
```typescript
addressControl.valueChanges.subscribe(address => {
  // handle address change
});
```

#### 3. Subject (`Subject<string>`)
- **מקור:** `new Subject<string>()` ב-`AdsFormComponent`
- **שימוש:** ניהול זרם הגיאוקודינג
- **מדוע Subject ולא Observable רגיל?**
  - Subject מאפשר לשלוח ערכים ידנית עם `next()`
  - מאפשר שליטה מלאה על הזרם
- **דוגמה:**
```typescript
private addressSubject = new Subject<string>();

// שליחת ערך
this.addressSubject.next(address);

// המנוי
this.addressSubject.pipe(...).subscribe(...);
```

### RxJS Operators בשימוש

#### 1. `debounceTime(ms)`
- **שימוש:** בגיאוקודינג (1500ms) ובחיפוש (300ms)
- **מדוע:** מחכה שהמשתמש יסיים להקליד לפני שליחת בקשה
- **דוגמה:**
```typescript
this.addressSubject.pipe(
  debounceTime(1500) // מחכה 1.5 שניות
)
```

#### 2. `distinctUntilChanged()`
- **שימוש:** בגיאוקודינג ובחיפוש
- **מדוע:** מונע שליחת בקשות מיותרות אם הערך לא השתנה
- **דוגמה:**
```typescript
distinctUntilChanged((prev, curr) => {
  return prev.trim().toLowerCase() === curr.trim().toLowerCase();
})
```

#### 3. `switchMap()`
- **שימוש:** בגיאוקודינג
- **מדוע:** מבטל בקשה קודמת אם מגיעה בקשה חדשה (race condition prevention)
- **דוגמה:**
```typescript
switchMap(address => {
  return this.geocodingService.geocodeAddress(address)
})
```

#### 4. `filter()`
- **שימוש:** בגיאוקודינג
- **מדוע:** מסנן כתובות ריקות לפני שליחת בקשה
- **דוגמה:**
```typescript
filter((address): address is string => {
  return !!(address && address.trim().length > 0);
})
```

#### 5. `tap()`
- **שימוש:** בגיאוקודינג
- **מדוע:** ביצוע side effects (עדכון state, logging) בלי לשנות את הזרם
- **דוגמה:**
```typescript
tap(() => {
  this.geocodingInProgress = true;
})
```

#### 6. `takeUntil()`
- **שימוש:** בגיאוקודינג
- **מדוע:** ביטול בקשה אם מגיעה בקשה חדשה
- **דוגמה:**
```typescript
return this.geocodingService.geocodeAddress(address).pipe(
  takeUntil(cancelSubject) // מבטל אם cancelSubject פולט
)
```

#### 7. `take(1)`
- **שימוש:** בגיאוקודינג
- **מדוע:** לוקח רק את התוצאה הראשונה (מונע multiple emissions)
- **דוגמה:**
```typescript
take(1) // רק התוצאה הראשונה
```

#### 8. `catchError()`
- **שימוש:** בגיאוקודינג וב-`ApiClientService`
- **מדוע:** טיפול בשגיאות בלי להפיל את הזרם
- **דוגמה:**
```typescript
catchError((error) => {
  this.geocodingError = error.message;
  return EMPTY; // מחזיר Observable ריק, לא מפיל את הזרם
})
```

### זרימת הגיאוקודינג - דוגמה מורכבת

הגיאוקודינג ב-`AdsFormComponent` הוא דוגמה מצוינת לשימוש מתקדם ב-RxJS:

```typescript
// 1. המשתמש מקליד כתובת
addressControl.valueChanges.subscribe(address => {
  // 2. בדיקה אם צריך לשלוח
  if (shouldSend) {
    this.addressSubject.next(address); // 3. שליחה ל-Subject
  }
});

// 4. עיבוד הזרם
this.addressSubject.pipe(
  debounceTime(1500),              // מחכה 1.5 שניות
  distinctUntilChanged(...),        // רק אם השתנה
  filter(...),                      // רק כתובות לא ריקות
  tap(() => {                       // עדכון state
    this.geocodingInProgress = true;
  }),
  switchMap(address => {            // ביטול בקשה קודמת אם יש חדשה
    return this.geocodingService.geocodeAddress(address).pipe(
      takeUntil(cancelSubject),     // ביטול אם יש בקשה חדשה
      take(1),                      // רק תוצאה ראשונה
      tap({                         // עדכון קואורדינטות
        next: (result) => { /* update coordinates */ },
        error: (error) => { /* handle error */ }
      }),
      catchError((error) => {       // טיפול בשגיאות בלי להפיל
        // handle error
        return EMPTY;
      })
    );
  })
).subscribe(...);
```

**מדוע המבנה הזה?**
- **Performance:** debounce מונע בקשות מיותרות
- **Race condition prevention:** switchMap מבטל בקשות ישנות
- **Error resilience:** catchError מונע קריסת הזרם
- **User experience:** המשתמש רואה feedback (loading, error)

---

## העברת מידע בין קומפוננטות

### 1. Parent → Child (Input Properties)

**דוגמה:** `SearchBarComponent` מקבל `placeholder` מ-`AdsListComponent`

```typescript
// AdsListComponent
<app-search-bar
  placeholder="Search ads..."
  (searchChange)="onSearchChange($event)"
></app-search-bar>

// SearchBarComponent
placeholder = input<string>('Search...');
```

**שימוש:** Angular 17 Signals API עם `input()`

### 2. Child → Parent (Event Emitters)

**דוגמה:** `SearchBarComponent` מעביר שינויים ל-`AdsListComponent`

```typescript
// SearchBarComponent
@Output() searchChange = new EventEmitter<string>();

this.searchControl.valueChanges.subscribe(value => {
  this.searchChange.emit(value || '');
});

// AdsListComponent
onSearchChange(query: string): void {
  this.searchForm.patchValue({ q: query });
}
```

### 3. Services (Shared State)

**דוגמה:** כל הקומפוננטות משתמשות ב-`AdsApiService` לטעינת נתונים

```typescript
// AdsListComponent
this.adsApi.getAds(params).subscribe(...);

// AdsDetailsComponent
this.adsApi.getAd(id).subscribe(...);

// AdsFormComponent
this.adsApi.createAd(dto).subscribe(...);
```

**מדוע Services?**
- **Shared logic:** לוגיקה משותפת לכל הקומפוננטות
- **State management:** שירותים יכולים לשמור state (אם צריך)
- **Dependency Injection:** Angular מנהל את ה-instances

### 4. Router (Route Parameters)

**דוגמה:** העברת ID דרך URL

```typescript
// Navigation
this.router.navigate(['/ads', ad.id]);

// Reading
this.route.paramMap.subscribe(params => {
  const id = params.get('id');
});
```

**מדוע Router?**
- **Deep linking:** ניתן לשתף קישורים ישירים
- **Browser history:** כפתור Back עובד
- **State management:** ה-URL הוא מקור האמת

### 5. Reactive Forms (Form State)

**דוגמה:** `AdsListComponent` משתמש ב-Reactive Forms לניהול מצב הטופס

```typescript
this.searchForm = this.fb.group({
  q: [''],
  category: [''],
  // ...
});

// הערכים נשמרים ב-FormGroup
this.searchForm.valueChanges.subscribe(() => {
  this.loadAds(); // טעינה מחדש לפי הערכים
});
```

**מדוע Reactive Forms?**
- **Type safety:** TypeScript types לכל שדה
- **Validation:** ולידציה מובנית
- **Reactive:** תגובה אוטומטית לשינויים

---

## הוראות בדיקה

### הכנה

1. **הרצת השרת:**
   ```bash
   cd ../server/IAI_server
   dotnet run
   ```
   השרת צריך לרוץ על `http://localhost:5294`

2. **הרצת הלקוח:**
   ```bash
   cd Client
   npm install  # אם צריך
   npm start
   ```
   הלקוח צריך לרוץ על `http://localhost:4200`

### תרחישי בדיקה

#### תרחיש 1: יצירת מודעה עם גיאוקודינג
1. פתח `/ads/new`
2. מלא Title: "מודעה חדשה"
3. מלא Description: "תיאור מודעה"
4. מלא Contact Name: "יוסי"
5. מלא Contact Email: "yossi@example.com"
6. הזן Address: "הרצל 16 נתניה"
7. **בדוק:** אחרי 1.5 שניות, Lat ו-Lng מתמלאים אוטומטית
8. לחץ "Create Ad"
9. **בדוק:** מעבר למסך פרטי המודעה

#### תרחיש 2: גיאוקודינג עם שגיאה ותיקון
1. פתח `/ads/new`
2. מלא את כל השדות החובה
3. הזן Address שגויה: "גדגדג 123"
4. **בדוק:** אחרי 1.5 שניות, מוצגת שגיאה "Address not found"
5. מחק את הכתובת והזן כתובת תקינה: "קרן היסוד 25 בת ים"
6. **בדוק:** נשלחת בקשה חדשה והקואורדינטות מתעדכנות
7. **בדוק:** השגיאה נעלמת

#### תרחיש 3: חיפוש וסינון
1. פתח `/ads`
2. הזן טקסט בחיפוש: "מודעה"
3. **בדוק:** הרשימה מתעדכנת אחרי 300ms
4. סנן לפי קטגוריה: "מכוניות"
5. **בדוק:** רק מודעות בקטגוריה זו מוצגות
6. סמן "Has Location"
7. **בדוק:** רק מודעות עם כתובת מוצגות

#### תרחיש 4: סינון לפי מיקום
1. פתח `/ads`
2. סמן "Near Me"
3. **בדוק:** מוצגת בקשה להרשאה למיקום
4. אשר את ההרשאה
5. **בדוק:** הרשימה מתעדכנת לפי מיקום נוכחי
6. שנה את הרדיוס ל-5 ק"מ
7. **בדוק:** הרשימה מתעדכנת

#### תרחיש 5: עריכה ומחיקה
1. פתח מודעה קיימת
2. לחץ "Edit"
3. שנה את הכותרת
4. לחץ "Update Ad"
5. **בדוק:** העדכון נשמר
6. חזור למסך פרטים
7. לחץ "Delete"
8. אשר את המחיקה
9. **בדוק:** חזרה לרשימה והמודעה נמחקה

#### תרחיש 6: ולידציה
1. פתח `/ads/new`
2. נסה לשמור בלי למלא שדות
3. **בדוק:** כל השדות החובה מציגים שגיאה
4. מלא Contact Name אבל לא Phone ולא Email
5. **בדוק:** מוצגת שגיאה "Phone or email is required"
6. הזן Email לא תקין: "notanemail"
7. **בדוק:** מוצגת שגיאה "Invalid email format"
8. הזן Address אבל לא Lat/Lng
9. **בדוק:** מוצגת שגיאה "Latitude and longitude are required"

### בדיקות טכניות

#### בדיקת Console
1. פתח Developer Tools (F12)
2. בדוק שאין שגיאות JavaScript
3. בדוק שהלוגים של הגיאוקודינג מוצגים נכון:
   - "Starting geocoding..."
   - "=== Calling geocoding service for: ..."
   - "Geocoding result received..."

#### בדיקת Network
1. פתח Network tab
2. בדוק שהבקשות ל-API נשלחות נכון:
   - `GET /api/Ads` - טעינת רשימה
   - `POST /api/Ads` - יצירת מודעה
   - `POST /api/Geocoding/geocode` - גיאוקודינג
3. בדוק שהבקשות לא נשלחות מיותרות (debounce עובד)

#### בדיקת Accessibility
1. נסה לנווט עם מקלדת בלבד (Tab, Enter)
2. בדוק ש-ARIA labels קיימים
3. בדוק ש-screen reader יכול לקרוא את התוכן

---

## סיכום

האפליקציה בנויה על:
- **Angular 17 Standalone Components** - ארכיטקטורה מודרנית
- **RxJS Observables** - ניהול אסינכרוניות מתקדם
- **Reactive Forms** - ניהול טופסים
- **Dependency Injection** - הפרדת תלויות
- **Feature-based structure** - ארגון קוד לפי features
- **SRP** - כל קומפוננטה/שירות אחראי על דבר אחד

התשתית מאפשרת:
- **Scalability:** קל להוסיף features חדשים
- **Maintainability:** קוד נקי ומובן
- **Testability:** קל לבדוק כל חלק בנפרד
- **Performance:** אופטימיזציות (debounce, switchMap)
- **User Experience:** feedback מיידי, טיפול בשגיאות

---

**נכתב עבור:** בודקי האפליקציה  
**תאריך:** 2025  
**גרסה:** 1.0

