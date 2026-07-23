<div dir="rtl">

# מדריך הקמה — חיבור ל-Google Sheets ו-Drive

מדריך צעד-אחר-צעד לחיבור האפליקציה לחשבון הגוגל שלך. זמן משוער: ~5–10 דקות.
בסוף התהליך יהיה לך קובץ `.env` מלא, ותוכל להריץ `npm run init-sheet`.

> **למה חשבון שירות?** זה "משתמש רובוט" של גוגל. אתה משתף איתו את הגיליון והתיקייה,
> והאפליקציה פועלת בשמו — בלי שתצטרך למסור סיסמה או להתחבר כל פעם.

---

## חלק א׳ — פרויקט Google Cloud וממשקי API

### 1. יצירת פרויקט
1. היכנס ל-<https://console.cloud.google.com/>.
2. בראש הדף, ליד הלוגו, לחץ על בורר הפרויקטים ← **New Project**.
3. שם: `book-catalog` (או כרצונך) ← **Create**.
4. ודא שהפרויקט החדש נבחר (בורר הפרויקטים למעלה).

### 2. הפעלת שני ה-API
1. תפריט (☰) ← **APIs & Services** ← **Enabled APIs & services**.
2. **+ Enable APIs and Services**, חפש **Google Sheets API** ← **Enable**.
3. חזור וחפש **Google Drive API** ← **Enable**.

---

## חלק ב׳ — חשבון שירות ומפתח JSON

### 3. יצירת חשבון שירות
1. תפריט (☰) ← **APIs & Services** ← **Credentials**.
2. **+ Create Credentials** ← **Service account**.
3. שם: `catalog-bot` ← **Create and Continue**.
4. את שלב ההרשאות (Grant access) אפשר לדלג — **Continue** ← **Done**.

### 4. הורדת מפתח ה-JSON
1. במסך **Credentials**, תחת *Service Accounts*, לחץ על החשבון שיצרת.
2. לשונית **Keys** ← **Add Key** ← **Create new key** ← סוג **JSON** ← **Create**.
3. קובץ `.json` יורד למחשב. **שמור אותו בבטחה — לא ניתן להוריד שוב.**

### 5. העתקת כתובת חשבון השירות
באותו מסך, העתק את שדה **Email** של החשבון. הוא נראה כך:
`catalog-bot@book-catalog-123456.iam.gserviceaccount.com`
נצטרך אותו בשלב השיתוף.

---

## חלק ג׳ — גיליון ותיקייה, ושיתוף איתם

### 6. יצירת הגיליון
1. פתח <https://sheets.google.com/> ← גיליון ריק חדש.
2. תן לו שם, למשל **קטלוג ספרים**.
3. העתק את **מזהה הגיליון** מתוך ה-URL — החלק שבין `/d/` ל-`/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...XyZ`**`/edit`
4. **Share** (למעלה מימין) ← הדבק את כתובת חשבון השירות ← הרשאה **Editor** ← **Send**.

### 7. יצירת תיקיית התמונות
1. פתח <https://drive.google.com/> ← **New** ← **Folder** ← למשל **תמונות קטלוג**.
2. פתח את התיקייה והעתק את **מזהה התיקייה** מה-URL (החלק אחרי `/folders/`):
   `https://drive.google.com/drive/folders/`**`1DeF...123`**
3. לחץ ימני על התיקייה ← **Share** ← הדבק את כתובת חשבון השירות ← **Editor** ← **Send**.

---

## חלק ד׳ — מילוי `.env` והרצת האתחול

### 8. יצירת קובץ `.env`
בתיקיית הפרויקט, העתק את התבנית:

```bash
cp .env.example .env
```

מלא בקובץ `.env`:

| משתנה | מאיפה |
|---|---|
| `GOOGLE_SHEET_ID` | מזהה הגיליון (שלב 6) |
| `GOOGLE_DRIVE_FOLDER_ID` | מזהה התיקייה (שלב 7) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | כל תוכן קובץ ה-JSON, בשורה אחת (ראה טיפ למטה) |

> **טיפ להדבקת ה-JSON בשורה אחת:** במקום זה, קל יותר לשמור את הקובץ בתיקיית
> הפרויקט (למשל `service-account.json` — הוא כבר חסום מגיט) ולהשתמש ב:
> ```
> GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json
> ```
> אפשר להשאיר את `GOOGLE_SERVICE_ACCOUNT_JSON` ריק במקרה זה.

### 9. בניית מבנה הגיליון
```bash
npm run init-sheet
```
הסקריפט יוצר את הלשוניות (`פריטים`, `נושאים`, `מדפים`, `מו״לים`, `אוספים`, `הגדרות`),
כותב כותרות וזורע ערכי ברירת מחדל. הוא בטוח להרצה חוזרת.

### 10. הפעלת האפליקציה
```bash
npm run dev
```
פתח <http://localhost:3000> — כעת תראה את הקטלוג (ריק בינתיים).

---

## אבטחה — חשוב

- **לעולם אל תעלה** את קובץ ה-JSON או את `.env` לגיט. הם כבר חסומים ב-`.gitignore`.
- אם המפתח דלף — מחק אותו במסך **Credentials** וצור חדש.

## תקלות נפוצות

| תסמין | פתרון |
|---|---|
| `The caller does not have permission` | לא שיתפת את הגיליון/התיקייה עם כתובת חשבון השירות (Editor). |
| `Requested entity was not found` | `GOOGLE_SHEET_ID` שגוי — ודא שהעתקת רק את החלק שבין `/d/` ל-`/edit`. |
| `API has not been used / disabled` | לא הפעלת את Sheets API או Drive API (חלק א׳, שלב 2). |

</div>
