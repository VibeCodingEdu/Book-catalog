"use strict";

var URL_ = (window.CONFIG && window.CONFIG.APPS_SCRIPT_URL || "").trim();
var state = { items: [], lookups: null, editing: null, group: "" };
var $ = function (id) { return document.getElementById(id); };

/* ===== API ===== */
function apiGet(action) {
  return fetch(URL_ + "?action=" + encodeURIComponent(action)).then(function (r) { return r.json(); });
}
function apiPost(payload) {
  return fetch(URL_, { method: "POST", body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
}

/* ===== קבוצת צבע (אוסף) ===== */
function collGroup(it) {
  var c = it.collection || "";
  if (/נדיר/.test(c)) return "rare";
  if (/תורני/.test(c)) return "torani";
  if (/כללי/.test(c)) return "klali";
  var p = (it.catalogNumber || "").charAt(0);
  if (p === "ת") return "torani";
  if (p === "כ") return "klali";
  return "klali";
}
var GROUP_LABEL = { torani: "תורני", klali: "כללי", rare: "אוסף נדיר" };
function groupColor(g) { return g === "torani" ? "var(--c-torani)" : g === "klali" ? "var(--c-klali)" : "var(--c-rare)"; }

function driveThumb(url, size) {
  if (!url) return "";
  var m = /[-\w]{25,}/.exec(url);
  return m ? "https://drive.google.com/thumbnail?id=" + m[0] + "&sz=w" + (size || 200) : "";
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

/* ===== אתחול ===== */
function boot() {
  applyStoredTheme();
  if (!URL_) { $("loading").classList.add("hidden"); $("setup").classList.remove("hidden"); return; }
  Promise.all([apiGet("lookups"), apiGet("list")]).then(function (res) {
    state.lookups = res[0];
    state.items = (res[1] && res[1].items) || [];
    buildForm(); buildFilters(); render();
    $("loading").classList.add("hidden");
    $("toolbar").classList.remove("hidden");
    $("tableWrap").classList.remove("hidden");
    openFromUrl();
  }).catch(function (e) { $("loading").textContent = "שגיאה בטעינה: " + e; });
}

function fillSelect(sel, values, keepFirst) {
  var first = keepFirst ? sel.options[0] : null;
  sel.innerHTML = "";
  if (first) sel.appendChild(first);
  (values || []).forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
}
function setDatalist(id, values) {
  var dl = $(id); dl.innerHTML = "";
  (values || []).forEach(function (v) { var o = document.createElement("option"); o.value = v; dl.appendChild(o); });
}
function buildForm() {
  var L = state.lookups;
  fillSelect($("prefix"), L.prefixes.map(function (p) { return p.prefix; }));
  Array.prototype.forEach.call($("prefix").options, function (o) {
    var p = L.prefixes.filter(function (x) { return x.prefix === o.value; })[0];
    if (p) o.textContent = p.prefix + " — " + p.label;
  });
  fillSelect($("language"), L.enums.language);
  fillSelect($("itemType"), L.enums.itemType);
  fillSelect($("condition"), L.enums.condition);
  setDatalist("dl-publisher", L["מו״לים"]);
  setDatalist("dl-shelf", L["מדפים"]);
  setDatalist("dl-topic", L["נושאים"]);
  setDatalist("dl-collection", L["אוספים"]);
}
function buildFilters() {
  fillSelect($("fTopic"), state.lookups["נושאים"], true);
  fillSelect($("fShelf"), state.lookups["מדפים"], true);
}

/* ===== סינון ותצוגה ===== */
function filtered() {
  var q = $("search").value.trim().toLowerCase();
  var t = $("fTopic").value, s = $("fShelf").value, g = state.group;
  return state.items.filter(function (it) {
    if (g && collGroup(it) !== g) return false;
    if (t && it.topic !== t) return false;
    if (s && it.shelf !== s) return false;
    if (q) {
      var hay = [it.catalogNumber, it.title, it.author, it.publisher, it.tags, it.notes].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function thumbHtml(it) {
  var g = collGroup(it);
  var t = driveThumb(it.imageUrl, 120);
  if (t) return '<img class="thumb" loading="lazy" src="' + t + '" alt="" />';
  return '<span class="thumb coverbox ' + g + '"></span>';
}

function render() {
  var rows = $("rows"); rows.innerHTML = "";
  var list = filtered();
  $("count").textContent = list.length + " / " + state.items.length;
  $("empty").classList.toggle("hidden", state.items.length !== 0);
  list.forEach(function (it) {
    var g = collGroup(it);
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + thumbHtml(it) + "</td>" +
      '<td class="catcell">' + esc(it.catalogNumber) + "</td>" +
      '<td class="tt">' + esc(it.title) + "</td>" +
      "<td style='color:var(--muted)'>" + esc(it.author) + "</td>" +
      '<td class="yr">' + esc(it.hebrewYear || it.gregorianYear) + "</td>" +
      '<td><span class="coll-pill"><span class="dot" style="background:' + groupColor(g) + '"></span>' + esc(it.collection || GROUP_LABEL[g]) + "</span></td>" +
      "<td style='color:var(--muted)'>" + esc(it.topic) + "</td>" +
      '<td class="yr">' + esc(it.shelf) + "</td>";
    tr.addEventListener("click", function () { openDetail(it); });
    rows.appendChild(tr);
  });
}

/* ===== תצוגה מורחבת ===== */
function itemUrl(cat) { return location.origin + location.pathname + "?item=" + encodeURIComponent(cat); }

function field(k, v) {
  if (!v) return "";
  return '<div class="field"><div class="k">' + k + '</div><div class="v">' + esc(v) + "</div></div>";
}
function detailHtml(it) {
  var g = collGroup(it);
  var img = driveThumb(it.imageUrl, 600);
  var cover = img
    ? '<div class="detail-cover ' + g + '"><img src="' + img + '" alt="' + esc(it.title) + '" /></div>'
    : '<div class="detail-cover coverbox ' + g + '"><span style="align-self:flex-end;font-family:var(--font-mono);font-size:11px;color:#241a2e;background:rgba(255,255,255,.85);padding:2px 7px;border-radius:6px">' + esc(it.catalogNumber) + '</span><div class="ct">' + esc(it.title) + '</div><div class="cfoot">' + GROUP_LABEL[g] + "</div></div>";
  return '<div class="detail-grid">' + cover +
    "<div>" +
      '<div class="detail-cat">' + esc(it.catalogNumber) + "</div>" +
      '<div class="detail-title">' + esc(it.title) + "</div>" +
      '<div class="detail-author">' + esc(it.author || "—") + "</div>" +
      '<div class="fields">' +
        field("מו״ל", it.publisher) + field("מקום דפוס", it.placeOfPrint) +
        field("שנה עברית", it.hebrewYear) + field("שנה לועזית", it.gregorianYear) +
        field("מהדורה", it.edition) + field("שפה", it.language) +
        field("סוג", it.itemType) + field("מצב", it.condition) +
        field("מדף", it.shelf) + field("נושא", it.topic) +
        field("אוסף", it.collection) + field("תגיות", it.tags) +
        field("ISBN", it.isbn) + field("מס׳ קטלוג חיצוני", it.externalCatalog) +
        (it.physicalDescription ? '<div class="field wide"><div class="k">תיאור פיזי</div><div class="v">' + esc(it.physicalDescription) + "</div></div>" : "") +
        (it.notes ? '<div class="field wide"><div class="k">הערות</div><div class="v">' + esc(it.notes) + "</div></div>" : "") +
      "</div>" +
      '<div class="detail-actions">' +
        '<button class="btn" id="dEdit">עריכה</button>' +
        '<button class="btn danger" id="dDelete">מחיקה</button>' +
        '<span class="spacer"></span>' +
      "</div>" +
    "</div></div>";
}
function openDetail(it) {
  state.viewing = it;
  $("detailBody").innerHTML = detailHtml(it);
  $("detailOpenNew").onclick = function () { window.open(itemUrl(it.catalogNumber), "_blank", "noopener"); };
  $("dEdit").onclick = function () { $("detail").close(); openForm(it); };
  $("dDelete").onclick = function () { removeItem(it); };
  if (!$("detail").open) $("detail").showModal();
}
function openFromUrl() {
  var m = /[?&]item=([^&]+)/.exec(location.search);
  if (!m) return;
  var cat = decodeURIComponent(m[1]);
  var it = state.items.filter(function (x) { return x.catalogNumber === cat; })[0];
  if (it) openDetail(it);
}

/* ===== תמונות ===== */
function setImagePreview(url) {
  var link = $("imgPreviewLink"), img = $("imgPreview"), clear = $("imgClear");
  $("imageUrl").value = url || "";
  var t = driveThumb(url, 200);
  if (t) { img.src = t; link.href = url; link.classList.remove("hidden"); clear.classList.remove("hidden"); }
  else { img.removeAttribute("src"); link.classList.add("hidden"); clear.classList.add("hidden"); }
}
function scaleToJpeg(file, maxDim) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, scale = Math.min(1, maxDim / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}
function onImageChosen() {
  var input = $("imgInput"), file = input.files && input.files[0];
  if (!file) return;
  var status = $("imgStatus"); status.textContent = "מקטין ומעלה…";
  scaleToJpeg(file, 1600)
    .then(function (d) { return apiPost({ action: "upload", filename: "scan_" + Date.now() + ".jpg", mimeType: "image/jpeg", dataBase64: d.split(",")[1] }); })
    .then(function (res) { if (!res || res.ok === false) throw (res && res.error) || "העלאה נכשלה"; setImagePreview(res.url); status.textContent = "הועלתה ✓"; })
    .catch(function (err) { status.textContent = "שגיאה: " + err; })
    .then(function () { input.value = ""; });
}

/* ===== טופס ===== */
function openForm(item) {
  state.editing = item || null;
  var f = $("form"); f.reset();
  $("formError").classList.add("hidden");
  $("imgStatus").textContent = "";
  setImagePreview(item ? item.imageUrl : "");
  if (item) {
    $("formTitle").textContent = "עריכת פריט";
    $("editingCat").textContent = "מספר קטלוגי: " + item.catalogNumber;
    $("prefix").disabled = true;
    Object.keys(item).forEach(function (k) { if (f.elements[k]) f.elements[k].value = item[k]; });
  } else {
    $("formTitle").textContent = "פריט חדש";
    $("editingCat").textContent = "";
    $("prefix").disabled = false;
  }
  $("dialog").showModal();
}
function submitForm(ev) {
  ev.preventDefault();
  var f = $("form"), item = {};
  Array.prototype.forEach.call(f.elements, function (el) { if (el.name) item[el.name] = el.value.trim(); });
  $("saveBtn").disabled = true;
  var req = state.editing
    ? apiPost({ action: "update", catalogNumber: state.editing.catalogNumber, item: item })
    : apiPost({ action: "add", item: item });
  req.then(function (res) {
    $("saveBtn").disabled = false;
    if (!res || res.ok === false) throw (res && res.error) || "שגיאה לא ידועה";
    $("dialog").close();
    return refresh();
  }).catch(function (e) {
    $("saveBtn").disabled = false;
    var err = $("formError"); err.textContent = "שמירה נכשלה: " + e; err.classList.remove("hidden");
  });
}
function removeItem(it) {
  if (!confirm('למחוק את "' + (it.title || it.catalogNumber) + '"?')) return;
  apiPost({ action: "delete", catalogNumber: it.catalogNumber }).then(function (res) {
    if (!res || res.ok === false) throw (res && res.error) || "שגיאה";
    if ($("detail").open) $("detail").close();
    return refresh();
  }).catch(function (e) { alert("מחיקה נכשלה: " + e); });
}
function refresh() {
  return Promise.all([apiGet("lookups"), apiGet("list")]).then(function (res) {
    state.lookups = res[0]; state.items = (res[1] && res[1].items) || [];
    buildForm(); buildFilters(); render();
  });
}

/* ===== ערכת נושא ===== */
function applyStoredTheme() {
  var t = null;
  try { t = localStorage.getItem("theme"); } catch (e) {}
  if (t) document.documentElement.setAttribute("data-theme", t);
  updateThemeIcon();
}
function isDark() {
  var root = document.documentElement, a = root.getAttribute("data-theme");
  if (a) return a === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}
function updateThemeIcon() {
  var dark = isDark();
  $("themeBtn").innerHTML = dark
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
}

/* ===== אירועים ===== */
document.addEventListener("DOMContentLoaded", function () {
  $("addBtn").addEventListener("click", function () { openForm(null); });
  $("cancelBtn").addEventListener("click", function () { $("dialog").close(); });
  $("form").addEventListener("submit", submitForm);
  $("imgInput").addEventListener("change", onImageChosen);
  $("imgClear").addEventListener("click", function () { setImagePreview(""); $("imgStatus").textContent = ""; });
  $("detailClose").addEventListener("click", function () { $("detail").close(); });
  ["search", "fTopic", "fShelf"].forEach(function (id) { $(id).addEventListener("input", render); });
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    Array.prototype.forEach.call($("chips").children, function (c) { c.classList.remove("active"); });
    b.classList.add("active"); state.group = b.dataset.group; render();
  });
  $("themeBtn").addEventListener("click", function () {
    var dark = !isDark();
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    updateThemeIcon();
  });
  boot();
});
