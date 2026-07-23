/**
 * קטלוג ספרים — שרת Apps Script (צמוד לגיליון).
 * מספק API ל-JSON לאתר הסטטי ב-GitHub Pages: קריאה, הוספה, עדכון ומחיקה.
 *
 * הקמה חד-פעמית:
 *   1. פתח את הגיליון ← Extensions ← Apps Script.
 *   2. הדבק את כל הקובץ הזה, שמור.
 *   3. הרץ פעם אחת את הפונקציה initSheet (אשר הרשאות כשמבקשים).
 *   4. Deploy ← New deployment ← type: Web app ← Execute as: Me ←
 *      Who has access: Anyone ← Deploy. העתק את כתובת ה-Web app URL.
 */

// ===== מבנה הגיליון (מקור אמת יחיד) =====
var ITEMS_SHEET = 'פריטים';
var SETTINGS_SHEET = 'הגדרות';

var ITEM_HEADERS = [
  'מספר קטלוגי', 'כותר', 'מחבר', 'מו״ל', 'מקום דפוס', 'שנה עברית', 'שנה לועזית',
  'מהדורה', 'שפה', 'סוג פריט', 'מדף', 'נושא', 'אוסף', 'תיאור פיזי', 'מצב',
  'תגיות', 'ISBN', 'מס׳ קטלוג חיצוני', 'הערות / אחר', 'קישור תמונה', 'נוצר בתאריך'
];

// המפתחות באנגלית תואמים לסדר הכותרות (משמשים ב-JSON מול האתר)
var ITEM_KEYS = [
  'catalogNumber', 'title', 'author', 'publisher', 'placeOfPrint', 'hebrewYear', 'gregorianYear',
  'edition', 'language', 'itemType', 'shelf', 'topic', 'collection', 'physicalDescription', 'condition',
  'tags', 'isbn', 'externalCatalog', 'notes', 'imageUrl', 'createdAt'
];

// לשוניות-עזר עם ערכי זריעה, ומיפוי לשדה שממנו מתמלאות אוטומטית
var LOOKUP_SEED = {
  'נושאים': ['תורני / חסידות / חב״ד', 'תורני / הלכה', 'תורני / מחשבה', 'כללי / היסטוריה', 'כללי / היסטוריה / יהדות מזרח', 'כללי / ספרות'],
  'מדפים': ['מדף 1', 'מדף 2', 'מדף 3'],
  'מו״לים': [],
  'אוספים': ['ספרייה כללית', 'אוסף מחקר נדיר']
};
// שדה הפריט ↔ לשונית-העזר שמתעדכנת ממנו
var LOOKUP_FIELD = { topic: 'נושאים', shelf: 'מדפים', publisher: 'מו״לים', collection: 'אוספים' };

var ENUMS = {
  itemType: ['ספר', 'חוברת', 'עלון', 'דבר דפוס'],
  condition: ['מצוין', 'טוב', 'בינוני', 'ירוד'],
  language: ['עברית', 'אנגלית', 'יידיש', 'אחר']
};

var PREFIXES = [
  { prefix: 'ת', label: 'תורני' },
  { prefix: 'כ', label: 'כללי' }
];

// ===== נקודות כניסה (HTTP) =====
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action === 'lookups') return json_(getLookups_());
  return json_({ items: getItems_() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'add') return json_({ ok: true, catalogNumber: addItem_(body.item) });
    if (body.action === 'update') { updateItem_(body.catalogNumber, body.item); return json_({ ok: true }); }
    if (body.action === 'delete') { deleteItem_(body.catalogNumber); return json_({ ok: true }); }
    if (body.action === 'upload') return json_(uploadImage_(body));
    return json_({ ok: false, error: 'פעולה לא מוכרת' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== לוגיקה =====
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function itemsSheet_() { return ss_().getSheetByName(ITEMS_SHEET); }

function getItems_() {
  var sh = itemsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, ITEM_KEYS.length).getValues();
  return values
    .filter(function (r) { return String(r[0]).trim() !== '' || String(r[1]).trim() !== ''; })
    .map(function (r) {
      var o = {};
      ITEM_KEYS.forEach(function (k, i) { o[k] = r[i] === null ? '' : String(r[i]); });
      return o;
    });
}

function addItem_(item) {
  var cat = nextCatalog_(item.prefix || 'ת');
  item.catalogNumber = cat;
  item.createdAt = new Date().toLocaleDateString('he-IL');
  syncLookups_(item);
  itemsSheet_().appendRow(ITEM_KEYS.map(function (k) { return item[k] || ''; }));
  return cat;
}

function updateItem_(catalogNumber, item) {
  var row = findRow_(catalogNumber);
  if (row < 0) throw 'פריט לא נמצא: ' + catalogNumber;
  item.catalogNumber = catalogNumber; // מזהה קבוע
  var existing = itemsSheet_().getRange(row, 1, 1, ITEM_KEYS.length).getValues()[0];
  item.createdAt = item.createdAt || existing[ITEM_KEYS.indexOf('createdAt')];
  syncLookups_(item);
  itemsSheet_().getRange(row, 1, 1, ITEM_KEYS.length)
    .setValues([ITEM_KEYS.map(function (k) { return item[k] || ''; })]);
}

function deleteItem_(catalogNumber) {
  var row = findRow_(catalogNumber);
  if (row < 0) throw 'פריט לא נמצא: ' + catalogNumber;
  itemsSheet_().deleteRow(row);
}

function findRow_(catalogNumber) {
  var sh = itemsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === String(catalogNumber).trim()) return i + 2;
  }
  return -1;
}

// מספר קטלוגי הבא לקידומת: <קידומת>-<4 ספרות>
function nextCatalog_(prefix) {
  var items = getItems_();
  var max = 0;
  var re = new RegExp('^' + prefix + '-(\\d+)$');
  items.forEach(function (it) {
    var m = re.exec(it.catalogNumber || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = String(max + 1);
  while (n.length < 4) n = '0' + n;
  return prefix + '-' + n;
}

// מוסיף ערכים חדשים ללשוניות-העזר כדי לשמור אחידות ורשימות נפתחות מתעדכנות
function syncLookups_(item) {
  Object.keys(LOOKUP_FIELD).forEach(function (field) {
    var val = (item[field] || '').trim();
    if (!val) return;
    var tab = LOOKUP_FIELD[field];
    var sh = ss_().getSheetByName(tab);
    if (!sh) return;
    var last = sh.getLastRow();
    var existing = last < 2 ? [] : sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); });
    if (existing.indexOf(val) === -1) sh.appendRow([val]);
  });
}

// ===== העלאת תמונות ל-Drive =====
// מזהה תיקיית התמונות שלך ב-Drive (מתוך כתובת התיקייה).
// השאר ריק ('') כדי שהסקריפט ייצור/ישתמש אוטומטית בתיקייה בשם למטה.
var FIXED_IMG_FOLDER_ID = '1g91_15fyHai4BNO4KnFG-8iWZpHnBJnr';
var IMG_FOLDER_NAME = 'תמונות קטלוג';

function getImageFolder_() {
  if (FIXED_IMG_FOLDER_ID) return DriveApp.getFolderById(FIXED_IMG_FOLDER_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('AUTO_IMG_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* נמחקה — ניצור מחדש */ }
  }
  var it = DriveApp.getFoldersByName(IMG_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(IMG_FOLDER_NAME);
  props.setProperty('AUTO_IMG_FOLDER_ID', folder.getId());
  return folder;
}

// הרץ פעם אחת בעורך כדי לאשר גישה ל-Drive וליצור את תיקיית התמונות.
function authorizeDrive() {
  var f = getImageFolder_();
  Logger.log('✓ תיקיית התמונות מוכנה: ' + f.getName() + ' (' + f.getId() + ')');
}

function uploadImage_(body) {
  if (!body.dataBase64) return { ok: false, error: 'לא התקבלה תמונה' };
  var folder = getImageFolder_();
  var bytes = Utilities.base64Decode(body.dataBase64);
  var blob = Utilities.newBlob(bytes, body.mimeType || 'image/jpeg', body.filename || ('scan_' + Date.now() + '.jpg'));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fid = file.getId();
  return { ok: true, fileId: fid, url: 'https://drive.google.com/file/d/' + fid + '/view' };
}

function getLookups_() {
  var out = { enums: ENUMS, prefixes: PREFIXES };
  Object.keys(LOOKUP_SEED).forEach(function (tab) {
    var sh = ss_().getSheetByName(tab);
    var vals = [];
    if (sh && sh.getLastRow() >= 2) {
      vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
        .map(function (r) { return String(r[0]).trim(); })
        .filter(function (v) { return v !== ''; });
    }
    out[tab] = vals;
  });
  return out;
}

// ===== הקמה חד-פעמית =====
function initSheet() {
  var ss = ss_();
  function ensure(name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

  // לשונית ראשית + כותרות
  var items = ensure(ITEMS_SHEET);
  items.getRange(1, 1, 1, ITEM_HEADERS.length).setValues([ITEM_HEADERS]).setFontWeight('bold');
  items.setFrozenRows(1);

  // לשוניות-עזר + זריעה
  Object.keys(LOOKUP_SEED).forEach(function (tab) {
    var sh = ensure(tab);
    sh.getRange(1, 1).setValue(tab).setFontWeight('bold');
    var vals = LOOKUP_SEED[tab];
    if (vals.length) sh.getRange(2, 1, vals.length, 1).setValues(vals.map(function (v) { return [v]; }));
  });

  // הגדרות: קידומות
  var settings = ensure(SETTINGS_SHEET);
  settings.getRange(1, 1, 1, 2).setValues([['קידומת', 'תיאור']]).setFontWeight('bold');
  settings.getRange(2, 1, PREFIXES.length, 2)
    .setValues(PREFIXES.map(function (p) { return [p.prefix, p.label]; }));

  // הסרת גיליון ברירת המחדל אם ריק ומיותר
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  SpreadsheetApp.getUi && Logger.log('✓ מבנה הגיליון הוקם.');
}
