// Petits outils d'affichage partagés par tous les écrans.
(function () {
  'use strict';
  var st = IP.store;

  var e = IP.e = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  var uid = 0;
  function id(path) { return 'f' + (++uid) + '-' + path.replace(/[^a-z0-9]/gi, '-'); }
  function val(path) { var v = st.get(path); return v == null ? '' : v; }

  // ---------- Dates ----------
  IP.today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  IP.iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  IP.fromIso = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); };
  IP.mkey = function (d) { return IP.iso(d).slice(0, 7); };
  IP.monday = function (d) { var x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
  IP.addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  IP.fmt = {
    month: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }),
    monthOnly: new Intl.DateTimeFormat('fr-FR', { month: 'long' }),
    day: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    short: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }),
    dm: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }),
    num: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
  };
  IP.HOURS = []; for (var h = 6; h <= 22; h++) IP.HOURS.push(h);

  // ---------- Champs reliés aux données (data-bind) ----------
  IP.inp = function (path, ph, cls, type) {
    return '<input type="' + (type || 'text') + '" id="' + id(path) + '" class="' + (cls || '') + '" placeholder="' + e(ph || '') + '" value="' + e(val(path)) + '" data-bind="' + path + '" aria-label="' + e(ph || '') + '">';
  };
  IP.area = function (path, ph, rows) {
    return '<textarea id="' + id(path) + '" rows="' + (rows || 3) + '" placeholder="' + e(ph || '') + '" data-bind="' + path + '" aria-label="' + e(ph || '') + '">' + e(val(path)) + '</textarea>';
  };
  IP.chk = function (path, label) {
    return '<input type="checkbox" id="' + id(path) + '" data-bind="' + path + '" aria-label="' + e(label || 'Fait') + '"' + (st.get(path) ? ' checked' : '') + '>';
  };

  // Liste numérotée : 1 ____ 2 ____
  IP.numList = function (base, n, ph) {
    var out = '<div class="card list">';
    for (var i = 0; i < n; i++) out += '<div class="lrow"><span class="num">' + (i + 1) + '</span>' + IP.inp(base + '.' + i, ph || '') + '</div>';
    return out + '</div>';
  };
  // Deux colonnes du planner (ex. « Compétences » / « Comment et de qui ») : sur téléphone, l'une sous l'autre.
  // Deux colonnes du planner côte à côte (ex. « Compétences » | « Comment et de qui »), comme sur le papier.
  IP.twoCol = function (baseA, baseB, n, la, lb) {
    var out = '<div class="card two"><div class="twohead"><span>' + e(la) + '</span><span>' + e(lb) + '</span></div>';
    for (var i = 0; i < n; i++) {
      out += '<div class="tworow"><span class="num">' + (i + 1) + '</span>' + IP.inp(baseA + '.' + i, '') + '<span class="sq" aria-hidden="true"></span>' + IP.inp(baseB + '.' + i, '') + '</div>';
    }
    return out + '</div>';
  };
  IP.ribbon = function (t) { return '<h2 class="ribbon"><span>' + e(t) + '</span></h2>'; };
  IP.block = function (title, body, opts) {
    opts = opts || {};
    var head = '<h3 class="bhead">' + (opts.icon ? '<span class="bicon" aria-hidden="true">' + opts.icon + '</span>' : '') + '<span>' + e(title) + '</span></h3>';
    var sub = opts.sub ? '<p class="bsub">' + opts.sub + '</p>' : '';
    if (opts.fold) return '<details class="sec fold"' + (opts.open ? ' open' : '') + '><summary>' + head + '</summary>' + sub + body + '</details>';
    return '<section class="sec">' + head + sub + body + '</section>';
  };
  IP.quote = function (q) { return q ? '<figure class="quote"><blockquote>« ' + e(q[0]) + ' »</blockquote><figcaption>' + e(q[1]) + '</figcaption></figure>' : ''; };

  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  IP.bind = function (root, onChange) {
    root.querySelectorAll('[data-bind]').forEach(function (inp) {
      var path = inp.getAttribute('data-bind');
      if (inp.tagName === 'TEXTAREA') grow(inp);
      var ev = (inp.type === 'checkbox' || inp.type === 'range' || inp.tagName === 'SELECT' || inp.type === 'date') ? 'change' : 'input';
      if (inp.type === 'range') inp.addEventListener('input', function () { var o = inp.parentNode.querySelector('output'); if (o) o.textContent = inp.value; });
      inp.addEventListener(ev, function () {
        var v = inp.type === 'checkbox' ? inp.checked : (inp.type === 'range' ? +inp.value : inp.value);
        st.set(path, v);
        if (inp.tagName === 'TEXTAREA') grow(inp);
        if (inp.type === 'checkbox') { var r = inp.closest('.done-able'); if (r) r.classList.toggle('done', inp.checked); }
        if (onChange) onChange(path, v, inp);
      });
    });
    root.querySelectorAll('textarea').forEach(function (t) { if (!t.dataset.bind) grow(t); });
  };

  // ---------- Messages ----------
  var tt;
  IP.toast = function (msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 2800);
  };

  // ---------- Minuteur 90 secondes (étape 2) ----------
  IP.timer = function (btn, secs) {
    if (btn._t) { clearInterval(btn._t); btn._t = null; btn.textContent = '⏱ ' + secs + ' s'; btn.classList.remove('on'); return; }
    var left = secs; btn.classList.add('on'); btn.textContent = '⏱ ' + left + ' s';
    btn._t = setInterval(function () {
      left--; btn.textContent = '⏱ ' + left + ' s';
      if (left <= 0) {
        clearInterval(btn._t); btn._t = null; btn.classList.remove('on'); btn.textContent = '✓ Temps écoulé';
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }, 1000);
  };

  // Verset du jour (Louis Segond) et citation de la semaine
  IP.verseFor = function (d) {
    var V = window.VERSETS || []; if (!V.length) return ['', ''];
    var n = Math.floor((d - new Date(2025, 0, 1)) / 864e5);
    return V[((n % V.length) + V.length) % V.length];
  };
  IP.quoteForWeek = function (mon) {
    var n = Math.floor((mon - new Date(2025, 0, 6)) / (7 * 864e5)), Q = IP.CITATIONS;
    return Q[((n % Q.length) + Q.length) % Q.length];
  };
  IP.quoteForMonth = function (d) {
    var Q = IP.CITATIONS_MOIS, n = d.getFullYear() * 12 + d.getMonth();
    return Q[n % Q.length];
  };

  // Réduit une photo avant de la garder (pour ne pas remplir le téléphone)
  IP.shrinkImage = function (file, max) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, (max || 1200) / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = ko; img.src = r.result;
      };
      r.onerror = ko; r.readAsDataURL(file);
    });
  };
})();
