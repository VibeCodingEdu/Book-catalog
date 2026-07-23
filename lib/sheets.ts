/**
 * לקוח Google Sheets — מבוסס חשבון שירות (Service Account).
 * קורא הרשאות מ-GOOGLE_SERVICE_ACCOUNT_JSON (או קובץ) ומחזיר מופע sheets.
 */
import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { ITEMS_SHEET, ITEM_COLUMNS, type Item } from "./schema";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

function loadCredentials() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) return JSON.parse(inline);
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  throw new Error(
    "חסרות הרשאות גוגל: הגדר GOOGLE_SERVICE_ACCOUNT_JSON או GOOGLE_SERVICE_ACCOUNT_KEY_FILE ב-.env"
  );
}

export function getAuth() {
  const credentials = loadCredentials();
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

function sheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("חסר GOOGLE_SHEET_ID ב-.env");
  return id;
}

/** ממיר שורת ערכים לאובייקט Item לפי סדר העמודות. */
function rowToItem(row: string[]): Item {
  const item: Item = {};
  ITEM_COLUMNS.forEach((col, i) => {
    item[col.key] = row[i] ?? "";
  });
  return item;
}

/** ממיר Item למערך ערכים לפי סדר העמודות. */
export function itemToRow(item: Item): string[] {
  return ITEM_COLUMNS.map((col) => item[col.key] ?? "");
}

/** מחזיר את כל הפריטים מהלשונית הראשית (ללא שורת הכותרת). */
export async function listItems(): Promise<Item[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${ITEMS_SHEET}!A2:Z`,
  });
  const rows = res.data.values ?? [];
  return rows.filter((r) => r.length > 0).map(rowToItem);
}

/** מוסיף פריט חדש בסוף הלשונית. */
export async function appendItem(item: Item): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${ITEMS_SHEET}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [itemToRow(item)] },
  });
}
