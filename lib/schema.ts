/**
 * הגדרת מבנה הגיליון — מקור אמת יחיד ללשוניות, לעמודות ולרשימות.
 * שינוי כאן משתקף גם בסקריפט האתחול (scripts/init-sheet.mjs) וגם באפליקציה.
 */

/** לשונית ראשית: פריטים */
export const ITEMS_SHEET = "פריטים";

/** עמודות הלשונית הראשית, לפי הסדר. ה-key משמש בקוד, ה-header הוא הכותרת בגיליון. */
export const ITEM_COLUMNS = [
  { key: "catalogNumber", header: "מספר קטלוגי" },
  { key: "title", header: "כותר" },
  { key: "author", header: "מחבר" },
  { key: "publisher", header: "מו״ל", lookup: "מו״לים" },
  { key: "placeOfPrint", header: "מקום דפוס" },
  { key: "hebrewYear", header: "שנה עברית" },
  { key: "gregorianYear", header: "שנה לועזית" },
  { key: "edition", header: "מהדורה" },
  { key: "language", header: "שפה" },
  { key: "itemType", header: "סוג פריט" },
  { key: "shelf", header: "מדף", lookup: "מדפים" },
  { key: "topic", header: "נושא", lookup: "נושאים" },
  { key: "collection", header: "אוסף", lookup: "אוספים" },
  { key: "physicalDescription", header: "תיאור פיזי" },
  { key: "condition", header: "מצב" },
  { key: "tags", header: "תגיות" },
  { key: "isbn", header: "ISBN" },
  { key: "externalCatalog", header: "מס׳ קטלוג חיצוני" },
  { key: "notes", header: "הערות / אחר" },
  { key: "imageUrl", header: "קישור תמונה" },
  { key: "createdAt", header: "נוצר בתאריך" },
] as const;

export type ItemColumnKey = (typeof ITEM_COLUMNS)[number]["key"];

/** רשומת פריט כפי שהאפליקציה עובדת איתה. */
export type Item = Partial<Record<ItemColumnKey, string>>;

/** לשוניות-עזר (Lookup) עם ערכי זריעה ראשוניים. */
export const LOOKUP_SHEETS: Record<string, string[]> = {
  "נושאים": [
    "תורני / חסידות / חב״ד",
    "תורני / הלכה",
    "תורני / מחשבה",
    "כללי / היסטוריה",
    "כללי / היסטוריה / יהדות מזרח",
    "כללי / ספרות",
  ],
  "מדפים": ["מדף 1", "מדף 2", "מדף 3"],
  "מו״לים": [],
  "אוספים": ["ספרייה כללית", "אוסף מחקר נדיר"],
};

/** רשימות ערכים סגורות (לא לשוניות נפרדות). */
export const ENUMS: Record<string, string[]> = {
  "סוג פריט": ["ספר", "חוברת", "עלון", "דבר דפוס"],
  "מצב": ["מצוין", "טוב", "בינוני", "ירוד"],
  "שפה": ["עברית", "אנגלית", "יידיש", "אחר"],
};

/**
 * לשונית הגדרות: קידומות המספור הקטלוגי.
 * מבנה מספר: <קידומת>-<מספר רץ 4 ספרות>, מתקדם בנפרד לכל קידומת.
 */
export const SETTINGS_SHEET = "הגדרות";
export const CATALOG_PREFIXES = [
  { prefix: "ת", label: "תורני" },
  { prefix: "כ", label: "כללי" },
];

/** בונה מספר קטלוגי מקידומת ומספר רץ: buildCatalogNumber("ת", 1) => "ת-0001" */
export function buildCatalogNumber(prefix: string, running: number): string {
  return `${prefix}-${String(running).padStart(4, "0")}`;
}
