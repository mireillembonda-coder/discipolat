/* Pharmacie — application (page). Les règles et les calculs sont dans logique.js. */
(function () {
  'use strict';

  /* ================================================================== */
  /* Connexion au serveur (ou mode essai local)                          */
  /* ================================================================== */
  var CFG = window.PHARMACIE_CONFIG || {};
  var SERVEUR = (CFG.serveur || '').trim();
  try {
    var m = /[?&]serveur=([^&#]+)/.exec(location.search);
    if (m) { localStorage.setItem('pharmacie_serveur', decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
    if (!SERVEUR) SERVEUR = localStorage.getItem('pharmacie_serveur') || '';
  } catch (e) {}
  if (/[?&]essai=1/.test(location.search)) SERVEUR = '';
  var ESSAI = !SERVEUR;
  var CLE_SESSION = ESSAI ? 'pharmacie_session_essai' : 'pharmacie_session';
  var local = ESSAI ? moteurLocal() : null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateLocale(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function moteurLocal() {
    var CLE = 'pharmacie_essai_v1', data = {};
    try { data = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { data = {}; }
    function sauver() { try { localStorage.setItem(CLE, JSON.stringify(data)); } catch (e) {} }
    function t(n) { return data[n] || (data[n] = []); }
    var store = {
      lire: function (n) { return t(n).map(function (o) { return Object.assign({}, o); }); },
      ajouter: function (n, o) { var r = {}; PH_TABLES[n].forEach(function (c) { r[c] = o[c] == null ? '' : o[c]; }); t(n).push(r); sauver(); },
      maj: function (n, k, v, ch) {
        t(n).forEach(function (o) { if (String(o[k]) === String(v)) PH_TABLES[n].forEach(function (c) { if (c in ch) o[c] = ch[c] == null ? '' : ch[c]; }); });
        sauver();
      },
      suppr: function (n, k, v) { data[n] = t(n).filter(function (o) { return String(o[k]) !== String(v); }); sauver(); }
    };
    var outils = {
      maintenant: function (d) { d = d || new Date(); return dateLocale(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); },
      aujourdhui: function () { return dateLocale(new Date()); },
      jeton: function () { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
    };
    var mo = creerPharmacie(store, outils);
    mo.installer();
    return mo.api;
  }

  var enCours = 0;
  function occupe(d) { enCours += d; el('occupe').hidden = enCours <= 0; }

  function appel(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    occupe(1);
    var p;
    if (ESSAI) {
      p = new Promise(function (res) { setTimeout(res, 60); }).then(function () {
        return JSON.parse(JSON.stringify(local[fn].apply(null, args)));
      });
    } else {
      p = fetch(SERVEUR, { method: 'POST', body: JSON.stringify({ fn: fn, args: args }) })
        .catch(function () { throw new Error('Pas de connexion. Vérifiez internet et réessayez.'); })
        .then(function (r) {
          if (!r.ok) throw new Error('Le serveur ne répond pas (' + r.status + '). Réessayez.');
          return r.json().catch(function () { throw new Error('Réponse inattendue du serveur. Réessayez.'); });
        })
        .then(function (j) { if (!j.ok) throw new Error(j.error); return j.result; });
    }
    return p.then(function (v) { occupe(-1); return v; }, function (e) {
      occupe(-1);
      if (/Session expirée/.test(e.message)) { oublierSession(); demarrer(); }
      throw e;
    });
  }

  /* ================================================================== */
  /* Petits outils d'affichage                                           */
  /* ================================================================== */
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function F(n) { return Math.round(Number(n || 0)).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' F'; }
  function Fsigne(n) { n = Number(n || 0); return (n > 0 ? '+' : n < 0 ? '−' : '') + F(Math.abs(n)); }
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function dObj(d) { return new Date(d + 'T12:00:00'); }
  function dateLongue(d) { var x = dObj(d); return JOURS[x.getDay()] + ' ' + x.getDate() + ' ' + MOIS[x.getMonth()] + ' ' + x.getFullYear(); }
  var MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function dateCourte(d) { if (!d) return ''; var x = dObj(d.slice(0, 10)); return x.getDate() + ' ' + MOIS_COURTS[x.getMonth()]; }
  function moisLong(m) { var p = m.split('-'); return MOIS[Number(p[1]) - 1] + ' ' + p[0]; }
  function decaler(d, n) { var x = dObj(d); x.setDate(x.getDate() + n); return dateLocale(x); }
  function decalerMois(m, n) { var p = m.split('-').map(Number); var x = new Date(p[0], p[1] - 1 + n, 1); return x.getFullYear() + '-' + pad(x.getMonth() + 1); }
  function heure(s) { return s ? String(s).slice(11, 16) : ''; }
  function initiales(nom) {
    var p = String(nom || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    var der = p.length > 1 ? p[p.length - 1] : '';
    return (p[0].charAt(0) + (/^\d+$/.test(der) ? der : der.charAt(0))).toUpperCase();
  }
  function avatar(u, cls) { return '<span class="avatar ' + esc(u.role) + ' ' + (cls || '') + '">' + esc(initiales(u.nom)) + '</span>'; }
  function lireMontant(v) { return String(v || '').replace(/[^\d]/g, ''); }
  function formatSaisie(v) { var n = lireMontant(v); return n ? Number(n).toLocaleString('fr-FR').replace(/ | /g, ' ') : ''; }

  function toast(msg, err) {
    var h = el('toastHote'); h.innerHTML = '';
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    h.appendChild(t); setTimeout(function () { t.remove(); }, err ? 4200 : 2800);
  }
  function erreur(e) { toast((e && e.message) || String(e), true); }

  var ICONES = {
    accueil: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    caisse: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V4h10v3"/><path d="M3 12h18"/><circle cx="12" cy="16" r="1.5"/>',
    operations: '<path d="M7 4v16"/><path d="M3 8l4-4 4 4"/><path d="M17 20V4"/><path d="M13 16l4 4 4-4"/>',
    demandes: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 15l2 2 4-4"/>',
    bilan: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    camion: '<path d="M2 7h11v10H2z"/><path d="M13 10h5l3 3v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 5 1.8 5 4.5"/>',
    cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    journal: '<path d="M6 3h11l3 3v15H6z"/><path d="M9 9h8M9 13h8M9 17h5"/>',
    sortir: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
    nom: '<path d="M4 20h16"/><path d="M6 16l9-9 3 3-9 9H6z"/>'
  };
  function icone(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[n] + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 5h10v10h10v10H25v10H15V25H5V15h10z" fill="#fff"/></svg>';

  /* ================================================================== */
  /* Feuille (fenêtre du bas)                                            */
  /* ================================================================== */
  var feuilleOuverte = null;
  function ouvrirFeuille(titre, html, auMontage) {
    fermerFeuille();
    var v = document.createElement('div');
    v.className = 'voile';
    v.innerHTML = '<div class="feuille" role="dialog" aria-modal="true" aria-label="' + esc(titre) + '"><div class="feuille-entete"><h2>' + esc(titre) +
      '</h2><button class="fermer" data-act="fermer" aria-label="Fermer">×</button></div><div class="feuille-corps">' + html + '</div></div>';
    v.addEventListener('click', function (e) { if (e.target === v) fermerFeuille(); });
    document.body.appendChild(v);
    document.body.style.overflow = 'hidden';
    feuilleOuverte = v;
    if (auMontage) auMontage(v);
    return v;
  }
  function fermerFeuille() {
    if (feuilleOuverte) { feuilleOuverte.remove(); feuilleOuverte = null; document.body.style.overflow = ''; }
  }

  /* ================================================================== */
  /* État                                                                */
  /* ================================================================== */
  var S = { session: null, d: null, onglet: 'accueil', dateCaisse: null, dateOps: null, mois: null, journee: {}, bilan: null };
  try { S.session = JSON.parse(localStorage.getItem(CLE_SESSION) || 'null'); } catch (e) {}
  function garderSession(s) { S.session = s; try { localStorage.setItem(CLE_SESSION, JSON.stringify(s)); } catch (e) {} }
  function oublierSession() { S.session = null; S.d = null; try { localStorage.removeItem(CLE_SESSION); } catch (e) {} }
  function jeton() { return S.session && S.session.jeton; }
  function peut(d) { return S.d && S.d.droits.indexOf(d) !== -1; }
  var racine = el('racine');
  el('bandeauEssai').hidden = !ESSAI;

  /* ================================================================== */
  /* Démarrage et connexion                                              */
  /* ================================================================== */
  function chargement(msg) {
    racine.innerHTML = '<div class="ecran-centre"><div class="logo">' + LOGO + '</div><p class="sous-titre" style="margin-top:18px">' + esc(msg || 'Chargement…') + '</p></div>';
  }
  function echec(msg, retry) {
    racine.innerHTML = '<div class="ecran-centre"><div class="logo">' + LOGO + '</div><p class="sous-titre" style="margin-top:18px">' + esc(msg) +
      '</p><button class="btn" id="reessayer" style="margin-top:16px">Réessayer</button></div>';
    el('reessayer').onclick = retry;
  }

  function demarrer() {
    fermerFeuille();
    chargement();
    if (jeton()) {
      appel('charger', jeton()).then(function (d) {
        S.d = d;
        if (d.pinAChanger) return ecranNouveauCode(null);
        ouvrirApp();
      }, function (e) {
        if (!S.session) return; // déjà renvoyé vers les profils
        echec(e.message, demarrer);
      });
      return;
    }
    appel('profils').then(ecranProfils, function (e) { echec(e.message, demarrer); });
  }

  function ecranProfils(p) {
    document.title = p.nomPharmacie + ' — Gestion';
    racine.innerHTML = '<div class="ecran-centre"><div class="logo">' + LOGO + '</div><h1 class="titre-app">' + esc(p.nomPharmacie) +
      '</h1><p class="sous-titre">Qui êtes-vous ?</p><div class="grille-profils">' +
      p.profils.map(function (u) {
        return '<button class="profil" data-id="' + esc(u.id) + '">' + avatar(u) + '<span><span class="nom">' + esc(u.nom) +
          '</span>' + (u.roleNom !== u.nom ? '<br><span class="role">' + esc(u.roleNom) + '</span>' : '') + '</span></button>';
      }).join('') + '</div></div>';
    racine.querySelectorAll('.profil').forEach(function (b) {
      b.onclick = function () { ecranCode(p.profils.filter(function (u) { return u.id === b.dataset.id; })[0], p); };
    });
  }

  /** Clavier à 4 chiffres réutilisable. */
  function clavier(conteneur, titre, sousTitre, surCode, retour) {
    var code = '';
    conteneur.innerHTML = '<div class="ecran-centre">' + titre + '<p class="sous-titre">' + esc(sousTitre) + '</p>' +
      '<div class="pin-points">' + '<span></span>'.repeat(4) + '</div><div class="pin-erreur" id="pinErr"></div>' +
      '<div class="clavier">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-n="' + n + '">' + n + '</button>'; }).join('') +
      '<button class="vide" tabindex="-1"></button><button data-n="0">0</button><button class="effacer" data-n="x" aria-label="Effacer">⌫</button></div>' +
      (retour ? '<button class="lien" id="pinRetour" style="margin-top:14px">← Changer de profil</button>' : '') + '</div>';
    var points = conteneur.querySelectorAll('.pin-points span');
    function maj() { points.forEach(function (p, i) { p.classList.toggle('plein', i < code.length); }); }
    var bloque = false;
    function touche(n) {
      if (bloque) return;
      if (n === 'x') code = code.slice(0, -1);
      else if (code.length < 4) code += n;
      maj();
      if (code.length === 4) {
        bloque = true;
        var c = code;
        Promise.resolve(surCode(c)).then(function (garder) {
          bloque = false;
          if (!garder) { code = ''; maj(); }
        }, function (e) {
          bloque = false; code = ''; maj();
          el('pinErr').textContent = (e && e.message) || String(e);
        });
      }
    }
    conteneur.querySelectorAll('.clavier button[data-n]').forEach(function (b) { b.onclick = function () { el('pinErr').textContent = ''; touche(b.dataset.n); }; });
    document.onkeydown = function (e) {
      if (!conteneur.querySelector('.clavier')) { document.onkeydown = null; return; }
      if (/^\d$/.test(e.key)) touche(e.key); else if (e.key === 'Backspace') touche('x');
    };
    if (retour) el('pinRetour').onclick = retour;
  }

  function ecranCode(u, p) {
    clavier(racine, avatar(u, 'grand') + '<h1 class="titre-app">' + esc(u.nom) + '</h1>', 'Entrez votre code à 4 chiffres', function (code) {
      return appel('connexion', u.id, code).then(function (r) {
        garderSession({ jeton: r.jeton, user: r.user });
        if (r.pinAChanger) { ecranNouveauCode(code); return true; }
        demarrer();
        return true;
      });
    }, function () { ecranProfils(p); });
  }

  function ecranNouveauCode(ancien) {
    var premier = null;
    function etape1() {
      clavier(racine, '<div class="logo">' + LOGO + '</div><h1 class="titre-app">Votre code personnel</h1>',
        'Choisissez un code secret à 4 chiffres. Ne le donnez à personne.', function (c) {
          if (c === '0000' || /^(\d)\1+$/.test(c) || '0123456789'.indexOf(c) !== -1) throw new Error('Code trop facile. Choisissez-en un autre.');
          premier = c; etape2(); return true;
        }, ancien == null ? null : null);
    }
    function etape2() {
      clavier(racine, '<div class="logo">' + LOGO + '</div><h1 class="titre-app">Confirmez le code</h1>', 'Tapez le même code une deuxième fois.', function (c) {
        if (c !== premier) { setTimeout(etape1, 900); throw new Error('Les deux codes sont différents. On recommence.'); }
        return appel('changerPin', jeton(), ancien == null ? '0000' : ancien, c).then(function () { toast('Code enregistré ✓'); demarrer(); return true; });
      });
    }
    etape1();
  }

  function deconnexion() {
    var j = jeton();
    oublierSession();
    if (j) appel('deconnexion', j).catch(function () {});
    S.onglet = 'accueil';
    demarrer();
  }

  /* ================================================================== */
  /* Application                                                         */
  /* ================================================================== */
  function onglets() {
    var o = [{ id: 'accueil', nom: 'Accueil' }];
    if (peut('recettes')) o.push({ id: 'caisse', nom: 'Caisse' });
    if (peut('mouvements')) o.push({ id: 'operations', nom: 'Sorties' });
    o.push({ id: 'demandes', nom: 'Demandes', pastille: (S.d.aRemplacer.length + (S.d.aValider ? S.d.aValider.length : 0)) });
    if (peut('bilan')) o.push({ id: 'bilan', nom: 'Bilan' });
    o.push({ id: 'plus', nom: 'Plus' });
    return o;
  }

  function ouvrirApp() {
    document.title = S.d.nomPharmacie + ' — Gestion';
    var aujourdhui = S.d.aujourdhui;
    S.dateCaisse = S.dateCaisse || aujourdhui;
    S.dateOps = S.dateOps || aujourdhui;
    S.mois = S.mois || aujourdhui.slice(0, 7);
    if (!onglets().some(function (o) { return o.id === S.onglet; })) S.onglet = 'accueil';
    var u = S.d.user;
    racine.innerHTML = '<header class="entete">' + avatar(u) + '<div class="titre"><b>' + esc(S.d.nomPharmacie) + '</b><span>' + esc(u.nom) + (u.roleNom !== u.nom ? ' · ' + esc(u.roleNom) : '') + '</span></div></header><main id="vue"></main><nav class="onglets" id="nav"></nav>';
    afficher(S.onglet);
  }

  function dessinerNav() {
    el('nav').innerHTML = onglets().map(function (o) {
      return '<button data-onglet="' + o.id + '" class="' + (o.id === S.onglet ? 'actif' : '') + '"' + (o.id === S.onglet ? ' aria-current="page"' : '') + '>' +
        icone(o.id) + o.nom + (o.pastille ? '<span class="pastille">' + o.pastille + '</span>' : '') + '</button>';
    }).join('');
    el('nav').querySelectorAll('button').forEach(function (b) { b.onclick = function () { afficher(b.dataset.onglet); }; });
  }

  function afficher(onglet) {
    S.onglet = onglet;
    dessinerNav();
    window.scrollTo(0, 0);
    VUES[onglet]();
  }

  /** Recharge les données générales (pastilles…) puis la vue en cours. */
  function rafraichir() {
    return appel('charger', jeton()).then(function (d) { S.d = d; if (el('vue')) afficher(S.onglet); }).catch(erreur);
  }

  var VUES = {};

  /* ---------------------------- Accueil ---------------------------- */
  VUES.accueil = function () {
    var d = S.d, u = d.user;
    var h = new Date().getHours();
    var html = '<div class="salut"><h1>' + (h < 18 ? 'Bonjour' : 'Bonsoir') + ' ' + esc(u.nom.split(' ')[0]) + '</h1><p>' + esc(dateLongue(d.aujourdhui)) + '</p></div>';
    html += blocRemplacements();
    if (d.aValider && d.aValider.length) {
      html += '<div class="carte" style="border-color:#F1D9AE;background:var(--orange-clair)"><div class="carte-titre"><h2>' + d.aValider.length +
        ' demande' + (d.aValider.length > 1 ? 's' : '') + ' à traiter</h2><button class="btn petit" data-act="aller" data-onglet="demandes">Voir</button></div>' +
        '<div class="petit doux">' + d.aValider.slice(0, 3).map(function (x) { return esc(x.demandeur) + ' — ' + esc(x.type); }).join('<br>') + '</div></div>';
    }
    var rapides = [];
    if (peut('recettes')) rapides.push('<button class="btn" data-act="nouvelleCaisse">' + icone('caisse') + 'Saisir une caisse</button>');
    if (peut('mouvements')) rapides.push('<button class="btn secondaire" data-act="nouveauMouvement" data-sens="Sortie">' + icone('operations') + 'Nouvelle sortie</button>');
    rapides.push('<button class="btn ' + (rapides.length ? 'contour' : '') + '" data-act="nouvelleDemande">' + icone('demandes') + 'Demander une permission</button>');
    if (peut('mouvements')) rapides.push('<button class="btn contour" data-act="nouveauMouvement" data-sens="Entrée">' + icone('operations') + 'Nouvelle entrée</button>');
    if (peut('recettes') || peut('journee')) html += '<div id="resumeJour"><div class="carte"><h2>Aujourd\'hui</h2><p class="vide-msg">Chargement…</p></div></div>';
    html += '<div class="actions-rapides"' + (rapides.length === 1 ? ' style="grid-template-columns:1fr"' : '') + '>' + rapides.join('') + '</div>';
    html += blocAbsences();
    el('vue').innerHTML = html;
    lierActions(el('vue'));
    if (peut('recettes') || peut('journee')) {
      appel('journee', jeton(), d.aujourdhui).then(function (j) {
        S.journee[j.date] = j;
        if (S.onglet !== 'accueil' || !el('resumeJour')) return;
        el('resumeJour').innerHTML = resumeJour(j);
        lierActions(el('resumeJour'));
      }).catch(erreur);
    }
  };

  function resumeJour(j) {
    function saisie(sess) { return j.recettes.filter(function (r) { return r.session === sess; }); }
    if (!j.totaux) {
      // caissière : seulement l'état des caisses
      return '<div class="carte"><h2>Caisses d\'aujourd\'hui</h2><ul class="liste">' + S.d.listes.sessions.map(function (s) {
        var r = saisie(s);
        return '<li><div class="corps"><div class="ligne1"><span>Caisse du ' + s.toLowerCase() + '</span>' +
          (r.length ? '<span class="puce">Saisie ✓</span>' : '<span class="puce neutre">À saisir</span>') + '</div>' +
          (r.length ? '<div class="ligne2">par ' + r.map(function (x) { return esc(x.saisiPar); }).join(', ') + '</div>' : '') + '</div></li>';
      }).join('') + '</ul></div>';
    }
    var t = j.totaux;
    function ch(l, v, cls) { return '<div class="chiffre ' + (cls || '') + '"><div class="l">' + l + '</div><div class="v num">' + v + '</div></div>'; }
    return '<div class="carte"><div class="carte-titre"><h2>Aujourd\'hui</h2><button class="btn petit contour" data-act="aller" data-onglet="' +
      (peut('mouvements') ? 'operations' : 'caisse') + '">Détail</button></div><div class="chiffres">' +
      ch('Recettes du jour', F(t.recettes), 'fort') +
      ch('Solde espèces', F(t.soldeEspeces)) +
      S.d.listes.sessions.map(function (s) {
        var n = saisie(s).length;
        return ch('Caisse du ' + s.toLowerCase(), n ? F(t.parSession[s]) : '<span class="doux" style="font-size:.9rem;font-weight:500">pas encore saisie</span>');
      }).join('') +
      ch('Sorties', F(t.sorties)) + ch('Entrées', F(t.entrees)) +
      '</div>' + (t.ecart ? '<p class="petit" style="margin:10px 0 0;color:' + (t.ecart < 0 ? 'var(--rouge)' : 'var(--doux)') + '">Écart de caisse cumulé : <b class="num">' + Fsigne(t.ecart) + '</b></p>' : '') + '</div>';
  }

  function blocRemplacements() {
    var a = S.d.aRemplacer;
    if (!a.length) return '';
    return '<div class="carte" style="border-color:#BFD5F0;background:var(--bleu-clair)"><h2>On vous demande un remplacement</h2><ul class="liste">' +
      a.map(function (x) {
        return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.demandeur) + '</span><span class="puce bleu">' + esc(x.type) + '</span></div>' +
          '<div class="ligne2">' + esc(periode(x)) + '<br>' + esc(x.motif) + '</div><div class="actions">' +
          '<button class="btn petit" data-act="repondreRemp" data-id="' + esc(x.id) + '" data-oui="1">J\'accepte</button>' +
          '<button class="btn petit danger" data-act="repondreRemp" data-id="' + esc(x.id) + '">Je ne peux pas</button></div></div></li>';
      }).join('') + '</ul></div>';
  }

  function periode(x) {
    var p = x.du === x.au ? dateLongue(x.du) : 'du ' + dateCourte(x.du) + ' au ' + dateCourte(x.au);
    var c = x.creneau && x.creneau !== 'Journée entière' ? ' · ' + x.creneau + (x.heures ? ' (' + x.heures + ')' : '') : '';
    return p + c;
  }

  function blocAbsences() {
    var a = S.d.absences;
    return '<div class="section-titre">Absences prévues (30 jours)</div><div class="carte">' + (a.length ? '<ul class="liste">' + a.map(function (x) {
      return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.demandeur) + '</span><span class="puce neutre">' + esc(x.type) + '</span></div>' +
        '<div class="ligne2">' + esc(periode(x)) + (x.remplacant ? '<br>Remplacé(e) par <b>' + esc(x.remplacant) + '</b>' : '') + '</div></div></li>';
    }).join('') + '</ul>' : '<p class="vide-msg">Personne n\'est absent dans les 30 prochains jours.</p>') + '</div>';
  }

  /* ---------------------------- Caisse ---------------------------- */
  function navDate(cle) {
    var d = S[cle];
    return '<div class="nav-date"><button data-act="jour" data-cle="' + cle + '" data-n="-1" aria-label="Jour précédent">‹</button>' +
      '<input type="date" data-cle="' + cle + '" value="' + d + '" max="' + S.d.aujourdhui + '" aria-label="Date">' +
      '<button data-act="jour" data-cle="' + cle + '" data-n="1" aria-label="Jour suivant"' + (d >= S.d.aujourdhui ? ' disabled' : '') + '>›</button></div>' +
      '<p class="doux petit" style="margin:-6px 2px 12px">' + esc(dateLongue(d)) + (d === S.d.aujourdhui ? ' · aujourd\'hui' : '') + '</p>';
  }

  VUES.caisse = function () {
    var d = S.dateCaisse;
    el('vue').innerHTML = navDate('dateCaisse') + '<button class="btn bloc" data-act="nouvelleCaisse" style="margin-bottom:14px">+ Saisir une caisse</button><div id="listeCaisse"><p class="vide-msg">Chargement…</p></div>';
    lierActions(el('vue'));
    appel('journee', jeton(), d).then(function (j) {
      S.journee[d] = j;
      if (S.onglet !== 'caisse' || S.dateCaisse !== d) return;
      var html = '';
      if (j.totaux && j.recettes.length) {
        html += '<div class="carte"><div class="chiffres">' +
          '<div class="chiffre fort"><div class="l">Recettes du jour</div><div class="v num">' + F(j.totaux.recettes) + '</div></div>' +
          '<div class="chiffre' + (j.totaux.ecart < 0 ? ' rouge' : '') + '"><div class="l">Écart (vs logiciel)</div><div class="v num">' + Fsigne(j.totaux.ecart) + '</div></div></div></div>';
      }
      html += j.recettes.length ? j.recettes.map(carteRecette).join('') : '<div class="carte"><p class="vide-msg">Aucune caisse saisie pour ce jour.</p></div>';
      el('listeCaisse').innerHTML = html;
      lierActions(el('listeCaisse'));
    }).catch(erreur);
  };

  function carteRecette(r) {
    if (r.masque) {
      return '<div class="carte"><div class="carte-titre"><h2>Caisse du ' + esc(r.session.toLowerCase()) + '</h2><span class="puce">Saisie ✓</span></div>' +
        '<p class="petit doux" style="margin:0">Saisie par ' + esc(r.saisiPar) + '</p></div>';
    }
    var det = S.d.listes.encaissements.filter(function (e) { return Number(r[e.cle]); }).map(function (e) {
      return '<span class="k">' + esc(e.nom) + '</span><span class="num droite">' + F(r[e.cle]) + '</span>';
    }).join('');
    var ecart = '';
    if (r.logiciel !== '' && r.logiciel != null) {
      var ec = Number(r.ecart || 0);
      ecart = '<div class="ecart ' + (ec === 0 ? 'ok' : 'ko') + '" style="margin:10px 0 0">Logiciel : <b class="num">' + F(r.logiciel) + '</b> · ' +
        (ec === 0 ? 'Caisse juste ✓' : (ec < 0 ? 'Manque ' : 'Excédent ') + '<b class="num">' + F(Math.abs(ec)) + '</b>') + '</div>';
    }
    return '<div class="carte"><div class="carte-titre"><h2>Caisse du ' + esc(r.session.toLowerCase()) + '</h2><b class="num" style="font-size:1.15rem">' + F(r.total) + '</b></div>' +
      '<div class="detail">' + det + '</div>' + ecart +
      (r.observation ? '<p class="petit" style="margin:10px 0 0">« ' + esc(r.observation) + ' »</p>' : '') +
      '<p class="petit doux" style="margin:10px 0 0">Saisie par ' + esc(r.saisiPar) + ' à ' + esc(heure(r.saisiLe)) +
      (r.modifiePar ? ' · modifiée par ' + esc(r.modifiePar) + ' le ' + esc(dateCourte(r.modifieLe)) + ' à ' + esc(heure(r.modifieLe)) : '') + '</p>' +
      (r.modifiable ? '<div class="rangee-btn" style="margin-top:12px"><button class="btn petit contour" data-act="modifierCaisse" data-id="' + esc(r.id) + '">Modifier</button>' +
        '<button class="btn petit danger" data-act="supprimerCaisse" data-id="' + esc(r.id) + '">Supprimer</button></div>' : '') + '</div>';
  }

  function trouverRecette(id) {
    var res = null;
    Object.keys(S.journee).forEach(function (k) { S.journee[k].recettes.forEach(function (r) { if (r.id === id) res = r; }); });
    return res;
  }

  function formCaisse(r) {
    r = r || {};
    var L = S.d.listes;
    var sess = r.session || (new Date().getHours() < 14 ? 'Matin' : 'Soir');
    var date = r.date || (S.onglet === 'caisse' ? S.dateCaisse : S.d.aujourdhui);
    var html = '<form id="fCaisse" autocomplete="off">' +
      '<div class="champ"><label>Caisse</label><div class="segment" id="segSession">' + L.sessions.map(function (s) {
        return '<button type="button" data-v="' + s + '" class="' + (s === sess ? 'actif' : '') + '">' + s + '</button>';
      }).join('') + '</div></div>' +
      '<div class="champ"><label for="cDate">Date</label><input type="date" id="cDate" value="' + date + '" max="' + S.d.aujourdhui + '" required></div>' +
      '<div class="section-titre" style="margin-top:6px">Encaissements (en francs CFA)</div><div class="carte" style="padding:8px 14px">' +
      L.encaissements.map(function (e) {
        return '<div class="montant-ligne"><label for="m_' + e.cle + '">' + esc(e.nom) + '</label><input id="m_' + e.cle + '" data-m="' + e.cle +
          '" inputmode="numeric" placeholder="0" value="' + (Number(r[e.cle]) ? formatSaisie(r[e.cle]) : '') + '"></div>';
      }).join('') + '</div>' +
      '<div class="total-bloc"><span>Total encaissé</span><span class="num" id="cTotal">0 F</span></div>' +
      '<div class="champ"><label for="cLogiciel">Chiffre indiqué par le logiciel / ticket Z</label><input id="cLogiciel" inputmode="numeric" placeholder="Facultatif" value="' +
      (r.logiciel !== '' && r.logiciel != null ? formatSaisie(r.logiciel) : '') + '"><div class="aide">Pour calculer automatiquement le manque ou l\'excédent.</div></div>' +
      '<div id="cEcart"></div>' +
      '<div class="champ"><label for="cObs">Observation</label><textarea id="cObs" placeholder="Billet abîmé, client à crédit, erreur de rendu…">' + esc(r.observation || '') + '</textarea></div>' +
      '<button class="btn bloc" type="submit">' + (r.id ? 'Enregistrer les modifications' : 'Enregistrer la caisse') + '</button></form>';
    ouvrirFeuille(r.id ? 'Modifier la caisse' : 'Saisir une caisse', html, function (v) {
      var f = v.querySelector('#fCaisse');
      v.querySelectorAll('#segSession button').forEach(function (b) {
        b.onclick = function () { sess = b.dataset.v; v.querySelectorAll('#segSession button').forEach(function (x) { x.classList.toggle('actif', x === b); }); };
      });
      function calc() {
        var t = 0;
        v.querySelectorAll('[data-m]').forEach(function (i) { t += Number(lireMontant(i.value) || 0); });
        v.querySelector('#cTotal').textContent = F(t);
        var lg = lireMontant(v.querySelector('#cLogiciel').value);
        var ec = v.querySelector('#cEcart');
        if (lg === '') { ec.innerHTML = ''; return; }
        var e = t - Number(lg);
        ec.innerHTML = '<div class="ecart ' + (e === 0 ? 'ok' : 'ko') + '">' + (e === 0 ? 'Caisse juste ✓' : (e < 0 ? 'Manque : ' : 'Excédent : ') + '<b class="num">' + F(Math.abs(e)) + '</b>') + '</div>';
      }
      v.querySelectorAll('[data-m], #cLogiciel').forEach(function (i) {
        i.addEventListener('input', function () {
          var pos = i.value.length - i.selectionStart;
          i.value = formatSaisie(i.value);
          try { i.setSelectionRange(i.value.length - pos, i.value.length - pos); } catch (e) {}
          calc();
        });
      });
      calc();
      f.onsubmit = function (ev) {
        ev.preventDefault();
        var o = { id: r.id || '', date: v.querySelector('#cDate').value, session: sess, observation: v.querySelector('#cObs').value,
          logiciel: lireMontant(v.querySelector('#cLogiciel').value) };
        v.querySelectorAll('[data-m]').forEach(function (i) { o[i.dataset.m] = lireMontant(i.value); });
        var deja = S.journee[o.date] && S.journee[o.date].recettes.filter(function (x) { return x.session === o.session && x.id !== o.id; });
        if (deja && deja.length && !confirm('Une caisse du ' + o.session.toLowerCase() + ' existe déjà pour ce jour (saisie par ' + deja[0].saisiPar + '). En ajouter une autre ?')) return;
        var btn = f.querySelector('[type=submit]'); btn.disabled = true;
        appel('enregistrerRecette', jeton(), o).then(function () {
          fermerFeuille(); toast('Caisse enregistrée ✓');
          S.dateCaisse = o.date;
          if (S.onglet === 'caisse' || S.onglet === 'accueil') afficher(S.onglet);
        }, function (e) { btn.disabled = false; erreur(e); });
      };
    });
  }

  /* ---------------------------- Sorties / entrées ---------------------------- */
  VUES.operations = function () {
    var d = S.dateOps;
    el('vue').innerHTML = navDate('dateOps') +
      '<div class="rangee-btn" style="margin-bottom:14px"><button class="btn" data-act="nouveauMouvement" data-sens="Sortie">− Sortie</button>' +
      '<button class="btn secondaire" data-act="nouveauMouvement" data-sens="Entrée">+ Entrée</button></div><div id="listeOps"><p class="vide-msg">Chargement…</p></div>';
    lierActions(el('vue'));
    appel('journee', jeton(), d).then(function (j) {
      S.journee[d] = j;
      if (S.onglet !== 'operations' || S.dateOps !== d) return;
      var t = j.totaux;
      var html = '<div class="carte"><div class="chiffres">' +
        '<div class="chiffre"><div class="l">Recettes (caisses)</div><div class="v num">' + F(t.recettes) + '</div></div>' +
        '<div class="chiffre"><div class="l">Sorties</div><div class="v num">' + F(t.sorties) + '</div></div>' +
        '<div class="chiffre"><div class="l">Entrées</div><div class="v num">' + F(t.entrees) + '</div></div>' +
        '<div class="chiffre fort"><div class="l">Solde espèces</div><div class="v num">' + F(t.soldeEspeces) + '</div></div></div>' +
        '<p class="petit doux" style="margin:10px 0 0">Solde espèces = espèces des caisses + entrées en espèces − sorties en espèces.</p></div>';
      var sorties = j.mouvements.filter(function (x) { return x.sens === 'Sortie'; });
      var entrees = j.mouvements.filter(function (x) { return x.sens === 'Entrée'; });
      html += '<div class="section-titre">Sorties du jour</div><div class="carte">' + listeMouvements(sorties, 'Aucune sortie ce jour.') + '</div>';
      html += '<div class="section-titre">Entrées du jour</div><div class="carte">' + listeMouvements(entrees, 'Aucune entrée ce jour.') + '</div>';
      el('listeOps').innerHTML = html;
      lierActions(el('listeOps'));
    }).catch(erreur);
  };

  function listeMouvements(l, vide) {
    if (!l.length) return '<p class="vide-msg">' + vide + '</p>';
    return '<ul class="liste">' + l.map(function (x) {
      return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.fournisseur || x.categorie) + '</span><span class="num">' + F(x.montant) + '</span></div>' +
        '<div class="ligne2">' + (x.fournisseur ? esc(x.categorie) + ' · ' : '') + esc(x.mode) + (x.reference ? ' · N° ' + esc(x.reference) : '') +
        (x.libelle ? '<br>' + esc(x.libelle) : '') + '<br>Par ' + esc(x.saisiPar) + ' à ' + esc(heure(x.saisiLe)) +
        (x.modifiePar ? ' · modifiée par ' + esc(x.modifiePar) : '') + '</div>' +
        (x.modifiable ? '<div class="actions"><button class="btn petit contour" data-act="modifierMouvement" data-id="' + esc(x.id) + '">Modifier</button>' +
          '<button class="btn petit danger" data-act="supprimerMouvement" data-id="' + esc(x.id) + '">Supprimer</button></div>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }

  function trouverMouvement(id) {
    var res = null;
    Object.keys(S.journee).forEach(function (k) { (S.journee[k].mouvements || []).forEach(function (r) { if (r.id === id) res = r; }); });
    return res;
  }

  function optionsFournisseurs(sel) {
    var f = (S.d.fournisseurs || []).filter(function (x) { return x.actif || x.id === sel; });
    var p = f.filter(function (x) { return x.principal; }), a = f.filter(function (x) { return !x.principal; });
    function opt(x) { return '<option value="' + esc(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.nom) + '</option>'; }
    return '<option value="">— Choisir —</option>' +
      (p.length ? '<optgroup label="Principaux">' + p.map(opt).join('') + '</optgroup>' : '') +
      (a.length ? '<optgroup label="Autres fournisseurs">' + a.map(opt).join('') + '</optgroup>' : '') +
      (peut('fournisseurs') ? '<option value="__nouveau">+ Nouveau fournisseur…</option>' : '');
  }

  function formMouvement(m) {
    m = m || {};
    var L = S.d.listes;
    var sens = m.sens || 'Sortie';
    var date = m.date || (S.onglet === 'operations' ? S.dateOps : S.d.aujourdhui);
    function cats() { return sens === 'Entrée' ? L.entrees : L.sorties; }
    var html = '<form id="fMvt" autocomplete="off">' +
      (m.id ? '' : '<div class="champ"><div class="segment" id="segSens"><button type="button" data-v="Sortie">Sortie (paiement)</button><button type="button" data-v="Entrée">Entrée d\'argent</button></div></div>') +
      '<div class="champ"><label for="oDate">Date</label><input type="date" id="oDate" value="' + date + '" max="' + S.d.aujourdhui + '" required></div>' +
      '<div class="champ"><label for="oCat">Catégorie</label><select id="oCat" required></select></div>' +
      '<div class="champ" id="zFour"><label for="oFour">Fournisseur</label><select id="oFour">' + optionsFournisseurs(m.fournisseurId) + '</select>' +
      '<input id="oFourNouveau" placeholder="Nom du nouveau fournisseur" style="margin-top:8px" hidden></div>' +
      '<div class="champ"><label for="oMontant">Montant (F CFA)</label><input id="oMontant" inputmode="numeric" required placeholder="0" value="' + (m.montant ? formatSaisie(m.montant) : '') + '" style="font-size:1.2rem;font-weight:700"></div>' +
      '<div class="deux"><div class="champ"><label for="oMode">Payé par</label><select id="oMode">' + L.modes.map(function (x) {
        return '<option' + (x === (m.mode || 'Espèces') ? ' selected' : '') + '>' + esc(x) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="champ" id="zRef"><label for="oRef">N° facture / BL</label><input id="oRef" value="' + esc(m.reference || '') + '" placeholder="Facultatif"></div></div>' +
      '<div class="champ"><label for="oLib">Détail</label><input id="oLib" value="' + esc(m.libelle || '') + '" placeholder="Ex. : facture de novembre, achat de sachets…"></div>' +
      '<button class="btn bloc" type="submit">' + (m.id ? 'Enregistrer les modifications' : 'Enregistrer') + '</button></form>';
    ouvrirFeuille(m.id ? 'Modifier l\'opération' : 'Nouvelle opération', html, function (v) {
      var selCat = v.querySelector('#oCat'), selFour = v.querySelector('#oFour'), nouveau = v.querySelector('#oFourNouveau');
      function remplirCats(garder) {
        selCat.innerHTML = '<option value="">— Choisir —</option>' + cats().map(function (c) {
          return '<option' + (c.nom === garder ? ' selected' : '') + '>' + esc(c.nom) + '</option>';
        }).join('');
        majFour();
      }
      function majFour() {
        var c = cats().filter(function (x) { return x.nom === selCat.value; })[0];
        v.querySelector('#zFour').hidden = !(c && c.fournisseur);
        v.querySelector('#zRef').style.visibility = sens === 'Sortie' ? '' : 'hidden';
        nouveau.hidden = selFour.value !== '__nouveau';
      }
      function majSens() {
        v.querySelectorAll('#segSens button').forEach(function (b) { b.classList.toggle('actif', b.dataset.v === sens); });
        v.querySelector('.feuille-entete h2').textContent = m.id ? 'Modifier l\'opération' : (sens === 'Sortie' ? 'Nouvelle sortie' : 'Nouvelle entrée');
        remplirCats(m.categorie || (sens === 'Sortie' ? 'Fournisseur (achats)' : ''));
      }
      v.querySelectorAll('#segSens button').forEach(function (b) { b.onclick = function () { sens = b.dataset.v; m.categorie = ''; majSens(); }; });
      selCat.onchange = majFour;
      selFour.onchange = function () { majFour(); if (!nouveau.hidden) nouveau.focus(); };
      var mt = v.querySelector('#oMontant');
      mt.addEventListener('input', function () { mt.value = formatSaisie(mt.value); });
      majSens();
      var f = v.querySelector('#fMvt');
      f.onsubmit = function (ev) {
        ev.preventDefault();
        var o = { id: m.id || '', sens: sens, date: v.querySelector('#oDate').value, categorie: selCat.value, fournisseurId: selFour.value,
          montant: lireMontant(mt.value), mode: v.querySelector('#oMode').value, reference: sens === 'Sortie' ? v.querySelector('#oRef').value : '',
          libelle: v.querySelector('#oLib').value };
        var c = cats().filter(function (x) { return x.nom === o.categorie; })[0];
        if (!c || !c.fournisseur) o.fournisseurId = '';
        var btn = f.querySelector('[type=submit]'); btn.disabled = true;
        var avant = Promise.resolve();
        if (o.fournisseurId === '__nouveau') {
          var nom = nouveau.value.trim();
          if (!nom) { btn.disabled = false; return erreur('Écrivez le nom du nouveau fournisseur.'); }
          avant = appel('enregistrerFournisseur', jeton(), { nom: nom }).then(function (liste) {
            S.d.fournisseurs = liste;
            o.fournisseurId = liste.filter(function (x) { return x.nom.toLowerCase() === nom.toLowerCase(); })[0].id;
          });
        }
        avant.then(function () { return appel('enregistrerMouvement', jeton(), o); }).then(function () {
          fermerFeuille(); toast((sens === 'Sortie' ? 'Sortie' : 'Entrée') + ' enregistrée ✓');
          S.dateOps = o.date;
          if (S.onglet === 'operations' || S.onglet === 'accueil') afficher(S.onglet);
        }, function (e) { btn.disabled = false; erreur(e); });
      };
    });
  }

  /* ---------------------------- Demandes ---------------------------- */
  function puceStatut(s) {
    var cls = s === 'Acceptée' ? '' : s === 'Refusée' ? 'refus' : s === 'Annulée' ? 'neutre' : 'attente';
    return '<span class="puce ' + cls + '">' + esc(s) + '</span>';
  }

  VUES.demandes = function () {
    var d = S.d, html = '<button class="btn bloc" data-act="nouvelleDemande" style="margin-bottom:14px">+ Nouvelle demande</button>';
    html += blocRemplacements();
    if (d.aValider) {
      html += '<div class="section-titre">À traiter</div><div class="carte">' + (d.aValider.length ? '<ul class="liste">' + d.aValider.map(function (x) {
        return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.demandeur) + '</span>' + puceStatut(x.statut) + '</div>' +
          '<div class="ligne2"><b>' + esc(x.type) + '</b> · ' + esc(periode(x)) + '<br>Motif : ' + esc(x.motif) +
          (x.remplacant ? '<br>Remplaçant : <b>' + esc(x.remplacant) + '</b>' + (x.reponseRemplacant ? ' (' + esc(x.reponseRemplacant.split(' le ')[0].toLowerCase()) + ')' : ' (n\'a pas encore répondu)') : '') +
          '<br><span class="petit">Envoyée le ' + esc(dateCourte(x.creeLe)) + ' à ' + esc(heure(x.creeLe)) + '</span></div>' +
          '<div class="champ" style="margin:8px 0 0"><input data-com="' + esc(x.id) + '" placeholder="Commentaire (facultatif)"></div>' +
          '<div class="actions"><button class="btn petit" data-act="traiter" data-id="' + esc(x.id) + '" data-oui="1">Accepter</button>' +
          '<button class="btn petit danger" data-act="traiter" data-id="' + esc(x.id) + '">Refuser</button></div></div></li>';
      }).join('') + '</ul>' : '<p class="vide-msg">Aucune demande en attente.</p>') + '</div>';
    }
    html += '<div class="section-titre">Mes demandes</div><div class="carte">' + (d.mesDemandes.length ? '<ul class="liste">' + d.mesDemandes.map(function (x) {
      var annulable = (x.statut === 'En attente' || x.statut === 'En attente du remplaçant' || (x.statut === 'Acceptée' && x.du >= d.aujourdhui));
      return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.type) + '</span>' + puceStatut(x.statut) + '</div>' +
        '<div class="ligne2">' + esc(periode(x)) + (x.remplacant ? '<br>Remplaçant : ' + esc(x.remplacant) : '') +
        (x.commentaire ? '<br>Réponse : « ' + esc(x.commentaire) + ' »' : '') + (x.valideur ? '<br>Par ' + esc(x.valideur) : '') + '</div>' +
        (annulable ? '<div class="actions"><button class="btn petit contour" data-act="annulerDemande" data-id="' + esc(x.id) + '">Annuler ma demande</button></div>' : '') + '</div></li>';
    }).join('') + '</ul>' : '<p class="vide-msg">Vous n\'avez encore fait aucune demande.</p>') + '</div>';
    html += blocAbsences();
    if (d.aValider) html += '<button class="btn bloc contour" data-act="historique" style="margin-top:4px">Historique des demandes</button>';
    el('vue').innerHTML = html;
    lierActions(el('vue'));
  };

  function formDemande() {
    var L = S.d.listes, aujourdhui = S.d.aujourdhui;
    var autres = S.d.equipe.filter(function (u) { return u.id !== S.d.user.id; });
    var html = '<form id="fDem" autocomplete="off">' +
      '<div class="champ"><label for="dType">Type de demande</label><select id="dType">' + L.typesDemande.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="deux"><div class="champ"><label for="dDu">Du</label><input type="date" id="dDu" value="' + aujourdhui + '" required></div>' +
      '<div class="champ"><label for="dAu">Au</label><input type="date" id="dAu" value="' + aujourdhui + '"></div></div>' +
      '<div class="champ"><label for="dCreneau">Moment</label><select id="dCreneau">' + L.creneaux.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="champ" id="zHeures" hidden><label for="dHeures">Heures</label><input id="dHeures" placeholder="Ex. : de 10 h à 12 h"></div>' +
      '<div class="champ"><label for="dRemp">Qui vous remplace ?</label><select id="dRemp"><option value="">Personne / à voir avec le gérant</option>' +
      autres.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nom) + '</option>'; }).join('') + '</select>' +
      '<div class="aide">La personne choisie doit d\'abord accepter, puis le gérant valide.</div></div>' +
      '<div class="champ"><label for="dMotif">Motif</label><textarea id="dMotif" required placeholder="Ex. : rendez-vous médical, deuil, examen…"></textarea></div>' +
      '<button class="btn bloc" type="submit">Envoyer la demande</button></form>';
    ouvrirFeuille('Nouvelle demande', html, function (v) {
      var du = v.querySelector('#dDu'), au = v.querySelector('#dAu'), cr = v.querySelector('#dCreneau');
      du.onchange = function () { if (!au.value || au.value < du.value) au.value = du.value; };
      cr.onchange = function () { v.querySelector('#zHeures').hidden = cr.value !== 'Quelques heures'; };
      v.querySelector('#fDem').onsubmit = function (ev) {
        ev.preventDefault();
        var btn = this.querySelector('[type=submit]'); btn.disabled = true;
        appel('nouvelleDemande', jeton(), { type: v.querySelector('#dType').value, du: du.value, au: au.value, creneau: cr.value,
          heures: v.querySelector('#dHeures').value, remplacantId: v.querySelector('#dRemp').value, motif: v.querySelector('#dMotif').value })
          .then(function () { fermerFeuille(); toast('Demande envoyée ✓'); S.onglet = 'demandes'; return rafraichir(); }, function (e) { btn.disabled = false; erreur(e); });
      };
    });
  }

  function historique(mois) {
    mois = mois || S.d.aujourdhui.slice(0, 7);
    appel('historiqueDemandes', jeton(), mois).then(function (l) {
      var html = '<div class="nav-date"><button data-h="-1" aria-label="Mois précédent">‹</button><input type="month" id="hMois" value="' + mois + '"><button data-h="1" aria-label="Mois suivant">›</button></div>' +
        '<div class="carte">' + (l.length ? '<ul class="liste">' + l.map(function (x) {
          return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.demandeur) + '</span>' + puceStatut(x.statut) + '</div><div class="ligne2"><b>' + esc(x.type) + '</b> · ' +
            esc(periode(x)) + '<br>' + esc(x.motif) + (x.remplacant ? '<br>Remplaçant : ' + esc(x.remplacant) : '') + (x.valideur ? '<br>Traitée par ' + esc(x.valideur) : '') +
            (x.commentaire ? ' — « ' + esc(x.commentaire) + ' »' : '') + '</div></div></li>';
        }).join('') + '</ul>' : '<p class="vide-msg">Aucune demande pour ' + esc(moisLong(mois)) + '.</p>') + '</div>';
      ouvrirFeuille('Historique des demandes', html, function (v) {
        v.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { historique(decalerMois(mois, Number(b.dataset.h))); }; });
        v.querySelector('#hMois').onchange = function () { if (this.value) historique(this.value); };
      });
    }).catch(erreur);
  }

  /* ---------------------------- Bilan ---------------------------- */
  VUES.bilan = function () {
    var m = S.mois;
    el('vue').innerHTML = '<div class="nav-date"><button data-act="mois" data-n="-1" aria-label="Mois précédent">‹</button><input type="month" id="bMois" value="' + m + '" max="' + S.d.aujourdhui.slice(0, 7) + '" aria-label="Mois">' +
      '<button data-act="mois" data-n="1" aria-label="Mois suivant"' + (m >= S.d.aujourdhui.slice(0, 7) ? ' disabled' : '') + '>›</button></div>' +
      '<h2 style="margin:0 2px 12px;text-transform:capitalize">' + esc(moisLong(m)) + '</h2><div id="bilanCorps"><p class="vide-msg">Chargement…</p></div>';
    lierActions(el('vue'));
    el('bMois').onchange = function () { if (this.value) { S.mois = this.value; VUES.bilan(); } };
    appel('bilan', jeton(), m).then(function (b) {
      S.bilan = b;
      if (S.onglet !== 'bilan' || S.mois !== m) return;
      var t = b.totaux, L = S.d.listes;
      function ch(l, v, cls) { return '<div class="chiffre ' + (cls || '') + '"><div class="l">' + l + '</div><div class="v num">' + v + '</div></div>'; }
      function barres(liste, total, cls) {
        if (!liste.length) return '<p class="vide-msg">Rien ce mois-ci.</p>';
        var max = Math.max.apply(null, liste.map(function (x) { return x.montant; })) || 1;
        return '<div class="barres">' + liste.map(function (x) {
          return '<div class="barre ' + (cls || '') + '"><div class="haut"><span>' + esc(x.nom) + '</span><span class="num"><b>' + F(x.montant) + '</b>' +
            (total ? ' <span class="doux">· ' + Math.round(x.montant * 100 / total) + ' %</span>' : '') + '</span></div><div class="rail"><span style="width:' +
            Math.max(2, x.montant * 100 / max) + '%"></span></div></div>';
        }).join('') + '</div>';
      }
      var modes = L.encaissements.map(function (e) { return { nom: e.nom, montant: t.parMode[e.cle] }; }).filter(function (x) { return x.montant; });
      var html = '<div class="carte"><div class="chiffres">' + ch('Recettes du mois', F(t.recettes), 'fort') + ch('Sorties du mois', F(t.sorties)) +
        ch('Dont dépenses', F(t.charges)) + ch('Entrées diverses', F(t.entrees)) +
        ch('Recettes − sorties', Fsigne(t.recettes + t.entrees - t.sorties), (t.recettes + t.entrees - t.sorties) < 0 ? 'rouge' : '') +
        ch('Écarts de caisse', Fsigne(t.ecart), t.ecart < 0 ? 'rouge' : '') + '</div>' +
        '<p class="petit doux" style="margin:10px 0 0">' + b.nbCaisses + ' caisse' + (b.nbCaisses > 1 ? 's' : '') + ' saisie' + (b.nbCaisses > 1 ? 's' : '') +
        '. « Dont dépenses » ne compte pas les versements en banque.</p></div>';
      html += '<div class="section-titre">Recettes par mode de paiement</div><div class="carte">' + barres(modes, t.recettes) + '</div>';
      html += '<div class="section-titre">Sorties par catégorie</div><div class="carte">' + barres(b.parCategorie, t.sorties, 'sortie') + '</div>';
      html += '<div class="section-titre">Paiements aux fournisseurs</div><div class="carte">' + barres(b.parFournisseur, 0, 'sortie') + '</div>';
      html += '<div class="section-titre">Jour par jour</div><div class="carte"><div class="tableau-defile"><table class="tab"><thead><tr><th>Jour</th><th>Matin</th><th>Soir</th><th>Recettes</th><th>Sorties</th></tr></thead><tbody>' +
        (b.jours.length ? b.jours.map(function (j) {
          return '<tr><td>' + esc(dateCourte(j.date)) + '</td><td class="num">' + (j.matin ? F(j.matin) : '—') + '</td><td class="num">' + (j.soir ? F(j.soir) : '—') +
            '</td><td class="num"><b>' + F(j.recettes) + '</b></td><td class="num">' + (j.sorties ? F(j.sorties) : '—') + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="doux" style="text-align:left">Aucune donnée ce mois-ci.</td></tr>') +
        '</tbody>' + (b.jours.length ? '<tfoot><tr><td>Total</td><td class="num">' + F(t.parSession.Matin) + '</td><td class="num">' + F(t.parSession.Soir) + '</td><td class="num">' + F(t.recettes) +
          '</td><td class="num">' + F(t.sorties) + '</td></tr></tfoot>' : '') + '</table></div></div>';
      html += '<div class="section-titre">Télécharger (Excel)</div><div class="rangee-btn"><button class="btn contour" data-act="csv" data-quoi="recettes">Caisses du mois</button>' +
        '<button class="btn contour" data-act="csv" data-quoi="mouvements">Sorties et entrées</button></div>';
      el('bilanCorps').innerHTML = html;
      lierActions(el('bilanCorps'));
    }).catch(erreur);
  };

  function exporterCsv(quoi) {
    var b = S.bilan; if (!b) return;
    var L = S.d.listes, lignes;
    if (quoi === 'recettes') {
      lignes = [['Date', 'Caisse'].concat(L.encaissements.map(function (e) { return e.nom; }), ['Total', 'Logiciel', 'Écart', 'Saisie par', 'Observation'])];
      b.recettes.forEach(function (r) {
        lignes.push([r.date, r.session].concat(L.encaissements.map(function (e) { return r[e.cle]; }), [r.total, r.logiciel, r.ecart, r.saisiPar, r.observation]));
      });
    } else {
      lignes = [['Date', 'Sens', 'Catégorie', 'Fournisseur', 'N° facture/BL', 'Détail', 'Mode', 'Montant', 'Saisie par']];
      b.mouvements.forEach(function (x) { lignes.push([x.date, x.sens, x.categorie, x.fournisseur, x.reference, x.libelle, x.mode, x.montant, x.saisiPar]); });
    }
    var csv = '﻿' + lignes.map(function (l) {
      return l.map(function (v) { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = (quoi === 'recettes' ? 'caisses-' : 'sorties-entrees-') + b.mois + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------------------------- Plus ---------------------------- */
  VUES.plus = function () {
    var items = [];
    if (peut('fournisseurs')) items.push(['fournisseurs', 'camion', 'Fournisseurs', (S.d.fournisseurs || []).filter(function (f) { return f.actif; }).length + ' actifs']);
    if (peut('equipe')) items.push(['equipe', 'equipe', 'Équipe et accès', S.d.equipe.length + ' profils']);
    if (peut('equipe')) items.push(['nomPharmacie', 'nom', 'Nom de la pharmacie', S.d.nomPharmacie]);
    if (peut('journal')) items.push(['journal', 'journal', 'Journal d\'activité', 'Qui a fait quoi']);
    items.push(['monCode', 'cle', 'Changer mon code', '']);
    items.push(['deconnexion', 'sortir', 'Se déconnecter', '']);
    el('vue').innerHTML = '<div class="carte" style="display:flex;gap:12px;align-items:center">' + avatar(S.d.user, 'grand') + '<div><h2>' + esc(S.d.user.nom) +
      '</h2><p class="doux" style="margin:2px 0 0">' + esc(S.d.user.roleNom) + '</p></div></div>' +
      '<div class="carte menu-liste" style="padding:4px 14px">' + items.map(function (i) {
        return '<button data-act="' + i[0] + '">' + icone(i[1]) + '<span>' + esc(i[2]) + (i[3] ? '<br><span class="petit doux">' + esc(i[3]) + '</span>' : '') + '</span><span class="fleche">›</span></button>';
      }).join('') + '</div><p class="petit doux" style="text-align:center">Version ' + esc(S.d.version) + (ESSAI ? ' · mode essai (données sur ce téléphone)' : '') + '</p>';
    lierActions(el('vue'));
  };

  function feuilleFournisseurs(liste) {
    liste = liste || S.d.fournisseurs || [];
    var html = '<div class="rangee-btn" style="margin-bottom:14px"><button class="btn" data-f="ajouter">+ Ajouter</button><button class="btn secondaire" data-f="coller">Coller une liste</button></div>' +
      '<div class="carte">' + (liste.length ? '<ul class="liste">' + liste.map(function (f) {
        return '<li style="cursor:pointer" data-fid="' + esc(f.id) + '"><div class="corps"><div class="ligne1"><span>' + (f.principal ? '★ ' : '') + esc(f.nom) + '</span>' +
          (f.principal ? '<span class="puce">Principal</span>' : '') + (!f.actif ? '<span class="puce neutre">Inactif</span>' : '') + '</div>' +
          (f.telephone || f.contact ? '<div class="ligne2">' + esc([f.contact, f.telephone].filter(Boolean).join(' · ')) + '</div>' : '') + '</div><span class="doux">›</span></li>';
      }).join('') + '</ul>' : '<p class="vide-msg">Aucun fournisseur pour l\'instant. Ajoutez-les un par un, ou collez toute la liste d\'un coup.</p>') + '</div>';
    ouvrirFeuille('Fournisseurs', html, function (v) {
      v.querySelector('[data-f=ajouter]').onclick = function () { formFournisseur({}); };
      v.querySelector('[data-f=coller]').onclick = formColler;
      v.querySelectorAll('[data-fid]').forEach(function (li) {
        li.onclick = function () { formFournisseur(liste.filter(function (f) { return f.id === li.dataset.fid; })[0]); };
      });
    });
  }

  function formFournisseur(f) {
    var html = '<form id="fF" autocomplete="off"><div class="champ"><label for="fNom">Nom</label><input id="fNom" required value="' + esc(f.nom || '') + '"></div>' +
      '<label class="case"><input type="checkbox" id="fPrinc"' + (f.principal ? ' checked' : '') + '> Fournisseur principal (affiché en premier)</label>' +
      '<div class="deux"><div class="champ"><label for="fContact">Contact</label><input id="fContact" value="' + esc(f.contact || '') + '" placeholder="Délégué, commercial…"></div>' +
      '<div class="champ"><label for="fTel">Téléphone</label><input id="fTel" type="tel" value="' + esc(f.telephone || '') + '"></div></div>' +
      '<div class="champ"><label for="fNotes">Notes</label><input id="fNotes" value="' + esc(f.notes || '') + '" placeholder="Jours de livraison, conditions…"></div>' +
      (f.id ? '<label class="case"><input type="checkbox" id="fActif"' + (f.actif ? ' checked' : '') + '> Actif (décocher pour le masquer sans perdre l\'historique)</label>' : '') +
      '<button class="btn bloc" type="submit" style="margin-top:10px">Enregistrer</button><button class="btn bloc contour" type="button" id="fRetour" style="margin-top:8px">Retour à la liste</button></form>';
    ouvrirFeuille(f.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur', html, function (v) {
      v.querySelector('#fRetour').onclick = function () { feuilleFournisseurs(); };
      v.querySelector('#fF').onsubmit = function (ev) {
        ev.preventDefault();
        appel('enregistrerFournisseur', jeton(), { id: f.id || '', nom: v.querySelector('#fNom').value, principal: v.querySelector('#fPrinc').checked,
          contact: v.querySelector('#fContact').value, telephone: v.querySelector('#fTel').value, notes: v.querySelector('#fNotes').value,
          actif: f.id ? v.querySelector('#fActif').checked : true }).then(function (l) {
          S.d.fournisseurs = l; toast('Fournisseur enregistré ✓'); feuilleFournisseurs(l);
        }, erreur);
      };
    });
  }

  function formColler() {
    var html = '<form id="fC"><div class="champ"><label for="cListe">Un fournisseur par ligne</label><textarea id="cListe" style="min-height:220px" placeholder="LABOREX\nUBIPHARM\n…"></textarea>' +
      '<div class="aide">Les noms déjà présents sont ignorés. Vous pourrez ensuite marquer les 2 principaux (★).</div></div>' +
      '<button class="btn bloc" type="submit">Ajouter ces fournisseurs</button></form>';
    ouvrirFeuille('Coller une liste', html, function (v) {
      v.querySelector('#fC').onsubmit = function (ev) {
        ev.preventDefault();
        appel('importerFournisseurs', jeton(), v.querySelector('#cListe').value).then(function (r) {
          S.d.fournisseurs = r.fournisseurs; toast(r.ajoutes + ' fournisseur' + (r.ajoutes > 1 ? 's' : '') + ' ajouté' + (r.ajoutes > 1 ? 's' : '') + ' ✓'); feuilleFournisseurs(r.fournisseurs);
        }, erreur);
      };
    });
  }

  function feuilleEquipe() {
    appel('equipe', jeton()).then(function (l) {
      var html = '<button class="btn bloc" data-e="ajouter" style="margin-bottom:14px">+ Ajouter un profil</button><div class="carte"><ul class="liste">' + l.map(function (u) {
        return '<li style="cursor:pointer;align-items:center" data-uid="' + esc(u.id) + '">' + avatar(u) + '<div class="corps"><div class="ligne1"><span>' + esc(u.nom) + '</span>' +
          (!u.actif ? '<span class="puce neutre">Désactivé</span>' : u.pinAChanger ? '<span class="puce attente">Code 0000</span>' : '') + '</div><div class="ligne2">' + esc(u.roleNom) + '</div></div><span class="doux">›</span></li>';
      }).join('') + '</ul></div><p class="petit doux">Un nouveau profil (ou un code réinitialisé) se connecte avec le code <b>0000</b>, puis choisit son propre code.</p>' +
        '<div class="carte petit"><b>Qui peut faire quoi</b><br><br><b>Gérant(e)</b> : tout (bilan, validation des demandes, équipe, journal).<br>' +
        '<b>Caissière principale</b> : caisses, sorties et entrées, fournisseurs, résumé du jour.<br><b>Caissière</b> : saisie des caisses du matin et du soir.<br>' +
        '<b>Employé(e)</b> : demandes de permission et remplacements.<br><br>Tout le monde peut faire des demandes.</div>';
      ouvrirFeuille('Équipe et accès', html, function (v) {
        v.querySelector('[data-e=ajouter]').onclick = function () { formUtilisateur({ role: 'employe', actif: true }); };
        v.querySelectorAll('[data-uid]').forEach(function (li) { li.onclick = function () { formUtilisateur(l.filter(function (u) { return u.id === li.dataset.uid; })[0]); }; });
      });
    }).catch(erreur);
  }

  function formUtilisateur(u) {
    var html = '<form id="fU" autocomplete="off"><div class="champ"><label for="uNom">Nom affiché</label><input id="uNom" required value="' + esc(u.nom || '') + '" placeholder="Prénom (et initiale du nom)"></div>' +
      '<div class="champ"><label for="uRole">Rôle</label><select id="uRole">' + S.d.listes.roles.map(function (r) { return '<option value="' + r.cle + '"' + (r.cle === u.role ? ' selected' : '') + '>' + esc(r.nom) + '</option>'; }).join('') + '</select></div>' +
      (u.id ? '<label class="case"><input type="checkbox" id="uActif"' + (u.actif ? ' checked' : '') + '> Accès actif (décocher pour un départ)</label>' : '') +
      '<button class="btn bloc" type="submit" style="margin-top:10px">Enregistrer</button>' +
      (u.id ? '<button class="btn bloc danger" type="button" id="uReset" style="margin-top:8px">Réinitialiser son code (0000)</button>' : '') +
      '<button class="btn bloc contour" type="button" id="uRetour" style="margin-top:8px">Retour à l\'équipe</button></form>';
    ouvrirFeuille(u.id ? 'Modifier le profil' : 'Nouveau profil', html, function (v) {
      v.querySelector('#uRetour').onclick = feuilleEquipe;
      if (u.id) v.querySelector('#uReset').onclick = function () {
        if (!confirm('Remettre le code de ' + u.nom + ' à 0000 ? Il/elle devra en choisir un nouveau.')) return;
        appel('reinitialiserPin', jeton(), u.id).then(function () { toast('Code remis à 0000 ✓'); feuilleEquipe(); }, erreur);
      };
      v.querySelector('#fU').onsubmit = function (ev) {
        ev.preventDefault();
        appel('enregistrerUtilisateur', jeton(), { id: u.id || '', nom: v.querySelector('#uNom').value, role: v.querySelector('#uRole').value,
          actif: u.id ? v.querySelector('#uActif').checked : true }).then(function () {
          toast('Profil enregistré ✓'); feuilleEquipe(); appel('charger', jeton()).then(function (d) { S.d = d; }).catch(function () {});
        }, erreur);
      };
    });
  }

  function feuilleJournal() {
    appel('journal', jeton()).then(function (l) {
      ouvrirFeuille('Journal d\'activité', '<div class="carte">' + (l.length ? '<ul class="liste">' + l.map(function (x) {
        return '<li><div class="corps"><div class="ligne1"><span>' + esc(x.action) + '</span><span class="petit doux num">' + esc(dateCourte(x.quand)) + ' ' + esc(heure(x.quand)) + '</span></div>' +
          '<div class="ligne2">' + esc(x.qui) + (x.details ? ' — ' + esc(x.details) : '') + '</div></div></li>';
      }).join('') + '</ul>' : '<p class="vide-msg">Rien pour l\'instant.</p>') + '</div>');
    }).catch(erreur);
  }

  function formMonCode() {
    var html = '<form id="fP" autocomplete="off"><div class="champ"><label for="pA">Code actuel</label><input id="pA" type="password" inputmode="numeric" maxlength="4" required></div>' +
      '<div class="champ"><label for="pN">Nouveau code (4 chiffres)</label><input id="pN" type="password" inputmode="numeric" maxlength="4" required></div>' +
      '<div class="champ"><label for="pC">Confirmer le nouveau code</label><input id="pC" type="password" inputmode="numeric" maxlength="4" required></div>' +
      '<button class="btn bloc" type="submit">Changer mon code</button></form>';
    ouvrirFeuille('Changer mon code', html, function (v) {
      v.querySelector('#fP').onsubmit = function (ev) {
        ev.preventDefault();
        if (v.querySelector('#pN').value !== v.querySelector('#pC').value) return erreur('Les deux nouveaux codes sont différents.');
        appel('changerPin', jeton(), v.querySelector('#pA').value, v.querySelector('#pN').value).then(function () { fermerFeuille(); toast('Code changé ✓'); }, erreur);
      };
    });
  }

  function formNomPharmacie() {
    ouvrirFeuille('Nom de la pharmacie', '<form id="fN"><div class="champ"><label for="nP">Nom affiché en haut de l\'application</label><input id="nP" required value="' + esc(S.d.nomPharmacie) +
      '"></div><button class="btn bloc" type="submit">Enregistrer</button></form>', function (v) {
      v.querySelector('#fN').onsubmit = function (ev) {
        ev.preventDefault();
        appel('renommerPharmacie', jeton(), v.querySelector('#nP').value).then(function (n) { S.d.nomPharmacie = n; fermerFeuille(); toast('Nom enregistré ✓'); ouvrirApp(); }, erreur);
      };
    });
  }

  /* ================================================================== */
  /* Actions (boutons data-act)                                          */
  /* ================================================================== */
  var ACTIONS = {
    fermer: fermerFeuille,
    aller: function (b) { afficher(b.dataset.onglet); },
    nouvelleCaisse: function () { formCaisse(); },
    modifierCaisse: function (b) { var r = trouverRecette(b.dataset.id); if (r) formCaisse(r); },
    supprimerCaisse: function (b) {
      var r = trouverRecette(b.dataset.id);
      if (!r || !confirm('Supprimer la caisse du ' + r.session.toLowerCase() + ' (' + F(r.total) + ') ?')) return;
      appel('supprimerRecette', jeton(), r.id).then(function () { toast('Caisse supprimée'); afficher(S.onglet); }, erreur);
    },
    nouveauMouvement: function (b) { formMouvement({ sens: b.dataset.sens }); },
    modifierMouvement: function (b) { var x = trouverMouvement(b.dataset.id); if (x) formMouvement(x); },
    supprimerMouvement: function (b) {
      var x = trouverMouvement(b.dataset.id);
      if (!x || !confirm('Supprimer cette ' + x.sens.toLowerCase() + ' de ' + F(x.montant) + ' ?')) return;
      appel('supprimerMouvement', jeton(), x.id).then(function () { toast('Opération supprimée'); afficher(S.onglet); }, erreur);
    },
    jour: function (b) {
      var cle = b.dataset.cle, n = decaler(S[cle], Number(b.dataset.n));
      if (n > S.d.aujourdhui) return;
      S[cle] = n; afficher(S.onglet);
    },
    mois: function (b) {
      var n = decalerMois(S.mois, Number(b.dataset.n));
      if (n > S.d.aujourdhui.slice(0, 7)) return;
      S.mois = n; VUES.bilan();
    },
    csv: function (b) { exporterCsv(b.dataset.quoi); },
    nouvelleDemande: formDemande,
    repondreRemp: function (b) {
      var oui = !!b.dataset.oui;
      if (!oui && !confirm('Refuser ce remplacement ? La demande sera refusée.')) return;
      appel('repondreRemplacement', jeton(), b.dataset.id, oui).then(function () { toast(oui ? 'Merci ! Le gérant va valider.' : 'Réponse envoyée'); rafraichir(); }, erreur);
    },
    traiter: function (b) {
      var oui = !!b.dataset.oui;
      var com = document.querySelector('[data-com="' + b.dataset.id + '"]');
      appel('traiterDemande', jeton(), b.dataset.id, oui, com ? com.value : '').then(function () { toast(oui ? 'Demande acceptée ✓' : 'Demande refusée'); rafraichir(); }, erreur);
    },
    annulerDemande: function (b) {
      if (!confirm('Annuler cette demande ?')) return;
      appel('annulerDemande', jeton(), b.dataset.id).then(function () { toast('Demande annulée'); rafraichir(); }, erreur);
    },
    historique: function () { historique(); },
    fournisseurs: function () { feuilleFournisseurs(); },
    equipe: feuilleEquipe,
    journal: feuilleJournal,
    monCode: formMonCode,
    nomPharmacie: formNomPharmacie,
    deconnexion: function () { if (confirm('Se déconnecter ?')) deconnexion(); }
  };

  function lierActions(zone) {
    zone.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); ACTIONS[b.dataset.act](b); };
    });
    zone.querySelectorAll('.nav-date input[type=date]').forEach(function (i) {
      i.onchange = function () { if (i.value && i.value <= S.d.aujourdhui) { S[i.dataset.cle] = i.value; afficher(S.onglet); } };
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.feuille [data-act="fermer"]');
    if (b) fermerFeuille();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerFeuille(); });

  /* Mémoire hors ligne de la coquille (pas des données) */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  demarrer();
})();
