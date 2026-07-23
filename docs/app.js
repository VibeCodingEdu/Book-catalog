"use strict";

var URL_ = (window.CONFIG && window.CONFIG.APPS_SCRIPT_URL || "").trim();
var state = { items: [], lookups: null, editing: null };

var $ = function (id) { return document.getElementById(id); };

// ===== קריאה/כתיבה מול Apps Script =====
function apiGet(action) {
  return fetch(URL_ + "?action=" + encodeURIComponent(action)).then(function (r) { return r.json(); });
}
function apiPost(payload) {
  // ללא Content-Type מפורש → הדפדפן שולח text/plain ונמנע מ-preflight (CORS)
  return fetch(URL_, { method: "POST", body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
}

// ===== אתחול =====
function boot() {
  if (!URL_) {
    $("loading").classList.add("hidden");
    $("setup").classList.remove("hidden");
    return;
  }
  Promise.all([apiGet("lookups"), apiGet("list")])
    .then(function (res) {
      state.lookups = res[0];
      state.items = (res[1] && res[1].items) || [];
      buildForm();
      buildFilters();
      render();
      $("loading").classList.add("hidden");
      ["toolbar", "tableWrap"].forEach(function (id) { $(id).classList.remove("hidden"); });
    })
    .catch(function (e) {
      $("loading").textContent = "שגיאה בטעינה: " + e;
    });
}

// ===== בניית רשימות בטופס ובסינון =====
function fillSelect(sel, values, keepFirst) {
  var first = keepFirst ? sel.options[0] : null;
  sel.innerHTML = "";
  if (first) sel.appendChild(first);
  values.forEach(function (v) {
    var o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

function buildForm() {
  var L = state.lookups;
  fillSelect($("prefix"), L.prefixes.map(function (p) { return p.prefix; }));
  // הצגת תווית ליד הקידומת
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
function setDatalist(id, values) {
  var dl = $(id); dl.innerHTML = "";
  (values || []).forEach(function (v) {
    var o = document.createElement("option"); o.value = v; dl.appendChild(o);
  });
}

function buildFilters() {
  var L = state.lookups;
  fillSelect($("fTopic"), L["נושאים"], true);
  fillSelect($("fShelf"), L["מדפים"], true);
  fillSelect($("fCollection"), L["אוספים"], true);
}

// ===== סינון ותצוגה =====
function filtered() {
  var q = $("search").value.trim().toLowerCase();
  var t = $("fTopic").value, s = $("fShelf").value, c = $("fCollection").value;
  return state.items.filter(function (it) {
    if (t && it.topic !== t) return false;
    if (s && it.shelf !== s) return false;
    if (c && it.collection !== c) return false;
    if (q) {
      var hay = [it.catalogNumber, it.title, it.author, it.publisher, it.tags, it.notes].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function render() {
  var rows = $("rows"); rows.innerHTML = "";
  var list = filtered();
  $("count").textContent = list.length + " מתוך " + state.items.length + " פריטים";
  $("empty").classList.toggle("hidden", state.items.length !== 0);

  list.forEach(function (it) {
    var tr = document.createElement("tr");
    tr.appendChild(td(it.catalogNumber));
    tr.appendChild(td(it.title, "title"));
    tr.appendChild(td(it.author));
    tr.appendChild(td(it.publisher));
    tr.appendChild(td(it.hebrewYear || it.gregorianYear));
    tr.appendChild(td(it.topic));
    tr.appendChild(td(it.shelf));
    tr.appendChild(td(it.collection));

    var actions = document.createElement("td");
    var wrap = document.createElement("div"); wrap.className = "row-actions";
    wrap.appendChild(mkBtn("עריכה", "link", function () { openForm(it); }));
    wrap.appendChild(mkBtn("מחיקה", "link danger", function () { removeItem(it); }));
    actions.appendChild(wrap);
    tr.appendChild(actions);
    rows.appendChild(tr);
  });
}
function td(text, cls) {
  var el = document.createElement("td");
  el.textContent = text || "";
  if (cls) el.className = cls;
  return el;
}
function mkBtn(label, cls, fn) {
  var b = document.createElement("button");
  b.type = "button"; b.className = "btn " + cls; b.textContent = label;
  b.addEventListener("click", fn);
  return b;
}

// ===== טופס הוספה/עריכה =====
function openForm(item) {
  state.editing = item || null;
  var f = $("form");
  f.reset();
  $("formError").classList.add("hidden");
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
  var f = $("form");
  var item = {};
  Array.prototype.forEach.call(f.elements, function (el) {
    if (el.name) item[el.name] = el.value.trim();
  });
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
  apiPost({ action: "delete", catalogNumber: it.catalogNumber })
    .then(function (res) {
      if (!res || res.ok === false) throw (res && res.error) || "שגיאה";
      return refresh();
    })
    .catch(function (e) { alert("מחיקה נכשלה: " + e); });
}

function refresh() {
  return Promise.all([apiGet("lookups"), apiGet("list")]).then(function (res) {
    state.lookups = res[0];
    state.items = (res[1] && res[1].items) || [];
    buildForm(); buildFilters(); render();
  });
}

// ===== חיבור אירועים =====
document.addEventListener("DOMContentLoaded", function () {
  $("addBtn").addEventListener("click", function () { openForm(null); });
  $("cancelBtn").addEventListener("click", function () { $("dialog").close(); });
  $("form").addEventListener("submit", submitForm);
  ["search", "fTopic", "fShelf", "fCollection"].forEach(function (id) {
    $(id).addEventListener("input", render);
  });
  boot();
});
