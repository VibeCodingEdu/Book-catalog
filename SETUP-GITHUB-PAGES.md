<div dir="rtl">

# מדריך הקמה — אתר סטטי (GitHub Pages) + Google Apps Script

בגישה הזו אין שרת ואין חשבון שירות. ה"שרת" הוא **Google Apps Script** שיושב על הגיליון שלך,
והאתר הסטטי מתארח חינם ב-**GitHub Pages**. זמן משוער: ~10 דקות.

## סקירה — שלושה עננים

```
דפדפן  ──►  github.io (האתר הסטטי)  ──►  Apps Script (על הגיליון)  ──►  Google Sheets
```

---

## חלק א׳ — הגיליון ו-Apps Script

### 1. יצירת גיליון
פתח <https://sheets.google.com/> ← גיליון ריק חדש ← תן לו שם, למשל **קטלוג ספרים**.
(אין צורך להעתיק שום מזהה — ה-Script יהיה צמוד לגיליון.)

### 2. הדבקת קוד ה-Apps Script
1. בתוך הגיליון: תפריט **Extensions** ← **Apps Script**.
2. מחק את מה שיש בעורך, והדבק את **כל** תוכן הקובץ [`apps-script/Code.gs`](apps-script/Code.gs).
3. שמור (אייקון הדיסקט או Ctrl/Cmd+S).

### 3. הרצת ההקמה (פעם אחת)
1. בעורך, בבורר הפונקציות למעלה, בחר **initSheet** ← לחץ **Run**.
2. גוגל תבקש הרשאה: **Review permissions** ← בחר את החשבון שלך ← אם מופיע
   "Google hasn't verified this app": **Advanced** ← **Go to (project) (unsafe)** ← **Allow**.
   *(זה בטוח — זו התוכנה שלך עצמך.)*
3. חזור לגיליון — נוצרו הלשוניות: `פריטים`, `נושאים`, `מדפים`, `מו״לים`, `אוספים`, `הגדרות`.

### 4. פרסום כ-Web App
1. בעורך ה-Apps Script: כפתור **Deploy** ← **New deployment**.
2. ליד "Select type" לחץ על גלגל השיניים ← **Web app**.
3. הגדרות:
   - **Execute as:** *Me* (אתה)
   - **Who has access:** *Anyone*
4. **Deploy** ← אשר הרשאות אם צריך ← **העתק את ה-Web app URL** (מסתיים ב-`/exec`).

> שמור את הכתובת הזו — נצטרך אותה בחלק ב׳.

---

## חלק ב׳ — חיבור האתר

### 5. הדבקת הכתובת ב-config.js
1. פתח את הקובץ [`docs/config.js`](docs/config.js).
2. הדבק את הכתובת בין הגרשיים:
   ```js
   window.CONFIG = {
     APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec"
   };
   ```
3. שמור, ודחוף לגיט:
   ```bash
   git add docs/config.js
   git commit -m "Configure Apps Script URL"
   git push
   ```

### 6. הפעלת GitHub Pages
1. בגיטהאב, בעמוד הריפו: **Settings** ← בתפריט הצד **Pages**.
2. תחת *Build and deployment* → *Source*: **Deploy from a branch**.
3. *Branch*: **main** · תיקייה: **/docs** ← **Save**.
4. המתן ~1–2 דקות. האתר יעלה בכתובת:
   **<https://vibecodingedu.github.io/Book-catalog/>**

---

## זהו! 🎉

היכנס לכתובת האתר, לחץ **+ הוסף פריט**, ומלא. המספר הקטלוגי (`ת-0001` / `כ-0001`)
נוצר אוטומטית, והנתונים נשמרים ישירות בגיליון שלך.

## עדכונים בעתיד
- שינוי **בקוד האתר** (עיצוב/תכונות): דוחפים לגיט, ו-GitHub Pages מתעדכן לבד.
- שינוי **בקוד ה-Apps Script**: יש לחזור ל-Deploy ← **Manage deployments** ← עריכה ←
  **New version** ← Deploy (הכתובת נשארת אותה כתובת).

## תקלות נפוצות

| תסמין | פתרון |
|---|---|
| האתר מציג "כמעט מוכן" | לא הדבקת את הכתובת ב-`docs/config.js`, או לא דחפת לגיט. |
| שגיאת טעינה / הרשאה | ודא ש-Deploy נעשה עם *Who has access: **Anyone***. |
| שינוי ב-Apps Script לא נתפס | פרסמת גרסה חדשה? (Manage deployments → New version). |
| הכתובת לא מסתיימת ב-/exec | העתקת קישור שגוי — חזור ל-Deploy והעתק את ה-Web app URL. |

</div>
