// Démarrage, navigation, réglages, sauvegarde.
(function () {
  'use strict';
  var st = IP.store, e = IP.e, root = document.documentElement;
  var view = document.getElementById('view'), title = document.getElementById('navtitle');

  IP.cursor = IP.today();

  // Année du parcours : à partir de novembre, on prépare l'année suivante.
  IP.year = function () {
    var s = st.state; if (s.year) return s.year;
    var t = IP.today(); return t.getMonth() >= 10 ? t.getFullYear() + 1 : t.getFullYear();
  };

  IP.go = function (v, step) {
    var s = st.state; s.view = v; if (v === 'parcours') s.step = step || 0; st.save(); IP.render(); view.scrollTop = 0;
  };

  IP.render = function () {
    var s = st.state, v = s.view || 'parcours';
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.view === v ? 'true' : 'false'); });
    var back = document.getElementById('back');
    back.hidden = !(v === 'parcours' && s.step);
    if (v === 'parcours') { title.textContent = IP.parcours.title(); IP.parcours.render(view); }
    else {
      var c = IP.cursor;
      title.textContent = v === 'mois' ? IP.fmt.month.format(c) : v === 'semaine' ? 'Semaine du ' + IP.fmt.dm.format(IP.monday(c)) : IP.fmt.day.format(c);
      IP.agenda[v](view);
    }
    document.getElementById('today').hidden = v === 'parcours';
  };

  function step(n) {
    var s = st.state, v = s.view;
    if (v === 'parcours') {
      if (s.step) { s.step = Math.min(8, Math.max(1, s.step + n)); }
      else { s.year = IP.year() + n; }
      st.save();
    }
    else if (v === 'mois') IP.cursor = new Date(IP.cursor.getFullYear(), IP.cursor.getMonth() + n, 1);
    else if (v === 'semaine') IP.cursor = IP.addDays(IP.cursor, 7 * n);
    else IP.cursor = IP.addDays(IP.cursor, n);
    IP.render(); view.scrollTop = 0;
  }
  document.getElementById('prev').addEventListener('click', function () { step(-1); });
  document.getElementById('next').addEventListener('click', function () { step(1); });
  document.getElementById('back').addEventListener('click', function () { IP.go('parcours', 0); });
  document.getElementById('today').addEventListener('click', function () { IP.cursor = IP.today(); IP.render(); view.scrollTop = 0; });
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { IP.go(t.dataset.view, t.dataset.view === 'parcours' ? 0 : undefined); });
  });

  // Glisser pour changer de jour / semaine / mois (pas dans le tableau de la semaine, qui défile sur le côté)
  var sx = null, sy = null;
  view.addEventListener('touchstart', function (ev) {
    if (ev.touches.length !== 1 || ev.target.closest('.scroll-x')) { sx = null; return; }
    sx = ev.touches[0].clientX; sy = ev.touches[0].clientY;
  }, { passive: true });
  view.addEventListener('touchend', function (ev) {
    if (sx === null) return;
    var dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy; sx = null;
    if (st.state.view === 'parcours' && !st.state.step) return;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // ---------- Version rose / bleue ----------
  function setSkin(v) {
    st.state.profile.skin = v; root.setAttribute('data-skin', v); st.save();
    document.querySelectorAll('.skinbtn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = v === 'bleu' ? '#1F5FA8' : '#B76E5F';
  }
  document.querySelectorAll('.skinbtn').forEach(function (b) { b.addEventListener('click', function () { setSkin(b.dataset.v); }); });

  // ---------- Bienvenue ----------
  var welcome = document.getElementById('welcome');
  document.getElementById('welcomeForm').addEventListener('submit', function (ev) {
    ev.preventDefault(); var p = st.state.profile;
    p.name = document.getElementById('wName').value.trim(); p.started = true; st.saveNow(); welcome.hidden = true; IP.render();
  });

  // ---------- Réglages ----------
  var settings = document.getElementById('settings');
  function openSettings() {
    var p = st.state.profile;
    document.getElementById('sName').value = p.name || '';
    document.getElementById('sVerse').checked = !!p.verse;
    document.getElementById('sDevise').value = p.devise || '';
    document.getElementById('sLayout').value = p.weekLayout || 'vertical';
    ['nom', 'tel', 'mail', 'contacts'].forEach(function (k) { document.getElementById('o-' + k).value = (p.owner || {})[k] || ''; });
    document.getElementById('wipeConfirm').hidden = true;
    settings.hidden = false;
  }
  function closeSettings() { settings.hidden = true; IP.render(); }
  document.getElementById('openSettings').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  settings.addEventListener('click', function (ev) { if (ev.target === settings) closeSettings(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !settings.hidden) closeSettings(); });
  function onSet(id, fn) { document.getElementById(id).addEventListener('input', function (ev) { fn(ev.target); st.save(); }); }
  onSet('sName', function (t) { st.state.profile.name = t.value.trim(); });
  onSet('sDevise', function (t) { st.state.profile.devise = t.value.trim(); });
  document.getElementById('sVerse').addEventListener('change', function (ev) { st.state.profile.verse = ev.target.checked; st.save(); });
  document.getElementById('sLayout').addEventListener('change', function (ev) { st.state.profile.weekLayout = ev.target.value; st.save(); });
  ['nom', 'tel', 'mail', 'contacts'].forEach(function (k) {
    onSet('o-' + k, function (t) { var p = st.state.profile; p.owner = p.owner || {}; p.owner[k] = t.value; });
  });

  // Sauvegarde dans un fichier (texte + photos du vision board)
  document.getElementById('exportBtn').addEventListener('click', function () {
    st.saveNow();
    st.images.all().then(function (imgs) {
      var blob = new Blob([JSON.stringify({ infinity: 2, state: st.state, images: imgs })], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'infinity-sauvegarde-' + IP.iso(IP.today()) + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      IP.toast('Sauvegarde enregistrée dans vos téléchargements.');
    });
  });
  var fileIn = document.getElementById('importFile');
  document.getElementById('importBtn').addEventListener('click', function () { fileIn.click(); });
  fileIn.addEventListener('change', function () {
    var f = fileIn.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result), state = data.infinity ? data.state : data;
        if (!state || !state.profile) throw 0;
        st.replace(state); st.state.profile.started = true; st.saveNow();
        var imgs = data.images || {};
        Promise.all(Object.keys(imgs).map(function (k) { return st.images.put(k, imgs[k]); })).then(function () {
          setSkin(st.state.profile.skin || 'rose'); openSettings(); IP.toast('Sauvegarde restaurée.');
        });
      } catch (err) { IP.toast("Ce fichier n'est pas une sauvegarde Infinity."); }
      fileIn.value = '';
    };
    r.readAsText(f);
  });
  document.getElementById('wipeBtn').addEventListener('click', function () { document.getElementById('wipeConfirm').hidden = false; });
  document.getElementById('wipeNo').addEventListener('click', function () { document.getElementById('wipeConfirm').hidden = true; });
  document.getElementById('wipeYes').addEventListener('click', function () {
    st.reset(); st.images.clear().catch(function () {}); IP.cursor = IP.today(); closeSettings(); IP.toast("L'agenda a été effacé.");
  });

  // ---------- Installation ----------
  var installPrompt = null, installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); installPrompt = ev; installBtn.hidden = false; });
  installBtn.addEventListener('click', function () { if (!installPrompt) return; installPrompt.prompt(); installPrompt.userChoice.then(function () { installPrompt = null; installBtn.hidden = true; }); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  var lastDay = IP.iso(IP.today());
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && IP.iso(IP.today()) !== lastDay) { lastDay = IP.iso(IP.today()); IP.cursor = IP.today(); IP.render(); }
  });

  // ---------- Démarrage ----------
  setSkin(st.state.profile.skin || 'rose');
  IP.render();
  if (!st.state.profile.started) welcome.hidden = false;
})();
