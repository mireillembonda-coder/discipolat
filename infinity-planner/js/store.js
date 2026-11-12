// Données de l'agenda : gardées sur le téléphone (localStorage pour le texte,
// IndexedDB pour les images du vision board).
(function () {
  'use strict';
  var KEY = 'infinity-planner-v1';

  function blank() {
    return {
      v: 2,
      profile: { name: '', skin: 'rose', verse: true, started: false, weekLayout: 'vertical', devise: 'FCFA', owner: {} },
      view: 'parcours', step: 0, moisTab: 'objectifs',
      years: {}, months: {}, weeks: {}, days: {}
    };
  }

  // Ancienne version 0.1 -> 0.2
  function migrate(s) {
    if (!s || !s.profile) return blank();
    if (s.v === 2) return s;
    var n = blank();
    n.profile = Object.assign(n.profile, s.profile);
    Object.keys(s.days || {}).forEach(function (k) {
      var d = s.days[k], nd = { h: {}, d: {}, verse: d.verse || '', merci: d.merci || ['', '', ''], note: d.note || '' };
      (d.slots || []).forEach(function (sl) {
        if (!sl.t) return;
        var hr = parseInt((sl.h || '').slice(0, 2), 10);
        if (hr >= 6 && hr <= 22 && !nd.h[hr]) { nd.h[hr] = sl.t; nd.d[hr] = !!sl.d; }
        else nd.note = (nd.note ? nd.note + '\n' : '') + (sl.h ? sl.h + ' ' : '') + sl.t;
      });
      n.days[k] = nd;
    });
    Object.keys(s.week || {}).forEach(function (k) {
      var w = s.week[k], d = n.days[k] || (n.days[k] = { h: {}, d: {}, verse: '', merci: ['', '', ''], note: '' });
      var extra = [w.p && 'Priorité : ' + w.p, w.r && 'Rendez-vous : ' + w.r, w.n].filter(Boolean).join('\n');
      if (extra) d.note = (d.note ? d.note + '\n' : '') + extra;
    });
    Object.keys(s.months || {}).forEach(function (k) {
      var m = s.months[k];
      n.months[k] = { goals: (m.goals || []).filter(function (g) { return g.o; }).slice(0, 3).map(function (g) {
        return { t: g.o, why: '', reward: '', tasks: [g.a || '', '', '', ''], td: [false, false, false, false], ok: !!g.d };
      }) };
    });
    return n;
  }

  var S;
  try { S = migrate(JSON.parse(localStorage.getItem(KEY))); } catch (e) { S = blank(); }

  var timer = null;
  function saveNow() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { IP.toast && IP.toast("Enregistrement impossible : la mémoire du téléphone est peut-être pleine."); }
  }
  function save() { clearTimeout(timer); timer = setTimeout(saveNow, 250); }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // Lire / écrire par chemin : "years.2027.bilan.real"
  function get(path) {
    var o = S, p = path.split('.');
    for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
    return o;
  }
  function set(path, val) {
    var o = S, p = path.split('.');
    for (var i = 0; i < p.length - 1; i++) {
      if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {};
      o = o[p[i]];
    }
    o[p[p.length - 1]] = val;
    save();
  }

  // ---------- Images (vision board) ----------
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, ko) {
      var r = indexedDB.open('infinity-images', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('img'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ko(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, ko) {
        var t = d.transaction('img', mode), st = t.objectStore('img'), res = fn(st);
        t.oncomplete = function () { ok(res && res.result); };
        t.onerror = function () { ko(t.error); };
      });
    });
  }
  var images = {
    put: function (id, dataUrl) { return tx('readwrite', function (st) { st.put(dataUrl, id); }); },
    get: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
    del: function (id) { return tx('readwrite', function (st) { st.delete(id); }); },
    all: function () {
      return db().then(function (d) {
        return new Promise(function (ok) {
          var out = {}, c = d.transaction('img').objectStore('img').openCursor();
          c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else ok(out); };
          c.onerror = function () { ok(out); };
        });
      }).catch(function () { return {}; });
    },
    clear: function () { return tx('readwrite', function (st) { st.clear(); }); }
  };

  IP.store = {
    get state() { return S; },
    replace: function (s) { S = migrate(s); saveNow(); },
    reset: function () { var p = S.profile; S = blank(); S.profile = p; saveNow(); },
    blank: blank, get: get, set: set, save: save, saveNow: saveNow, images: images
  };
})();
