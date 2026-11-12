// L'agenda : le mois, la semaine (colonnes verticales ou horizontales) et le jour.
(function () {
  'use strict';
  var st = IP.store, e = IP.e;

  // ================= MOIS =================
  var TABS = [['objectifs', 'Objectifs'], ['calendrier', 'Calendrier'], ['bilan', 'Évaluer'], ['finances', 'Finances']];

  function hasContent(k) {
    var d = st.state.days[k];
    return !!(d && ((d.h && Object.keys(d.h).some(function (h) { return d.h[h]; })) || d.note));
  }

  function moisObjectifs(M) {
    var c = IP.cursor, h = '<p class="script big center">' + e(IP.fmt.monthOnly.format(c)) + '</p>' + IP.quote(IP.quoteForMonth(c));
    h += IP.block('Intention de bien-être', IP.area(M + '.intention', 'Mon intention pour ce mois…', 2));
    h += IP.block('Compétences / habitudes à acquérir', IP.area(M + '.habits', '', 2));
    h += '<h3 class="bhead"><span>Objectifs souhaités ce mois-ci</span></h3>';
    for (var i = 0; i < 3; i++) {
      var g = M + '.goals.' + i, ok = st.get(g + '.ok');
      var tasks = '';
      for (var j = 0; j < 4; j++) tasks += '<div class="lrow done-able' + (st.get(g + '.td.' + j) ? ' done' : '') + '"><span class="num">' + (j + 1) + '</span>' + IP.inp(g + '.tasks.' + j, 'Tâche prioritaire') + IP.chk(g + '.td.' + j, 'Fait') + '</div>';
      h += '<section class="sec goalcard' + (ok ? ' achieved' : '') + '"><div class="ghead"><span class="pin">' + (i + 1) + '</span>' + IP.inp(g + '.t', 'Objectif ' + (i + 1), 'gtitle') + '</div>' +
        '<div class="card pad stack3"><label>Pourquoi ?' + IP.inp(g + '.why', '') + '</label><label>Récompense si atteint' + IP.inp(g + '.reward', '') + '</label></div>' +
        '<p class="minihead">Tâches prioritaires pour atteindre ces résultats</p><div class="card list">' + tasks + '</div>' +
        '<label class="donebox small">' + IP.chk(g + '.ok', 'Objectif atteint') + '<span>Objectif atteint</span></label></section>';
    }
    h += IP.block('Actions à entreprendre', IP.numList(M + '.actions', 5, ''));
    return h;
  }

  function moisCalendrier(M) {
    var c = IP.cursor, first = new Date(c.getFullYear(), c.getMonth(), 1), lead = (first.getDay() + 6) % 7,
      n = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate(), t = IP.iso(IP.today());
    var cal = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(function (x) { return '<span class="dow">' + x + '</span>'; }).join('');
    for (var i = 0; i < lead; i++) cal += '<span></span>';
    for (var d = 1; d <= n; d++) {
      var dd = new Date(c.getFullYear(), c.getMonth(), d), k = IP.iso(dd);
      cal += '<button data-go="' + k + '" class="' + (k === t ? 'today ' : '') + (hasContent(k) ? 'has' : '') + '" aria-label="' + e(IP.fmt.day.format(dd)) + '">' + d + '</button>';
    }
    var h = IP.block('Calendrier du mois', '<div class="cal">' + cal + '</div><p class="muted center">Touchez un jour pour l\'ouvrir.</p>');
    IP.CARNET.forEach(function (x) { h += IP.block(x[1], IP.area(M + '.carnet.' + x[0], '', 3), { fold: true }); });
    h += IP.block('Notes', IP.area(M + '.note', '', 5), { fold: true });
    return h;
  }

  function moisBilan(M) {
    var h = IP.ribbon('Évaluez votre mois') + IP.quote(IP.CITATION_BILAN);
    h += IP.block('Célébrez mes 10 plus grandes réalisations', IP.numList(M + '.eval.real', 10, ''), { icon: '⭐' });
    h += IP.block('Qu\'ai-je appris ce mois-ci ?', IP.numList(M + '.eval.appris', 5, ''));
    h += IP.block('Distractions / blocages mentaux / peurs', IP.numList(M + '.eval.blocages', 5, ''));
    h += IP.block('Comment me suis-je senti(e) bien ?', IP.numList(M + '.eval.bien', 3, ''));
    h += IP.block('Tracker d\'habitudes', '<div class="card pad tracker">' + IP.TRACKER.map(function (x) {
      var p = M + '.eval.tracker.' + x[0], v = st.get(p) || 0;
      return '<label><span>' + x[1] + '</span><input type="range" min="0" max="10" step="1" value="' + v + '" data-bind="' + p + '" aria-label="' + x[1] + ' sur 10"><output>' + v + '</output></label>';
    }).join('') + '<p class="muted">De 0 à 10 : où en suis-je ce mois-ci ?</p></div>');
    h += IP.block('Personnes dont j\'ai appris et qui m\'ont inspiré(e)', IP.numList(M + '.eval.inspire', 5, ''));
    h += IP.block('Qu\'est-ce qui ne s\'est pas produit ? Pourquoi ?', IP.area(M + '.eval.pasProduit', '', 3));
    h += IP.block('Quelles actions puis-je entreprendre pour m\'améliorer ?', IP.area(M + '.eval.ameliorer', '', 3));
    IP.QUESTIONS_MOIS.forEach(function (q, i) { h += IP.block(q, IP.area(M + '.eval.q.' + i, '', 3), { fold: true }); });
    return h;
  }

  function moisFinances(M) {
    var dev = st.state.profile.devise || '';
    function table(kind, label) {
      var rows = st.get(M + '.fin.' + kind) || [], dep = 0, rec = 0;
      var body = rows.map(function (r, i) {
        var p = M + '.fin.' + kind + '.' + i, amt = parseFloat(String(r.m || '').replace(',', '.')) || 0;
        if (r.type === 'rec') rec += amt; else dep += amt;
        return '<div class="finrow">' +
          '<input type="date" data-bind="' + p + '.d" value="' + e(r.d || '') + '" aria-label="Date">' +
          IP.inp(p + '.desc', 'Description') +
          '<input type="text" inputmode="decimal" data-bind="' + p + '.m" value="' + e(r.m || '') + '" placeholder="Montant" aria-label="Montant" class="amt">' +
          '<select data-bind="' + p + '.type" aria-label="Dépense ou recette"><option value="dep"' + (r.type !== 'rec' ? ' selected' : '') + '>Dépense</option><option value="rec"' + (r.type === 'rec' ? ' selected' : '') + '>Recette</option></select>' +
          '<select data-bind="' + p + '.mode" aria-label="Moyen de paiement"><option value="">Mode</option>' + [['esp', 'Espèces'], ['vir', 'Virement'], ['mob', 'Mobile']].map(function (o) { return '<option value="' + o[0] + '"' + (r.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
          '</div>';
      }).join('');
      var f = IP.fmt.num;
      return IP.block(label, '<div class="card fin">' + (body || '<p class="empty">Aucune opération ce mois-ci.</p>') + '</div>' +
        '<button class="add" data-addfin="' + kind + '">+ Ajouter une opération</button>' +
        '<div class="totals"><span>Dépenses <b>' + f.format(dep) + '</b></span><span>Recettes <b>' + f.format(rec) + '</b></span><span class="solde ' + (rec - dep < 0 ? 'neg' : '') + '">Solde <b>' + f.format(rec - dep) + ' ' + e(dev) + '</b></span></div>');
    }
    return IP.ribbon('Évaluez votre mois : finances') + table('perso', 'Finances personnelles') + table('pro', 'Finances professionnelles');
  }

  function renderMois(root) {
    var M = 'months.' + IP.mkey(IP.cursor), tab = st.state.moisTab || 'objectifs';
    var h = '<div class="seg" role="tablist">' + TABS.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += ({ objectifs: moisObjectifs, calendrier: moisCalendrier, bilan: moisBilan, finances: moisFinances })[tab](M);
    root.innerHTML = h;
    IP.bind(root, function (path) {
      if (/\.ok$/.test(path)) { var c = root.querySelector('[data-bind="' + path + '"]').closest('.goalcard'); if (c) c.classList.toggle('achieved', st.get(path)); }
      if (/\.fin\./.test(path) && /\.(m|type)$/.test(path)) { clearTimeout(root._f); root._f = setTimeout(function () { var y = root.scrollTop; IP.render(); root.scrollTop = y; }, 700); }
    });
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { st.state.moisTab = b.dataset.tab; st.save(); IP.render(); }); });
    root.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { IP.cursor = IP.fromIso(b.dataset.go); IP.go('jour'); }); });
    root.querySelectorAll('[data-addfin]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = M + '.fin.' + b.dataset.addfin, rows = st.get(p) || [];
        st.set(p + '.' + rows.length, { d: IP.iso(IP.today()), desc: '', m: '', type: 'dep', mode: '' });
        var y = root.scrollTop; IP.render(); root.scrollTop = y;
      });
    });
  }

  // ================= SEMAINE =================
  function weekGrid(mon, vertical) {
    var days = [], t = IP.iso(IP.today());
    for (var i = 0; i < 7; i++) days.push(IP.addDays(mon, i));
    function cell(d, h) { var k = IP.iso(d); return '<td>' + IP.inp('days.' + k + '.h.' + h, '', 'cell') + '</td>'; }
    var head = function (d, cls) { var k = IP.iso(d); return '<th class="' + (cls || '') + (k === t ? ' today' : '') + '"><button data-go="' + k + '">' + e(IP.fmt.short.format(d)) + '</button></th>'; };
    var h = '<div class="scroll-x grid-wrap"><table class="week ' + (vertical ? 'vert' : 'horiz') + '">';
    if (vertical) {
      h += '<thead><tr><th class="hcol"></th>' + days.map(function (d) { return head(d); }).join('') + '</tr></thead><tbody>';
      IP.HOURS.forEach(function (hr) { h += '<tr><th class="hcol">' + hr + 'h</th>' + days.map(function (d) { return cell(d, hr); }).join('') + '</tr>'; });
    } else {
      h += '<thead><tr><th class="hcol"></th>' + IP.HOURS.map(function (hr) { return '<th>' + hr + 'h</th>'; }).join('') + '</tr></thead><tbody>';
      days.forEach(function (d) { h += '<tr>' + head(d, 'hcol') + IP.HOURS.map(function (hr) { return cell(d, hr); }).join('') + '</tr>'; });
    }
    return h + '</tbody></table></div>';
  }

  function renderSemaine(root) {
    var mon = IP.monday(IP.cursor), W = 'weeks.' + IP.iso(mon), vertical = st.state.profile.weekLayout !== 'horizontal';
    var h = IP.quote(IP.quoteForWeek(mon));
    h += '<div class="card pad stack3"><label>Top priorité' + IP.inp(W + '.top', 'La chose la plus importante cette semaine') + '</label>' +
      '<label>Objectifs de la semaine' + IP.area(W + '.objectifs', '', 2) + '</label></div>';
    h += '<div class="layout"><span class="muted">Colonnes :</span><div class="seg small"><button data-layout="vertical" aria-selected="' + vertical + '">Verticales</button><button data-layout="horizontal" aria-selected="' + !vertical + '">Horizontales</button></div></div>';
    h += weekGrid(mon, vertical);
    h += '<button class="btn ghost gsend" id="sendWeek"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>Envoyer la semaine vers mon agenda</button>';
    h += IP.block('Les tâches principales de la semaine', IP.area(W + '.taches', '', 3));
    var hab = '<div class="scroll-x"><table class="habits"><thead><tr><th></th>' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      IP.HABITUDES.map(function (x) { return '<tr><th>' + x[1] + '</th>' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<td>' + IP.chk(W + '.hab.' + x[0] + '.' + i, x[1]) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
    h += IP.block('Créateur d\'habitudes positives', hab);
    IP.CARNET.forEach(function (x) { h += IP.block(x[1], IP.area(W + '.carnet.' + x[0], '', 3), { fold: true }); });
    root.innerHTML = h;
    IP.bind(root);
    root.querySelector('#sendWeek').addEventListener('click', function () { IP.sendIcs(IP.weekEvents(mon), 'infinity-semaine-' + IP.iso(mon) + '.ics'); });
    root.querySelectorAll('[data-layout]').forEach(function (b) { b.addEventListener('click', function () { st.state.profile.weekLayout = b.dataset.layout; st.save(); IP.render(); }); });
    root.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { IP.cursor = IP.fromIso(b.dataset.go); IP.go('jour'); }); });
  }

  // ================= JOUR =================
  function renderJour(root) {
    var c = IP.cursor, k = IP.iso(c), D = 'days.' + k, isToday = k === IP.iso(IP.today()), h = '';
    if (isToday) {
      var hr = new Date().getHours(), name = st.state.profile.name;
      h += '<p class="hello">' + (hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir') + (name ? ', <span>' + e(name) + '</span>' : '') + '</p>';
    }
    if (st.state.profile.verse) {
      var v = IP.verseFor(c), custom = st.get(D + '.verse'), editing = custom || IP._editVerse === k;
      h += '<section class="sec"><div class="verse"><div class="ref"><span>' + (editing ? 'Ma pensée du jour' : e(v[1])) + '</span>' +
        (editing ? '<button data-act="verse-reset">Revenir au verset</button>' : '<button data-act="verse-edit">Écrire ma pensée</button>') + '</div>' +
        (editing ? IP.area(D + '.verse', 'Un verset, une pensée, une parole reçue…', 2) : '<p class="vtext">« ' + e(v[0]) + ' »</p>') + '</div></section>';
    }
    var top = st.get('weeks.' + IP.iso(IP.monday(c)) + '.top');
    if (top) h += '<p class="topprio"><span>Top priorité de la semaine</span>' + e(top) + '</p>';
    var rows = IP.HOURS.map(function (hr) {
      var p = D + '.h.' + hr;
      return '<div class="lrow hour done-able' + (st.get(D + '.d.' + hr) ? ' done' : '') + '"><span class="hh">' + hr + 'h</span>' + IP.inp(p, '') + '<a class="gbtn" href="#" target="_blank" rel="noopener" data-gcal="' + hr + '" aria-label="Ajouter le rendez-vous de ' + hr + 'h à Google Agenda" title="Ajouter à Google Agenda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg></a>' + IP.chk(D + '.d.' + hr, 'Fait') + '</div>';
    }).join('');
    h += IP.block('Agenda du jour', '<div class="card list hours">' + rows + '</div>');
    h += IP.block('Merci pour…', IP.numList(D + '.merci', 3, 'Une chose pour laquelle je dis merci'));
    h += IP.block('Notes', '<div class="card pad">' + IP.area(D + '.note', 'Idées, choses à retenir…', 3) + '</div>');
    root.innerHTML = h;
    IP.bind(root);
    root.querySelectorAll('[data-gcal]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var hr = a.dataset.gcal, txt = root.querySelector('[data-bind="' + D + '.h.' + hr + '"]').value;
        var e2 = IP.eventFromCell(k, hr, txt);
        if (!e2) { ev.preventDefault(); IP.toast('Écrivez d\'abord le rendez-vous de ' + hr + 'h.'); return; }
        a.href = IP.gcalLink(e2);
      });
    });
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.act === 'verse-edit') { IP._editVerse = k; IP.render(); var t = root.querySelector('textarea'); if (t) t.focus(); }
        else { IP._editVerse = null; st.set(D + '.verse', ''); IP.render(); }
      });
    });
    // Aller à l'heure actuelle
    if (isToday) { var now = new Date().getHours(), row = root.querySelectorAll('.hour')[Math.max(0, Math.min(16, now - 7))]; if (row && now > 9) setTimeout(function () { row.scrollIntoView({ block: 'center' }); }, 30); }
  }

  IP.agenda = { mois: renderMois, semaine: renderSemaine, jour: renderJour };
})();
