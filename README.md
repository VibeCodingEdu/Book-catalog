<div dir="rtl">

# קטלוג Merkos

אפליקציית ווב לקטלוג ספרים, חוברות ודברי דפוס — כללי ותורני, עם דגש על אוסף מחקר נדיר.

**ארכיטקטורה:** אתר סטטי (GitHub Pages) · "שרת" ב-Google Apps Script · נתונים ב-Google Sheets.

- **אפיון מלא:** [SPEC.md](SPEC.md)
- **מדריך הקמה (צעד-אחר-צעד):** [SETUP-GITHUB-PAGES.md](SETUP-GITHUB-PAGES.md)

## מבנה הפרויקט

```
docs/            האתר הסטטי (GitHub Pages מגיש מכאן)
  index.html
  app.js         לוגיקת הממשק
  styles.css
  config.js      ← כאן מדביקים את כתובת ה-Apps Script
apps-script/
  Code.gs        קוד ה-"שרת" — מדביקים בעורך Apps Script של הגיליון
```

## סטטוס

✅ שלב 1 (CRUD ידני) מוכן בקוד. נותר: להקים לפי [SETUP-GITHUB-PAGES.md](SETUP-GITHUB-PAGES.md).
כתובת האתר לאחר הפעלת Pages: <https://vibecodingedu.github.io/Book-catalog/>

</div>
