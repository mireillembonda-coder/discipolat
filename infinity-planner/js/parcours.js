// Le parcours Infinity : la boucle et ses 8 étapes (début du planner).
(function () {
  'use strict';
  var st = IP.store, e = IP.e;

  function Y() { return IP.year(); }
  function base() { return 'years.' + Y(); }
  function yd() { var s = st.state; if (!s.years[Y()]) s.years[Y()] = {}; return s.years[Y()]; }
  function stepDone(n) { return !!(yd().steps || {})[n]; }

  // ---------- La boucle ----------
  function loopSvg() {
    var W = 340, H = 170, cx = W / 2, cy = H / 2, a = 150, pts = [];
    function P(t) { var d = 1 + Math.sin(t) * Math.sin(t); return [cx + a * Math.cos(t) / d, cy + 1.45 * a * Math.sin(t) * Math.cos(t) / d]; }
    for (var i = 0; i <= 200; i++) pts.push(P(i / 200 * 2 * Math.PI));
    var path = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + 'Z';
    var nodes = '';
    // 1 à 4 sur la boucle de gauche, 5 à 8 sur la boucle de droite
    var ts = [2.35, 2.95, 3.55, 4.1, 5.35, 5.95, 0.4, 0.95];
    ts.forEach(function (t, i) {
      var p = P(t), n = i + 1, done = stepDone(n);
      nodes += '<g class="node' + (done ? ' done' : '') + '" data-step="' + n + '" tabindex="0" role="button" aria-label="Étape ' + n + ' : ' + e(IP.ETAPES[i].t) + '">' +
        '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="15"/>' +
        '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 5).toFixed(1) + '">' + (done ? '✓' : n) + '</text></g>';
    });
    return '<svg class="loop" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="La boucle Infinity et ses 8 étapes">' +
      '<path d="' + path + '" class="track"/>' + nodes + '</svg>';
  }

  function home(root) {
    var done = IP.ETAPES.filter(function (x) { return stepDone(x.n); }).length;
    var name = st.state.profile.name;
    var html = '<section class="hero">' +
      '<p class="script">' + (name ? 'Bienvenue, ' + e(name) : 'Planifier avec intention') + '</p>' +
      '<h2 class="herotitle">Mon parcours ' + Y() + '</h2>' + loopSvg() +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="' + done + '"><i style="width:' + (done / 8 * 100) + '%"></i></div>' +
      '<p class="muted center">Checklist de progression : ' + done + ' étape' + (done > 1 ? 's' : '') + ' sur 8</p>' +
      '<div class="mantras"><span>Se sentir bien, être dans un état positif</span><span>Laisser prise et lâcher prise</span><span>Profitez du voyage</span></div>' +
      '</section>';
    html += '<section class="sec"><h3 class="bhead"><span>Itinéraire d\'utilisation</span></h3><ol class="steps">' +
      IP.ETAPES.map(function (x) {
        return '<li><button class="stepcard' + (stepDone(x.n) ? ' done' : '') + '" data-step="' + x.n + '"><span class="pin">' + (stepDone(x.n) ? '✓' : x.n) + '</span>' +
          '<span class="stxt"><b>' + e(x.t.replace("l'année", "l'année " + (Y() - 1))) + '</b><small>' + e(x.s) + '</small></span><span class="chev" aria-hidden="true">›</span></button></li>';
      }).join('') + '</ol></section>';
    html += IP.block('Pourquoi choisir l\'Infinity Planner ?', '<div class="why">' + IP.POURQUOI.map(function (p, i) {
      return '<div><span class="pin sm">' + (i + 1) + '</span><b>' + e(p[0]) + '</b><p>' + e(p[1]) + '</p></div>';
    }).join('') + '</div>', { fold: true });
    root.innerHTML = html;
    root.querySelectorAll('[data-step]').forEach(function (b) {
      function go() { IP.go('parcours', +b.dataset.step); }
      b.addEventListener('click', go);
      b.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    });
  }

  // ---------- Étapes ----------
  var B; // chemin de l'année

  function s1() {
    var y0 = Y() - 1;
    var h = IP.ribbon('Bilan de ' + y0) +
      '<p class="lead">Une réflexion complète sur vos réussites et défis dans toutes les sphères de votre vie, pour évaluer vos progrès et préparer un avenir encore plus éclairé.</p>';
    h += '<h3 class="script big">Mon année ' + y0 + '</h3>';
    IP.DOMAINES.forEach(function (d) { h += IP.block(d.t, IP.area(B + '.bilan.dom.' + d.k, 'Comment s\'est passée mon année ?', 3), { sub: '(' + e(d.d) + ')' }); });
    [['real', 'Réalisations et moments inoubliables'], ['defis', 'Défis et épreuves rencontrés'], ['lecons', 'Leçons retenues de ' + y0],
     ['grace', 'Mes actions de grâce (Gratitude pour…)'], ['ameliorer', 'Aspects à améliorer'], ['aspire', 'Amélioration pour l\'année ' + Y()]]
      .forEach(function (x) { h += IP.block(x[1], IP.area(B + '.bilan.' + x[0], '', 4)); });
    return h;
  }

  function s2() {
    var h = IP.ribbon('Conscience et découverte de soi');
    h += '<p class="lead">Pour faire cet exercice, utilisez un minuteur et accordez-vous un maximum de 90 secondes pour réfléchir sur chaque question.</p>';
    h += '<h3 class="bhead"><span>Les questions les plus importantes de la vie</span></h3>';
    IP.QUESTIONS.forEach(function (q, i) {
      h += '<section class="sec qcard"><div class="qhead"><p class="q"><b>' + (i + 1) + '.</b> ' + e(q) + '</p><button class="timer" data-timer>⏱ 90 s</button></div>' +
        IP.area(B + '.conscience.' + i, 'Ma réponse…', 3) + '</section>';
    });
    return h;
  }

  function answers(list) {
    var c = yd().conscience || [];
    return '<details class="peek"><summary>Revoir mes réponses (questions ' + list.join(', ') + ')</summary>' + list.map(function (n) {
      return '<p><b>' + n + '.</b> ' + e(IP.QUESTIONS[n - 1]) + '<br><span class="ans">' + (c[n - 1] ? e(c[n - 1]) : '<i>Pas encore de réponse</i>') + '</span></p>';
    }).join('') + '</details>';
  }

  function s3() {
    var h = IP.ribbon('Déclaration de mission et de vision');
    h += IP.block('Définissez et élaborez votre déclaration de vision',
      '<ol class="howto"><li><b>Étape 1 :</b> Après avoir répondu aux questions 1, 2, 4, 6, 7 et 8, définissez et élaborez votre vision de vie en un ou deux paragraphes. Votre vision décrit ce que vous aimez faire, être, donner, créer, ressentir ou partager.</li>' +
      '<li><b>Étape 2 :</b> Ma vision est-elle chargée d\'émotion ? M\'incite-t-elle à agir ?</li><li><b>Étape 3 :</b> Ma vision est-elle spécifique ? Est-elle mesurable ?</li></ol>' +
      '<p class="muted">Créez quelque chose qui vous inspire et n\'essayez pas de le rendre parfait. Il n\'y a pas de bonne ou de mauvaise façon de décrire votre vision ultime.</p>' +
      answers([1, 2, 4, 6, 7, 8]) +
      '<p class="script mid">Ma Déclaration de vie</p><p class="muted">Comment j\'aimerais que ma vie soit</p>' + IP.area(B + '.vision', 'Ma vision…', 5), { icon: '👁' });
    h += IP.block('Définissez et réduisez votre énoncé de mission',
      '<p>Un énoncé de mission définit votre essence et l\'empreinte que vous souhaitez laisser sur le monde. L\'énoncé de mission qui vous convient vous inspirera à sortir du lit avec passion pour vivre votre objectif.</p>' +
      '<ol class="howto"><li><b>Étape 1 :</b> Identifiez vos réussites passées (vérifiez la question 10).</li><li><b>Étape 2 :</b> Identifiez vos valeurs fondamentales (questions 6, 7 et 9).</li></ol>' +
      answers([6, 7, 9, 10]) +
      '<p class="script mid">Ma déclaration de Mission</p><p class="muted">Comment je veux contribuer à ce monde</p>' + IP.area(B + '.mission', 'Ma mission…', 4), { icon: '🎯' });
    h += IP.ribbon('Créez votre déclaration de vie');
    h += '<p class="lead">Utilisez vos cinq sens pour décrire votre environnement. Précisez vos revenus et la valeur que vous offrez. Élaborez sur la santé, les finances, les loisirs, les affaires, la famille et la vie spirituelle. Exprimez votre amour pour la vie, votre confiance et votre état d\'esprit. Imaginez-le comme un film captivant que vous souhaitez relire et visualiser chaque jour.</p><p class="muted">N\'oubliez pas d\'utiliser les verbes au présent.</p>';
    h += '<section class="sec"><div class="card pad lined"><p class="script mid">Je suis si reconnaissant(e) que…</p>' + IP.area(B + '.declaration', '…', 10) + '</div></section>';
    return h;
  }

  function goals() { var g = yd().goals || {}; var out = []; IP.DOMAINES.forEach(function (d) { (g[d.k] || []).forEach(function (x, i) { if (x && x.t) out.push({ k: d.k, i: i, g: x, dom: d.t }); }); }); return out; }
  function score(g) { return (+g.c || 0) + (+g.l || 0) + (+g.e || 0); }
  function top5() { return goals().filter(function (x) { return score(x.g) > 0; }).sort(function (a, b) { return score(b.g) - score(a.g); }).slice(0, 5); }

  function s4() {
    var h = IP.ribbon('Mon parcours');
    IP.PARCOURS.forEach(function (p) {
      h += IP.block(p.t, '<div class="card pad stack3">' +
        '<label>Mon état actuel ?' + IP.area(B + '.parcours.' + p.k + '.a', '', 2) + '</label>' +
        '<label>Ma destination ?' + IP.area(B + '.parcours.' + p.k + '.d', '', 2) + '</label>' +
        '<label>Comment réussir cela ?' + IP.area(B + '.parcours.' + p.k + '.c', '', 2) + '</label></div>', { fold: true });
    });
    h += IP.ribbon('Fixation d\'objectifs');
    h += '<p class="lead">Si rien ne vous limitait et que l\'échec n\'était pas une option, que voudriez-vous accomplir dans les 20 à 50 prochaines années ? Imaginez grand et listez vos objectifs majeurs dans tous les domaines de votre vie : spiritualité, santé, relations, travail & affaires, finances, développement personnel et même loisirs.</p>';
    var g = yd().goals || {};
    IP.DOMAINES.forEach(function (d) {
      var list = g[d.k] || [], n = Math.max(4, list.length), rows = '';
      for (var i = 0; i < n; i++) rows += '<div class="lrow"><span class="num">' + (i + 1) + '</span>' + IP.inp(B + '.goals.' + d.k + '.' + i + '.t', 'Objectif') + '</div>';
      h += IP.block(d.t, '<div class="card list">' + rows + '</div><button class="add" data-addgoal="' + d.k + '" data-n="' + n + '">+ Ajouter un objectif</button>', { fold: true, open: d.k === 'spi' });
    });
    h += '<div id="cle"></div>';
    h += IP.ribbon('Éliminez les blocages et les distractions');
    h += IP.block('Libérez votre vrai potentiel', '<p class="muted">Affirmations positives à répéter quotidiennement :</p>' + IP.numList(B + '.affirm', 10, 'Je suis…') +
      '<p class="muted">Mes actions à entreprendre pour éliminer les distractions :</p>' + IP.numList(B + '.distract', 8, ''), { icon: '🌳' });
    return h;
  }

  // Évaluation Cœur · Levier · Échéance, top 5, à éviter, récompenses
  function renderCle(root) {
    var box = root.querySelector('#cle'); if (!box) return;
    var all = goals(), t5 = top5(), inTop = {};
    t5.forEach(function (x) { inTop[x.k + x.i] = true; });
    var opts = function (v) { var o = '<option value="">–</option>'; for (var i = 0; i <= 10; i++) o += '<option' + (String(v) === String(i) ? ' selected' : '') + '>' + i + '</option>'; return o; };
    var h = IP.ribbon('Les 5 qui comptent vraiment');
    h += '<p class="lead">Parmi tous les objectifs que tu souhaites atteindre, quels sont les 5 qui comptent vraiment pour toi cette année ? Évalue chaque objectif selon 3 critères :</p>' +
      '<ul class="cle"><li><b>C — Cœur :</b> Est-ce que cet objectif me tient profondément à cœur ?</li><li><b>L — Levier :</b> Va-t-il avoir un impact positif sur plusieurs domaines de ma vie ?</li><li><b>É — Échéance :</b> Puis-je réellement l\'atteindre en ' + Y() + ' ?</li></ul>' +
      '<p class="muted">Additionne tes scores sur 30 : les 5 objectifs ayant les scores les plus élevés sont retenus automatiquement.</p>';
    if (!all.length) h += '<p class="empty">Écrivez d\'abord vos objectifs dans « Fixation d\'objectifs » ci-dessus : ils apparaîtront ici pour être notés.</p>';
    else {
      h += '<div class="scroll-x"><table class="cletab"><thead><tr><th>Objectif</th><th>Cœur<br>/10</th><th>Levier<br>/10</th><th>Échéance<br>/10</th><th>Score<br>/30</th></tr></thead><tbody>' +
        all.map(function (x) {
          var p = B + '.goals.' + x.k + '.' + x.i;
          return '<tr class="' + (inTop[x.k + x.i] ? 'istop' : '') + '"><td>' + e(x.g.t) + '<small>' + e(x.dom) + '</small></td>' +
            ['c', 'l', 'e'].map(function (c) { return '<td><select data-bind="' + p + '.' + c + '" aria-label="' + c + '">' + opts(x.g[c]) + '</select></td>'; }).join('') +
            '<td class="score">' + (score(x.g) || '–') + (inTop[x.k + x.i] ? ' ★' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += IP.block('Mes 5 objectifs principaux pour ' + Y(), t5.length ? '<div class="card list">' + t5.map(function (x, n) {
      var p = B + '.goals.' + x.k + '.' + x.i;
      return '<div class="lrow"><span class="num">' + (n + 1) + '</span><div class="pair"><b class="gt">' + e(x.g.t) + '</b>' + IP.inp(p + '.why', 'Pourquoi ? Est-ce que mon cœur le désire vraiment ?', 'sub') + '</div></div>';
    }).join('') + '</div>' : '<p class="empty">Notez vos objectifs ci-dessus pour voir apparaître vos 5 priorités.</p>', { icon: '🏆' });
    var rest = all.filter(function (x) { return !inTop[x.k + x.i]; });
    if (t5.length && rest.length) h += IP.block('À éviter à tout prix', '<p class="muted">Tout ce qui n\'est pas dans vos 5 objectifs principaux devient votre liste « À éviter à tout prix ». Ces choses ne retiennent pas votre attention tant que vos 5 objectifs principaux ne sont pas atteints. Êtes-vous déterminé(e) à ne rien faire de tout cela d\'ici là ? Si non, revoyez vos notes ci-dessus.</p><ul class="avoid">' +
      rest.map(function (x) { return '<li>' + e(x.g.t) + '</li>'; }).join('') + '</ul>', { fold: true });
    if (t5.length) h += IP.block('Fixez des récompenses si vous atteignez vos objectifs', '<p class="muted">Célébrez le succès et récompensez-vous pour vos progrès.</p><div class="card list">' + t5.map(function (x, n) {
      var p = B + '.goals.' + x.k + '.' + x.i;
      return '<div class="lrow done-able' + (x.g.ok ? ' done' : '') + '"><span class="num">' + (n + 1) + '</span><div class="pair"><b class="gt">' + e(x.g.t) + '</b>' + IP.inp(p + '.reward', 'Récompense après l\'atteinte', 'sub') + '</div>' + IP.chk(p + '.ok', 'Objectif atteint') + '</div>';
    }).join('') + '</div>', { icon: '🎁' });
    box.innerHTML = h;
    IP.bind(box, function (path) { if (/\.(c|l|e)$/.test(path)) renderCle(root); });
  }

  function s5() {
    var h = IP.ribbon('Vision board');
    h += '<p class="lead">Profitez de cet espace pour réunir des images, des citations et des symboles qui vous motivent et vous orientent vers vos rêves, avec l\'objectif de rendre vos désirs visibles à court, moyen ou long terme, afin de vous aider à rester motivé(e) et à passer à l\'action.</p>';
    var items = yd().board || [];
    h += '<div class="board" id="board">' + items.map(function (it, i) {
      return '<figure class="tile' + (it.img ? '' : ' txt') + '" data-i="' + i + '">' + (it.img ? '<img alt="" data-img="' + it.id + '">' : '') +
        '<figcaption>' + (it.img ? IP.inp(B + '.board.' + i + '.text', 'Légende') : IP.area(B + '.board.' + i + '.text', 'Une citation, un mot, un rêve…', 3)) + '</figcaption>' +
        '<button class="del" data-del="' + i + '" aria-label="Retirer">×</button></figure>';
    }).join('') + '</div>' + (items.length ? '' : '<p class="empty">Votre tableau est vide. Ajoutez une photo de votre galerie ou une phrase qui vous inspire.</p>');
    h += '<div class="btnrow"><button class="btn" id="addPhoto">+ Ajouter des photos</button><button class="btn ghost" id="addText">+ Ajouter une citation</button><input type="file" id="photoIn" accept="image/*" multiple hidden></div>';
    var v = yd();
    h += IP.ribbon('Ma déclaration de vie');
    h += '<p class="muted center">À relire et visualiser chaque jour.</p>';
    h += '<div class="card pad readback">' +
      (v.vision ? '<p class="script mid">Ma vision</p><p>' + e(v.vision) + '</p>' : '') +
      (v.mission ? '<p class="script mid">Ma mission</p><p>' + e(v.mission) + '</p>' : '') +
      (v.declaration ? '<p class="script mid">Je suis si reconnaissant(e) que…</p><p>' + e(v.declaration) + '</p>' : '') +
      (!v.vision && !v.mission && !v.declaration ? '<p class="empty">Écrivez votre déclaration à l\'étape 3 : elle s\'affichera ici.</p><button class="btn ghost" data-goto="3">Aller à l\'étape 3</button>' : '') + '</div>';
    return h;
  }
  function boardAfter(root) {
    root.querySelectorAll('img[data-img]').forEach(function (img) {
      st.images.get(img.dataset.img).then(function (src) { if (src) img.src = src; });
    });
    var fileIn = root.querySelector('#photoIn');
    root.querySelector('#addPhoto').addEventListener('click', function () { fileIn.click(); });
    fileIn.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileIn.files || []); if (!files.length) return;
      var v = yd(); v.board = v.board || [];
      Promise.all(files.map(function (f) {
        return IP.shrinkImage(f, 1200).then(function (data) {
          var id = 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          return st.images.put(id, data).then(function () { v.board.push({ id: id, img: true, text: '' }); });
        });
      })).then(function () { st.save(); IP.render(); IP.toast('Photo ajoutée au vision board.'); })
        .catch(function () { IP.toast("Cette image n'a pas pu être ajoutée."); });
    });
    root.querySelector('#addText').addEventListener('click', function () {
      var v = yd(); v.board = v.board || []; v.board.push({ id: '', img: false, text: '' }); st.save(); IP.render();
      var t = root.querySelector('.tile:last-child textarea'); if (t) t.focus();
    });
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Retirer ?'; setTimeout(function () { b.classList.remove('sure'); b.textContent = '×'; }, 3000); return; }
        var v = yd(), it = v.board.splice(+b.dataset.del, 1)[0];
        if (it && it.img) st.images.del(it.id);
        st.save(); IP.render();
      });
    });
  }

  function s6() {
    var h = IP.ribbon('Stratégie : compétences | habitudes | personnes');
    h += IP.block('Compétences à maîtriser pour atteindre mes objectifs', IP.twoCol(B + '.strat.comp', B + '.strat.compHow', 5, 'Compétences que je veux maîtriser', 'Comment et de qui puis-je les apprendre'), { icon: '💡' });
    h += IP.block('Habitudes à changer ou apprendre pour atteindre mes objectifs', IP.twoCol(B + '.strat.old', B + '.strat.neu', 5, 'Vieilles mauvaises habitudes à arrêter', 'Nouvelles habitudes à maîtriser'), { icon: '💪' });
    h += IP.block('De qui suis-je entouré(e) ?', IP.twoCol(B + '.strat.neg', B + '.strat.pos', 5, 'Personnes qui m\'influencent négativement', 'Personnes positives avec qui je passerai plus de temps'), { icon: '👥' });
    h += IP.block('Qui m\'aidera à me tenir responsable ?', IP.twoCol(B + '.strat.partners', B + '.strat.rewards', 3, 'Partenaires de responsabilité', 'Récompense après l\'atteinte'), { icon: '🤝' });
    return h;
  }

  function s7() {
    var h = IP.ribbon('Passer à l\'action');
    h += '<p class="lead">Visualisation quotidienne : chaque mois, chaque semaine et chaque jour, transformez votre vision en actions concrètes.</p>';
    h += '<div class="actions3">' +
      '<button class="bigbtn" data-view="mois"><b>Le mois</b><small>Objectifs, calendrier, évaluation, finances</small></button>' +
      '<button class="bigbtn" data-view="semaine"><b>La semaine</b><small>Plan d\'action hebdomadaire et habitudes</small></button>' +
      '<button class="bigbtn" data-view="jour"><b>Le jour</b><small>Objectif quotidien, heure par heure</small></button></div>';
    h += '<ul class="ticks"><li>Bonnes habitudes quotidiennes</li><li>Objectif quotidien</li><li>Plan d\'action hebdomadaire</li><li>Réfléchissez sur papier</li></ul>';
    var t5 = top5();
    if (t5.length) h += IP.block('Mes 5 objectifs principaux', '<ol class="plain">' + t5.map(function (x) { return '<li>' + e(x.g.t) + '</li>'; }).join('') + '</ol>');
    return h;
  }

  function s8() {
    var h = IP.ribbon('Récompensez et célébrez-vous');
    h += IP.quote(IP.CITATION_BILAN);
    var t5 = top5();
    h += IP.block('Mes objectifs et mes récompenses', t5.length ? '<div class="card list">' + t5.map(function (x) {
      return '<div class="lrow"><span class="num">' + (x.g.ok ? '✓' : '·') + '</span><div class="pair"><b class="gt">' + e(x.g.t) + '</b><span class="muted">' + (x.g.reward ? 'Récompense : ' + e(x.g.reward) : 'Pas encore de récompense choisie') + '</span></div></div>';
    }).join('') + '</div>' : '<p class="empty">Vos 5 objectifs principaux apparaîtront ici (étape 4).</p>', { icon: '🎁' });
    var wins = [];
    Object.keys(st.state.months).sort().forEach(function (k) {
      if (k.slice(0, 4) !== String(Y())) return;
      var r = ((st.state.months[k].eval || {}).real || []).filter(Boolean);
      if (r.length) wins.push('<p><b>' + e(IP.fmt.monthOnly.format(IP.fromIso(k + '-01'))) + '</b></p><ul>' + r.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>');
    });
    h += IP.block('Mes plus grandes réalisations de ' + Y(), wins.length ? '<div class="card pad">' + wins.join('') + '</div>' : '<p class="empty">Chaque mois, dans « Évaluez votre mois », notez vos 10 plus grandes réalisations : elles se rassemblent ici.</p>', { icon: '⭐' });
    h += IP.block('Ma célébration', IP.area(B + '.celebration', 'Comment je me célèbre…', 4));
    return h;
  }

  var STEPS = [null, s1, s2, s3, s4, s5, s6, s7, s8];

  function step(root, n) {
    B = base();
    var h = STEPS[n]();
    h += '<div class="stepfoot"><label class="donebox">' + IP.chk(B + '.steps.' + n, 'Étape terminée') + '<span>J\'ai terminé cette étape</span></label>' +
      (n < 8 ? '<button class="btn" data-next="' + (n + 1) + '">Étape ' + (n + 1) + ' ›</button>' : '<button class="btn" data-next="0">Retour à la boucle</button>') + '</div>';
    root.innerHTML = h;
    if (n === 4) renderCle(root);
    IP.bind(root, function (path) { if (n === 4 && /\.goals\.[a-z]+\.\d+\.t$/.test(path)) { clearTimeout(root._cle); root._cle = setTimeout(function () { renderCle(root); }, 600); } });
    root.querySelectorAll('[data-timer]').forEach(function (b) { b.addEventListener('click', function () { IP.timer(b, 90); }); });
    root.querySelectorAll('[data-addgoal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.addgoal, n2 = +b.dataset.n; st.set(B + '.goals.' + k + '.' + n2 + '.t', ''); IP.render();
      });
    });
    root.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { IP.go('parcours', +b.dataset.next); }); });
    root.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { IP.go('parcours', +b.dataset.goto); }); });
    root.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { IP.go(b.dataset.view); }); });
    if (n === 5) boardAfter(root);
  }

  IP.parcours = {
    render: function (root) { var n = st.state.step || 0; if (n) step(root, n); else home(root); },
    title: function () { var n = st.state.step || 0; return n ? 'Étape ' + n : 'Mon parcours ' + Y(); }
  };
})();
