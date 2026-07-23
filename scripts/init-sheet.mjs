/**
 * אתחול מבנה הגיליון: יוצר את הלשוניות, כותב כותרות וזורע ערכי ברירת מחדל.
 * הרצה: npm run init-sheet   (לאחר מילוי .env)
 *
 * הסקריפט אידמפוטנטי — מדלג על לשוניות שכבר קיימות.
 * דורש Node 22.6+ (לקריאת lib/schema.ts ישירות).
 */
import { google } from "googleapis";
import { readFileSync } from "node:fs";
import {
  ITEMS_SHEET,
  ITEM_COLUMNS,
  LOOKUP_SHEETS,
  SETTINGS_SHEET,
  CATALOG_PREFIXES,
} from "../lib/schema.ts";

function loadEnv() {
  // טעינה מינימלית של .env בלי תלות חיצונית
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* אין .env — נסתמך על משתני סביבה קיימים */
  }
}

function loadCredentials() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) return JSON.parse(inline);
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  throw new Error("חסרות הרשאות גוגל ב-.env (GOOGLE_SERVICE_ACCOUNT_JSON)");
}

async function main() {
  loadEnv();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("חסר GOOGLE_SHEET_ID ב-.env");

  const auth = new google.auth.GoogleAuth({
    credentials: loadCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // אילו לשוניות כבר קיימות?
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties.title)
  );

  const wanted = [
    ITEMS_SHEET,
    ...Object.keys(LOOKUP_SHEETS),
    SETTINGS_SHEET,
  ];
  const toCreate = wanted.filter((t) => !existing.has(t));

  if (toCreate.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    console.log("נוצרו לשוניות:", toCreate.join(", "));
  } else {
    console.log("כל הלשוניות כבר קיימות.");
  }

  // כותרות ללשונית הראשית
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ITEMS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [ITEM_COLUMNS.map((c) => c.header)] },
  });

  // זריעת לשוניות-עזר
  for (const [title, values] of Object.entries(LOOKUP_SHEETS)) {
    const rows = [[title], ...values.map((v) => [v])];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }

  // הגדרות: קידומות המספור
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SETTINGS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["קידומת", "תיאור"],
        ...CATALOG_PREFIXES.map((p) => [p.prefix, p.label]),
      ],
    },
  });

  console.log("✓ מבנה הגיליון מוכן.");
}

main().catch((e) => {
  console.error("שגיאה:", e.message);
  process.exit(1);
});
