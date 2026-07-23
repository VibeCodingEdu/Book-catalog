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

// מזהה קובץ Drive מתוך קישור, לבניית תמונה ממוזערת
function driveThumb(url) {
  if (!url) return "";
  var m = /[-\w]{25,}/.exec(url);
  return m ? "https://drive.google.com/thumbnail?id=" + m[0] + "&sz=w200" : "";
}

function render() {
  var rows = $("rows"); rows.innerHTML = "";
  var list = filtered();
  $("count").textContent = list.length + " מתוך " + state.items.length + " פריטים";
  $("empty").classList.toggle("hidden", state.items.length !== 0);

  list.forEach(function (it) {
    var tr = document.createElement("tr");

    var thumbTd = document.createElement("td");
    var t = driveThumb(it.imageUrl);
    if (t) {
      var a = document.createElement("a");
      a.href = it.imageUrl; a.target = "_blank"; a.rel = "noopener";
      var img = document.createElement("img");
      img.src = t; img.className = "thumb"; img.alt = "תמונה"; img.loading = "lazy";
      a.appendChild(img); thumbTd.appendChild(a);
    }
    tr.appendChild(thumbTd);

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

// ===== תמונות =====
function setImagePreview(url) {
  var link = $("imgPreviewLink"), img = $("imgPreview"), clear = $("imgClear");
  $("imageUrl").value = url || "";
  var t = driveThumb(url);
  if (t) {
    img.src = t; link.href = url;
    link.classList.remove("hidden"); clear.classList.remove("hidden");
  } else {
    img.removeAttribute("src");
    link.classList.add("hidden"); clear.classList.add("hidden");
  }
}

// קריאת קובץ, הקטנה ל-maxDim, והחזרת JPEG כ-dataURL
function scaleToJpeg(file, maxDim) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function onImageChosen() {
  var input = $("imgInput");
  var file = input.files && input.files[0];
  if (!file) return;
  var status = $("imgStatus");
  status.textContent = "מקטין ומעלה…";
  scaleToJpeg(file, 1600)
    .then(function (dataUrl) {
      return apiPost({
        action: "upload",
        filename: "scan_" + Date.now() + ".jpg",
        mimeType: "image/jpeg",
        dataBase64: dataUrl.split(",")[1]
      });
    })
    .then(function (res) {
      if (!res || res.ok === false) throw (res && res.error) || "העלאה נכשלה";
      setImagePreview(res.url);
      status.textContent = "הועלתה ✓";
    })
    .catch(function (err) { status.textContent = "שגיאה: " + err; })
    .then(function () { input.value = ""; });
}

// ===== טופס הוספה/עריכה =====
function openForm(item) {
  state.editing = item || null;
  var f = $("form");
  f.reset();
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
  $("imgInput").addEventListener("change", onImageChosen);
  $("imgClear").addEventListener("click", function () {
    setImagePreview(""); $("imgStatus").textContent = "";
  });
  ["search", "fTopic", "fShelf", "fCollection"].forEach(function (id) {
    $(id).addEventListener("input", render);
  });
  boot();
});
