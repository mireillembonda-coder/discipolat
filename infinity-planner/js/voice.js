// Commande vocale : dicter dans une case, ou ajouter un rendez-vous à la voix
// (« demain à 15 h dentiste »). Utilise la reconnaissance vocale du téléphone
// (Chrome / Android) ; elle a besoin d'internet.
(function () {
  'use strict';
  var st = IP.store;

  // ---------- Comprendre une phrase ----------
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, vingt: 20, 'vingt et une': 21, 'vingt-deux': 22 };

  // Renvoie { date, hour, min, text } ; hour = null si aucune heure n'est dite.
  IP.parseVoice = function (phrase, base) {
    var s = ' ' + phrase.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim() + ' ';
    var date = new Date(base || IP.today()); date.setHours(0, 0, 0, 0);
    var m;
    function cut(re) { s = s.replace(re, ' '); }

    if (/ apr[eè]s[- ]demain /i.test(s)) { date = IP.addDays(date, 2); cut(/ apr[eè]s[- ]demain /i); }
    else if (/ demain /i.test(s)) { date = IP.addDays(IP.today(), 1); cut(/ demain /i); }
    else if (/ aujourd'hui /i.test(s)) { date = IP.today(); cut(/ aujourd'hui /i); }
    else if ((m = s.match(/ (?:le )?(\d{1,2}|1er|premier) (janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)(?: (\d{4}))? /i))) {
      var jour = /^\d+$/.test(m[1]) ? +m[1] : 1, mo = MOIS.indexOf(m[2].toLowerCase().replace('fevrier', 'février').replace('aout', 'août').replace('decembre', 'décembre'));
      var t = IP.today(), y = m[3] ? +m[3] : t.getFullYear();
      date = new Date(y, mo, jour); if (!m[3] && date < t) date = new Date(y + 1, mo, jour);
      cut(m[0]);
    }
    else if ((m = s.match(/ (?:ce |le )?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?: prochain)? /i))) {
      var t2 = IP.today(), d = JOURS.indexOf(m[1].toLowerCase()), diff = (d - t2.getDay() + 7) % 7;
      if (/prochain/.test(m[0]) && diff === 0) diff = 7;
      date = IP.addDays(t2, diff); cut(m[0]);
    }

    // Heure : « 15h », « 15 h 30 », « à 15 heures », « 3 heures de l'après-midi », « midi »
    var hour = null, min = 0;
    var mots = Object.keys(NOMBRES).sort(function (a, b) { return b.length - a.length; }).join('|');
    var reH = new RegExp(" (?:à |a |vers |pour )?(\\d{1,2}|" + mots + ") ?(?:h|heures?)(?: ?(\\d{1,2}))?(?: (du matin|de l'apr[eè]s-midi|du soir))? ", 'i');
    if ((m = s.match(reH))) {
      hour = /^\d+$/.test(m[1]) ? +m[1] : NOMBRES[m[1].toLowerCase()];
      min = m[2] ? +m[2] : 0;
      if (m[3] && /apr|soir/.test(m[3]) && hour < 12) hour += 12;
      cut(m[0]);
    } else if ((m = s.match(/ (?:à |a |vers )?midi /i))) { hour = 12; cut(m[0]); }
    if (hour !== null && (hour > 23 || min > 59)) { hour = null; min = 0; }

    // Mots d'ordre à enlever au début : « ajoute », « note », « rappelle-moi »…
    var text = s.replace(/^ (?:ajoute[rz]?|note[rz]?|mets|mettre|programme[rz]?|planifie[rz]?|inscri[st]|rappelle[- ]moi(?: de| d')?|j'ai)\b ?/i, ' ')
      .replace(/ (?:à|a|le|pour|de)\s*$/i, ' ').replace(/\s+/g, ' ').trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return { date: date, hour: hour, min: min, text: text };
  };

  // Range la phrase dans l'agenda ; renvoie un message à afficher (et de quoi annuler)
  function addToAgenda(r) {
    var k = IP.iso(r.date), D = 'days.' + k;
    if (!r.text) return null;
    if (r.hour !== null && r.hour >= 6 && r.hour <= 22) {
      var p = D + '.h.' + r.hour, before = st.get(p) || '';
      var txt = (r.min ? r.hour + 'h' + String(r.min).padStart(2, '0') + ' ' : '') + r.text;
      st.set(p, before ? before + ' · ' + txt : txt);
      return { msg: IP.fmt.day.format(r.date) + ' à ' + r.hour + 'h' + (r.min ? String(r.min).padStart(2, '0') : '') + ' : ' + txt, path: p, before: before, date: r.date };
    }
    var n = D + '.note', old = st.get(n) || '';
    var line = (r.hour !== null ? r.hour + 'h' + (r.min ? String(r.min).padStart(2, '0') : '') + ' ' : '') + r.text;
    st.set(n, old ? old + '\n' + line : line);
    return { msg: IP.fmt.day.format(r.date) + ', dans les notes : ' + line, path: n, before: old, date: r.date };
  }

  // ---------- Micro ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = document.getElementById('mic'), bubble = document.getElementById('micBubble');
  var rec = null, listening = false, target = null, finalText = '', lastAdd = null;

  function isField(el) { return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')); }
  function show(html, actions) {
    bubble.innerHTML = '<p>' + html + '</p>' + (actions || '');
    bubble.hidden = false;
  }
  function hideSoon(ms) { clearTimeout(bubble._t); bubble._t = setTimeout(function () { bubble.hidden = true; }, ms || 4000); }

  function stop() { listening = false; btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); }

  function start() {
    if (!SR) {
      show("La dictée n'est pas disponible dans ce navigateur. Astuce : utilisez le micro 🎤 de votre clavier, il marche dans toutes les cases.");
      hideSoon(6000); return;
    }
    var a = document.activeElement;
    target = isField(a) ? a : null;
    finalText = '';
    rec = new SR(); rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
      }
      show('<b>' + IP.e(finalText) + '</b>' + IP.e(interim) + '…');
    };
    rec.onerror = function (ev) {
      stop();
      var m = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? "Le micro est bloqué. Autorisez le micro pour cette application dans les réglages du téléphone, puis réessayez."
        : ev.error === 'network' ? "La dictée a besoin d'internet. Vérifiez votre connexion."
        : ev.error === 'no-speech' ? "Je n'ai rien entendu. Touchez le micro et parlez juste après."
        : "La dictée s'est arrêtée. Réessayez.";
      show(m); hideSoon(5000);
    };
    rec.onend = function () {
      var wasListening = listening; stop();
      if (!wasListening) return;
      var t = finalText.trim();
      if (!t) { if (!bubble.hidden && /…<\/p>$/.test(bubble.innerHTML)) bubble.hidden = true; return; }
      if (target && document.body.contains(target)) {
        // Dictée dans la case choisie
        var v = target.value, sep = v && !/\s$/.test(v) ? ' ' : '';
        target.value = v + sep + (v ? t : t.charAt(0).toUpperCase() + t.slice(1));
        target.dispatchEvent(new Event('input', { bubbles: true }));
        show('Écrit : « ' + IP.e(t) + ' »'); hideSoon(2500);
      } else {
        // Ajout rapide dans l'agenda
        var base = st.state.view === 'jour' ? IP.cursor : IP.today();
        lastAdd = addToAgenda(IP.parseVoice(t, base));
        if (!lastAdd) { show("Je n'ai pas compris. Exemple : « demain à 15 h dentiste »."); hideSoon(5000); return; }
        show('✓ Ajouté ' + IP.e(lastAdd.msg),
          '<div class="micact"><button type="button" data-mic="see">Voir le jour</button><button type="button" data-mic="undo">Annuler</button></div>');
        hideSoon(8000);
        IP.render();
      }
    };
    try { rec.start(); listening = true; btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
    catch (err) { stop(); return; }
    show(target ? 'Je vous écoute… je l\'écris dans la case.' : 'Je vous écoute… Dites par exemple « demain à 15 h dentiste ».');
  }

  // Garder le clavier et la case active quand on touche le micro
  btn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
  btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
  btn.addEventListener('click', function () { if (listening && rec) { rec.stop(); } else start(); });
  bubble.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mic]'); if (!b || !lastAdd) return;
    if (b.dataset.mic === 'undo') { st.set(lastAdd.path, lastAdd.before); lastAdd = null; IP.render(); show('Annulé.'); hideSoon(1500); }
    else { IP.cursor = new Date(lastAdd.date); IP.go('jour'); bubble.hidden = true; }
  });
})();
