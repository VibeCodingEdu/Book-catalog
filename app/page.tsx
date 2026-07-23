import { ITEM_COLUMNS, type Item } from "@/lib/schema";
import { listItems } from "@/lib/sheets";

// עמודות מוצגות בטבלת הסקירה (תת-קבוצה מתוך המבנה המלא).
const DISPLAY_KEYS = [
  "catalogNumber",
  "title",
  "author",
  "publisher",
  "hebrewYear",
  "topic",
  "shelf",
] as const;

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
  );
}

export default async function HomePage() {
  if (!isConfigured()) {
    return (
      <section className="card">
        <h2>ברוך הבא לקטלוג 📚</h2>
        <p>
          החיבור ל-Google Sheets עדיין לא מוגדר. כדי להתחיל, העתק את{" "}
          <code>.env.example</code> ל-<code>.env</code> ומלא את פרטי חשבון
          השירות ומזהה הגיליון. לאחר מכן הרץ <code>npm run init-sheet</code> כדי
          לבנות את מבנה הלשוניות.
        </p>
      </section>
    );
  }

  let items: Item[] = [];
  let error: string | null = null;
  try {
    items = await listItems();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <section className="card">
        <h2>שגיאה בטעינת הנתונים</h2>
        <p className="empty">{error}</p>
      </section>
    );
  }

  const headers = DISPLAY_KEYS.map(
    (k) => ITEM_COLUMNS.find((c) => c.key === k)!.header
  );

  return (
    <section className="card">
      <h2>הפריטים באוסף ({items.length})</h2>
      {items.length === 0 ? (
        <p className="empty">עדיין אין פריטים. הוסף את הפריט הראשון שלך.</p>
      ) : (
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.catalogNumber || i}>
                {DISPLAY_KEYS.map((k) => (
                  <td key={k}>{item[k]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
