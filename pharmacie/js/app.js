// Pharmacie — gestion du personnel et des caisses.
// Écrans : Accueil · Caisse · Personnel (ou Mes demandes) · Plus. Les droits dépendent du rôle :
//   proprietaire (tout), principale (caissière principale), caissiere, employe.
(function () {
  'use strict';

  var D = null;          // données affichées (serveur + saisies pas encore envoyées)
  var brut = null;       // dernière réponse du serveur
  var horsLigne = false;
  var vue = 'accueil';
  var etat = { periode: 'mois', personne: '', type: '', seg: 'equipe', segDem: 'attente', moisP: '' };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ecran = $('#ecran');

  /* ================================================================ outils */

  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fcfa(n) {
    var v = Math.round(Number(n) || 0);
    return (v < 0 ? '−' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
  }
  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function auj() { return iso(new Date()); }
  function jour(s) { return new Date(s + 'T12:00:00'); }
  function dateFr(s, opts) {
    if (!s) return '';
    return jour(s).toLocaleDateString('fr-FR', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function dateLongue(s) { return dateFr(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function heureDe(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    return dateFr(iso(d), { day: 'numeric', month: 'short' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function moisFr(ym) {
    var t = jour(ym + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function nbJours(a, b) { return Math.round((jour(b) - jour(a)) / 86400000) + 1; }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function personne(id) {
    for (var i = 0; D && i < D.personnel.length; i++) if (D.personnel[i].id === id) return D.personnel[i];
    return null;
  }
  function nomDe(id) { var p = personne(id); return p ? p.nom : '—'; }
  function prenom(nom) { return String(nom || '').split(' ')[0]; }
  function actifs(liste) { return liste.filter(function (x) { return x.statut !== 'annule'; }); }
  function role() { return D.moi.role; }
  function gere() { return role() === 'proprietaire' || role() === 'principale'; }
  function proprio() { return role() === 'proprietaire'; }

  var ROLES = { proprietaire: 'Propriétaire', principale: 'Caissière principale', caissiere: 'Caissière', employe: 'Employé(e)' };
  var TYPES = {
    recette: { nom: 'Recette du jour', signe: 1, court: 'Recette' },
    versement_principale: { nom: 'Versement à la caissière principale', signe: 0, court: 'Versement → principale' },
    versement_patronne: { nom: 'Versement à la propriétaire', signe: 0, court: 'Versement → propriétaire' },
    depense: { nom: 'Dépense', signe: -1, court: 'Dépense' },
    achat: { nom: 'Achat (fournisseur)', signe: -1, court: 'Achat' },
    sortie: { nom: 'Sortie d\'argent', signe: -1, court: 'Sortie' },
    apport: { nom: 'Entrée d\'argent (fond de caisse…)', signe: 1, court: 'Entrée' }
  };
  var CATEGORIES = ['Électricité / eau', 'Loyer', 'Transport', 'Nettoyage / entretien', 'Fournitures de bureau',
    'Salaire / avance', 'Réparation', 'Téléphone / internet', 'Impôts / taxes', 'Autre'];
  var MODES = { especes: 'Espèces (de la caisse)', mobile: 'Mobile money', banque: 'Chèque / virement', credit: 'À crédit (pas encore payé)' };
  var STATUTS = {
    en_attente: ['En attente', 'attente'], confirme: ['Reçu', 'ok'], conteste: ['Contesté', 'alerte'],
    enregistre: ['', ''], annule: ['Annulé', 'gris'], accordee: ['Accordée', 'ok'], refusee: ['Refusée', 'alerte']
  };
  function badge(statut, envoi) {
    var s = STATUTS[statut] || [statut, ''];
    var b = s[0] ? '<span class="badge ' + s[1] + '">' + h(s[0]) + '</span>' : '';
    if (envoi) b += '<span class="badge envoi" title="Pas encore envoyé au serveur">⏳ à envoyer</span>';
    return b;
  }

  function toast(msg, type) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast visible ' + (type || '');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.className = 'toast'; }, type === 'erreur' ? 6000 : 3000);
  }

  /* ======================================================= calculs caisse */

  function montantSorti(c) {
    if (c.statut === 'en_attente') return Number(c.montant);
    return c.montant_recu === '' || c.montant_recu == null ? Number(c.montant) : Number(c.montant_recu);
  }

  // Argent qu'une personne a encore en main (pour une caissière : ce qu'il lui reste à verser).
  function solde(pid) {
    var s = 0;
    actifs(D.caisse).forEach(function (c) {
      var m = Number(c.montant) || 0;
      if (c.caissiere_id === pid) {
        if (c.type === 'recette' || c.type === 'apport') s += m;
        else if (c.type === 'depense' || c.type === 'achat' || c.type === 'sortie') { if ((c.mode || 'especes') === 'especes') s -= m; }
        else s -= montantSorti(c);
      }
      if (c.destinataire_id === pid && (c.statut === 'confirme' || c.statut === 'conteste')) s += montantSorti(c);
    });
    return s;
  }

  function enTransitVers(pid) {
    return actifs(D.caisse).filter(function (c) { return c.destinataire_id === pid && c.statut === 'en_attente'; });
  }

  function periode(p) {
    var d = new Date(), a, b;
    if (p === 'jour') { a = b = auj(); }
    else if (p === 'semaine') {
      var l = new Date(d); l.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      var di = new Date(l); di.setDate(l.getDate() + 6);
      a = iso(l); b = iso(di);
    } else if (p === 'mois') { a = iso(new Date(d.getFullYear(), d.getMonth(), 1)); b = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
    else if (p === 'mois_dernier') { a = iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)); b = iso(new Date(d.getFullYear(), d.getMonth(), 0)); }
    else { a = '0000-00-00'; b = '9999-99-99'; }
    return { debut: a, fin: b };
  }
  var PERIODES = { jour: 'Aujourd\'hui', semaine: 'Cette semaine', mois: 'Ce mois', mois_dernier: 'Mois dernier', tout: 'Tout' };

  function totaux(liste) {
    var t = {};
    Object.keys(TYPES).forEach(function (k) { t[k] = 0; });
    actifs(liste).forEach(function (c) { t[c.type] += Number(c.montant) || 0; });
    return t;
  }

  function ecart(c) {
    if (c.statut !== 'confirme' && c.statut !== 'conteste') return 0;
    return montantSorti(c) - Number(c.montant);
  }

  function personnesCaisse() {
    return D.personnel.filter(function (p) { return p.actif && (p.role === 'caissiere' || p.role === 'principale'); });
  }

  /* =================================================== saisies optimistes */

  function appliquer(d, action, p) {
    var moi = d.moi.id;
    var maintenant = new Date().toISOString();
    function chercher(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }
    if (action === 'caisse_ajouter') {
      if (chercher(d.caisse, p.element.id)) return;
      var e = Object.assign({ caissiere_id: moi, destinataire_id: '', categorie: '', description: '', fournisseur: '', mode: 'especes', montant_recu: '', note: '' }, p.element);
      if (e.type === 'versement_patronne') {
        var pr = d.personnel.filter(function (x) { return x.role === 'proprietaire'; })[0];
        e.destinataire_id = pr ? pr.id : '';
      }
      e.statut = /^versement/.test(e.type) ? 'en_attente' : 'enregistre';
      e.saisi_par = moi; e.saisi_le = maintenant; e.envoi = true;
      d.caisse.push(e);
    } else if (action === 'caisse_confirmer') {
      var c = chercher(d.caisse, p.id);
      if (c) { c.statut = p.decision; c.montant_recu = p.montant_recu === '' ? c.montant : Number(p.montant_recu); c.note = p.note; c.confirme_par = moi; c.confirme_le = maintenant; c.envoi = true; }
    } else if (action === 'annuler') {
      var l = { caisse: d.caisse, demande: d.demandes, presence: d.presences }[p.quoi];
      var x = l && chercher(l, p.id);
      if (x) { x.statut = 'annule'; x.envoi = true; }
    } else if (action === 'demande_ajouter') {
      if (chercher(d.demandes, p.element.id)) return;
      d.demandes.push(Object.assign({ personne_id: moi, statut: 'en_attente', saisi_par: moi, saisi_le: maintenant, reponse: '', envoi: true }, p.element));
    } else if (action === 'demande_decider') {
      var dm = chercher(d.demandes, p.id);
      if (dm) { dm.statut = p.decision; dm.reponse = p.reponse; dm.decide_par = moi; dm.decide_le = maintenant; dm.envoi = true; }
    } else if (action === 'presence_ajouter') {
      if (chercher(d.presences, p.element.id)) return;
      d.presences.push(Object.assign({ statut: 'enregistre', saisi_par: moi, saisi_le: maintenant, envoi: true }, p.element));
    }
  }

  function reconstruire() {
    if (!brut) return;
    D = clone(brut);
    API.envois().forEach(function (it) { appliquer(D, it.action, it.params); });
  }

  function ecrire(action, params, message) {
    appliquer(D, action, params);
    rendre();
    if (message) toast(message, 'ok');
    API.mettreEnFile(action, params).then(apresEnvoi);
  }

  function apresEnvoi(bilan) {
    bilan.erreurs.forEach(function (m) { toast('Refusé : ' + m, 'erreur'); });
    if (bilan.envoyes || bilan.erreurs.length) charger();
    else { horsLigne = bilan.restants > 0; rendreEntete(); }
  }

  /* ============================================================ chargement */

  function charger() {
    return API.vider().then(function (bilan) {
      bilan.erreurs.forEach(function (m) { toast('Refusé : ' + m, 'erreur'); });
      return API.appel('donnees');
    }).then(function (rep) {
      delete rep.ok;
      brut = rep;
      API.garderDonnees(rep);
      horsLigne = false;
      reconstruire();
      rendre();
    }, function (err) {
      if (err && err.serveur) { if (API.jeton()) toast(err.message, 'erreur'); return; }
      horsLigne = true;
      rendreEntete();
    });
  }

  document.addEventListener('session-expiree', function () { brut = D = null; demarrer(); });
  window.addEventListener('online', function () { if (D) charger(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && D) charger(); });

  /* ============================================================== en-tête */

  function rendreEntete() {
    $('#titre').textContent = D ? D.pharmacie : 'Pharmacie';
    var n = API.envois().length;
    var s = $('#sync');
    if (!D) { s.innerHTML = ''; return; }
    s.className = 'sync ' + (horsLigne ? 'hors' : n ? 'attente' : 'ok');
    s.innerHTML = horsLigne ? 'Hors ligne' + (n ? ' · ' + n + ' à envoyer' : '') : n ? n + ' à envoyer' : prenom(D.moi.nom);
  }

  function onglets() {
    var r = role();
    var t = [['accueil', 'Accueil', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z']];
    if (r !== 'employe') t.push(['caisse', 'Caisse', 'M3 7h18v12H3zM3 11h18M7 15h4']);
    if (gere()) t.push(['personnel', 'Personnel', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6']);
    else t.push(['demandes', 'Mes demandes', 'M5 4h14v17H5zM9 9h6M9 13h6M9 17h3']);
    t.push(['plus', 'Plus', 'M5 12h.01M12 12h.01M19 12h.01']);
    $('#onglets').innerHTML = t.map(function (o) {
      return '<button class="onglet' + (vue === o[0] ? ' actif' : '') + '" data-action="aller" data-v="' + o[0] + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + o[2] + '"/></svg>' + o[1] + '</button>';
    }).join('');
    $('#onglets').hidden = false;
  }

  function rendre() {
    if (!D) return;
    rendreEntete();
    onglets();
    var f = { accueil: vueAccueil, caisse: vueCaisse, personnel: vuePersonnel, demandes: vueMesDemandes, plus: vuePlus }[vue] || vueAccueil;
    ecran.innerHTML = f();
  }

  /* =============================================================== accueil */

  function vueAccueil() {
    var r = role(), html = '';
    var heure = new Date().getHours();
    html += '<div class="salut"><h2>' + (heure < 18 ? 'Bonjour' : 'Bonsoir') + ' ' + h(prenom(D.moi.nom)) + '</h2><p>' + h(dateLongue(auj())) + ' · ' + h(ROLES[r]) + '</p></div>';

    // Actions rapides
    var a = [];
    if (r === 'caissiere' || r === 'principale') a.push(['op', 'recette', 'Ma recette du jour', 'plus']);
    if (r === 'caissiere') a.push(['op', 'versement_principale', 'Verser à la caissière principale', 'fleche']);
    if (r === 'principale') a.push(['op', 'versement_patronne', 'Reverser à la propriétaire', 'fleche']);
    if (r !== 'employe') a.push(['op', 'depense', 'Dépense, achat, sortie', 'moins']);
    if (gere()) a.push(['presence', '', 'Noter un retard ou une absence', 'horloge']);
    if (r !== 'proprietaire') { a.push(['demande', 'conge', 'Demander un congé', 'cal']); a.push(['demande', 'permission', 'Demander une permission', 'cal']); }
    html += '<div class="rapides">' + a.map(function (x) {
      return '<button class="rapide ' + x[3] + '" data-action="' + x[0] + '" data-type="' + x[1] + '">' + h(x[2]) + '</button>';
    }).join('') + '</div>';

    // Versements à confirmer (je suis la destinataire)
    var aConfirmer = enTransitVers(D.moi.id);
    if (aConfirmer.length) {
      html += '<section class="carte important"><h3>Argent à confirmer <span class="compte">' + aConfirmer.length + '</span></h3><p class="aide">Confirmez seulement quand vous avez compté l\'argent.</p>' +
        aConfirmer.map(function (c) {
          return '<div class="ligne"><div class="l-txt"><b>' + h(nomDe(c.caissiere_id)) + '</b> annonce <b>' + fcfa(c.montant) + '</b><small>' + h(dateFr(c.date)) + (c.description ? ' · ' + h(c.description) : '') + '</small></div>' +
            '<button class="btn petit" data-action="confirmer" data-id="' + c.id + '">Confirmer</button></div>';
        }).join('') + '</section>';
    }

    if (proprio()) html += accueilProprio();
    else if (r === 'principale') html += accueilPrincipale();
    else if (r === 'caissiere') html += accueilCaissiere();

    if (r !== 'proprietaire') html += mesDemandesResume();
    return html;
  }

  function accueilProprio() {
    var html = '', p = periode('mois'), s = periode('semaine');
    var recus = actifs(D.caisse).filter(function (c) { return c.type === 'versement_patronne' && c.destinataire_id === D.moi.id && c.statut !== 'en_attente'; });
    var mois = recus.filter(function (c) { return c.date >= p.debut && c.date <= p.fin; }).reduce(function (t, c) { return t + montantSorti(c); }, 0);
    var sem = recus.filter(function (c) { return c.date >= s.debut && c.date <= s.fin; }).reduce(function (t, c) { return t + montantSorti(c); }, 0);
    var t = totaux(D.caisse.filter(function (c) { return c.date >= p.debut && c.date <= p.fin; }));
    html += '<section class="carte"><h3>Argent reçu</h3><div class="chiffres">' +
      '<div><span>Cette semaine</span><b>' + fcfa(sem) + '</b></div><div><span>Ce mois</span><b>' + fcfa(mois) + '</b></div></div>' +
      '<div class="chiffres petits"><div><span>Recettes du mois</span><b>' + fcfa(t.recette) + '</b></div><div><span>Dépenses + achats + sorties</span><b>' + fcfa(t.depense + t.achat + t.sortie) + '</b></div></div></section>';
    html += carteQuiALArgent();
    var att = actifs(D.demandes).filter(function (d) { return d.statut === 'en_attente'; });
    if (att.length) {
      html += '<section class="carte important"><h3>Demandes à traiter <span class="compte">' + att.length + '</span></h3>' + att.map(ligneDemande).join('') + '</section>';
    }
    html += carteAujourdhui();
    return html;
  }

  function accueilPrincipale() {
    var html = '';
    html += '<section class="carte"><h3>Argent en main</h3><div class="gros">' + fcfa(solde(D.moi.id)) + '</div><p class="aide">Ce que vous avez reçu des caissières et vos recettes, moins les dépenses et ce que vous avez reversé à la propriétaire.</p>' +
      '<button class="btn" data-action="op" data-type="versement_patronne">Reverser à la propriétaire</button></section>';
    html += carteQuiALArgent(true);
    html += carteAujourdhui();
    return html;
  }

  function accueilCaissiere() {
    var mes = actifs(D.caisse).filter(function (c) { return c.caissiere_id === D.moi.id; });
    var aujourd = mes.filter(function (c) { return c.date === auj(); });
    var t = totaux(aujourd);
    var html = '<section class="carte"><h3>Reste à verser</h3><div class="gros">' + fcfa(solde(D.moi.id)) + '</div>' +
      '<p class="aide">Vos recettes moins les dépenses payées et l\'argent remis à la caissière principale.</p>' +
      '<div class="chiffres petits"><div><span>Recette aujourd\'hui</span><b>' + fcfa(t.recette) + '</b></div><div><span>Versé aujourd\'hui</span><b>' + fcfa(t.versement_principale) + '</b></div></div></section>';
    var dern = mes.slice().sort(trierCaisse).slice(0, 5);
    if (dern.length) html += '<section class="carte"><h3>Mes dernières opérations</h3>' + dern.map(ligneCaisse).join('') + '</section>';
    return html;
  }

  function carteQuiALArgent(sansPrincipale) {
    var pers = personnesCaisse().filter(function (p) { return !(sansPrincipale && p.role === 'principale'); });
    if (!pers.length) return '';
    var html = '<section class="carte"><h3>Qui a l\'argent en ce moment</h3>';
    html += pers.map(function (p) {
      var s = solde(p.id);
      var transit = enTransitVers(p.id).reduce(function (t, c) { return t + Number(c.montant); }, 0);
      return '<div class="ligne"><div class="l-txt"><b>' + h(p.nom) + '</b><small>' + h(ROLES[p.role]) + (p.role === 'caissiere' ? ' · reste à verser' : ' · en main') +
        (transit ? ' · ' + fcfa(transit) + ' à confirmer' : '') + '</small></div><div class="montant ' + (s < 0 ? 'neg' : '') + '">' + fcfa(s) + '</div></div>';
    }).join('');
    var pr = D.personnel.filter(function (p) { return p.role === 'proprietaire'; })[0];
    if (proprio() && pr) {
      var tr = enTransitVers(pr.id).reduce(function (t, c) { return t + Number(c.montant); }, 0);
      if (tr) html += '<div class="ligne"><div class="l-txt"><b>En route vers vous</b><small>Versements annoncés, pas encore confirmés</small></div><div class="montant">' + fcfa(tr) + '</div></div>';
    }
    return html + '</section>';
  }

  function statutDuJour(pid, date) {
    var res = [];
    actifs(D.demandes).forEach(function (d) {
      if (d.personne_id === pid && d.statut === 'accordee' && d.date_debut <= date && d.date_fin >= date) {
        res.push(d.type === 'conge' ? ['En congé', 'gris'] : ['Permission' + (d.heure_debut ? ' ' + d.heure_debut + '–' + (d.heure_fin || '') : ''), 'attente']);
      }
    });
    actifs(D.presences).forEach(function (x) {
      if (x.personne_id === pid && x.date === date) res.push(x.type === 'absence' ? ['Absent(e)', 'alerte'] : ['Retard ' + (x.minutes || 0) + ' min', 'attente']);
    });
    return res;
  }

  function carteAujourdhui() {
    var lignes = D.personnel.filter(function (p) { return p.actif && p.role !== 'proprietaire'; }).map(function (p) {
      var st = statutDuJour(p.id, auj());
      if (!st.length) return '';
      return '<div class="ligne"><div class="l-txt"><b>' + h(p.nom) + '</b></div><div>' + st.map(function (s) { return '<span class="badge ' + s[1] + '">' + h(s[0]) + '</span>'; }).join('') + '</div></div>';
    }).join('');
    return '<section class="carte"><h3>L\'équipe aujourd\'hui</h3>' + (lignes || '<p class="vide">Personne en congé, absent ou en retard aujourd\'hui.</p>') + '</section>';
  }

  function mesDemandesResume() {
    var mes = D.demandes.filter(function (d) { return d.personne_id === D.moi.id; }).sort(function (a, b) { return a.saisi_le < b.saisi_le ? 1 : -1; }).slice(0, 3);
    if (!mes.length) return '';
    return '<section class="carte"><h3>Mes demandes</h3>' + mes.map(ligneDemande).join('') + '</section>';
  }

  /* ================================================================ caisse */

  function trierCaisse(a, b) { return a.date === b.date ? (a.saisi_le < b.saisi_le ? 1 : -1) : (a.date < b.date ? 1 : -1); }

  function caisseFiltree() {
    var p = periode(etat.periode);
    return D.caisse.filter(function (c) {
      if (c.date < p.debut || c.date > p.fin) return false;
      if (etat.personne && c.caissiere_id !== etat.personne && c.destinataire_id !== etat.personne) return false;
      if (etat.type === 'versements' && !/^versement/.test(c.type)) return false;
      if (etat.type === 'sorties' && ['depense', 'achat', 'sortie'].indexOf(c.type) < 0) return false;
      if (etat.type === 'recettes' && c.type !== 'recette' && c.type !== 'apport') return false;
      return true;
    }).sort(trierCaisse);
  }

  function chips(nom, valeurs, actuel) {
    return '<div class="chips">' + Object.keys(valeurs).map(function (k) {
      return '<button class="chip' + (k === actuel ? ' actif' : '') + '" data-action="filtre" data-f="' + nom + '" data-v="' + k + '">' + h(valeurs[k]) + '</button>';
    }).join('') + '</div>';
  }

  function vueCaisse() {
    var liste = caisseFiltree();
    var t = totaux(liste);
    var html = '<div class="barre"><h2>Caisse</h2><button class="btn" data-action="op" data-type="">+ Nouvelle opération</button></div>';
    html += chips('periode', PERIODES, etat.periode);
    if (gere()) {
      html += '<div class="filtres"><select data-action="filtre-personne"><option value="">Toutes les caisses</option>' +
        personnesCaisse().concat(D.personnel.filter(function (p) { return p.role === 'proprietaire'; })).map(function (p) {
          return '<option value="' + p.id + '"' + (etat.personne === p.id ? ' selected' : '') + '>' + h(p.nom) + '</option>';
        }).join('') + '</select>' +
        '<select data-action="filtre-type">' + [['', 'Toutes les opérations'], ['recettes', 'Recettes et entrées'], ['versements', 'Versements'], ['sorties', 'Dépenses, achats, sorties']].map(function (o) {
          return '<option value="' + o[0] + '"' + (etat.type === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
    }

    // Bilan de la période
    html += '<section class="carte"><h3>Bilan · ' + h(PERIODES[etat.periode].toLowerCase()) + '</h3><div class="bilan">' +
      bil('Recettes', t.recette, 'pos') + bil('Entrées d\'argent', t.apport, 'pos') +
      bil('Dépenses', t.depense, 'neg') + bil('Achats', t.achat, 'neg') + bil('Sorties', t.sortie, 'neg') +
      bil('Versé à la principale', t.versement_principale, '') + bil('Versé à la propriétaire', t.versement_patronne, '') + '</div>';
    var ecarts = actifs(liste).filter(function (c) { return /^versement/.test(c.type) && (ecart(c) !== 0 || c.statut === 'conteste'); });
    if (ecarts.length) {
      html += '<h4 class="alerte-txt">Écarts sur les versements</h4>' + ecarts.map(function (c) {
        return '<div class="ligne" data-action="detail" data-id="' + c.id + '"><div class="l-txt"><b>' + h(nomDe(c.caissiere_id)) + ' → ' + h(nomDe(c.destinataire_id)) + '</b><small>' + h(dateFr(c.date)) + ' · annoncé ' + fcfa(c.montant) + ', reçu ' + fcfa(montantSorti(c)) + '</small></div><div class="montant neg">' + fcfa(ecart(c)) + '</div></div>';
      }).join('');
    }
    if (gere()) html += '<button class="lien" data-action="export">Télécharger ces opérations (tableur)</button>';
    html += '</section>';

    if (gere()) html += carteQuiALArgent();
    else html += '<section class="carte"><h3>Reste à verser</h3><div class="gros">' + fcfa(solde(D.moi.id)) + '</div></section>';

    // Liste par jour
    if (!liste.length) return html + '<p class="vide">Aucune opération sur cette période.</p>';
    var jours = {};
    liste.forEach(function (c) { (jours[c.date] = jours[c.date] || []).push(c); });
    Object.keys(jours).sort().reverse().forEach(function (d) {
      var tj = totaux(jours[d]);
      html += '<section class="carte jour"><div class="jour-tete"><h3>' + h(dateFr(d, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3><small>Recettes ' + fcfa(tj.recette) +
        ' · Dépenses ' + fcfa(tj.depense + tj.achat + tj.sortie) + ' · Versé ' + fcfa(tj.versement_principale + tj.versement_patronne) + '</small></div>' +
        jours[d].map(ligneCaisse).join('') + '</section>';
    });
    return html;
  }

  function bil(nom, v, cls) { return '<div class="' + (v ? cls : 'zero') + '"><span>' + h(nom) + '</span><b>' + fcfa(v) + '</b></div>'; }

  function ligneCaisse(c) {
    var T = TYPES[c.type] || { court: c.type, signe: 0 };
    var qui = /^versement/.test(c.type) ? nomDe(c.caissiere_id) + ' → ' + nomDe(c.destinataire_id) : nomDe(c.caissiere_id);
    var info = [c.categorie, c.fournisseur, c.description].filter(Boolean).join(' · ');
    if (c.mode && c.mode !== 'especes' && T.signe < 0) info += (info ? ' · ' : '') + MODES[c.mode];
    var cls = c.statut === 'annule' ? 'barre-txt' : T.signe > 0 ? 'pos' : T.signe < 0 ? 'neg' : '';
    return '<div class="ligne cliquable' + (c.statut === 'annule' ? ' annule' : '') + '" data-action="detail" data-id="' + c.id + '">' +
      '<div class="pastille t-' + c.type + '"></div><div class="l-txt"><b>' + h(T.court) + '</b> ' + badge(c.statut, c.envoi) + '<small>' + h(qui) + (info ? ' · ' + h(info) : '') + '</small></div>' +
      '<div class="montant ' + cls + '">' + (T.signe < 0 ? '−' : T.signe > 0 ? '+' : '') + fcfa(c.montant) + '</div></div>';
  }

  /* ============================================================= personnel */

  function vuePersonnel() {
    var segs = { equipe: 'Équipe', demandes: 'Congés et permissions', presences: 'Retards et absences' };
    var html = '<div class="seg">' + Object.keys(segs).map(function (k) {
      return '<button class="' + (etat.seg === k ? 'actif' : '') + '" data-action="seg" data-v="' + k + '">' + segs[k] + '</button>';
    }).join('') + '</div>';
    if (etat.seg === 'equipe') html += vueEquipe();
    else if (etat.seg === 'demandes') html += vueDemandes();
    else html += vuePresences();
    return html;
  }

  function statsPersonne(pid) {
    var p = periode('mois'), an = String(new Date().getFullYear());
    var pres = actifs(D.presences).filter(function (x) { return x.personne_id === pid && x.date >= p.debut && x.date <= p.fin; });
    var ret = pres.filter(function (x) { return x.type === 'retard'; });
    var abs = pres.filter(function (x) { return x.type === 'absence'; });
    var conges = actifs(D.demandes).filter(function (d) { return d.personne_id === pid && d.statut === 'accordee' && d.type === 'conge' && d.date_debut.slice(0, 4) === an; });
    var perms = actifs(D.demandes).filter(function (d) { return d.personne_id === pid && d.statut === 'accordee' && d.type === 'permission' && d.date_debut.slice(0, 4) === an; });
    return {
      retards: ret.length, minutes: ret.reduce(function (t, x) { return t + (Number(x.minutes) || 0); }, 0),
      absences: abs.length, nonJust: abs.filter(function (x) { return x.justifie !== 'oui'; }).length,
      joursConge: conges.reduce(function (t, d) { return t + nbJours(d.date_debut, d.date_fin); }, 0), permissions: perms.length
    };
  }

  function vueEquipe() {
    var html = '';
    if (proprio()) html += '<div class="barre"><h2>L\'équipe</h2><button class="btn" data-action="employe">+ Ajouter</button></div>';
    else html += '<div class="barre"><h2>L\'équipe</h2></div>';
    var gens = D.personnel.slice().sort(function (a, b) { return (b.actif - a.actif) || a.nom.localeCompare(b.nom); });
    if (gens.length < 2) html += '<p class="vide">Ajoutez les employés de la pharmacie avec le bouton « + Ajouter ». Chacun recevra un code pour se connecter.</p>';
    html += gens.map(function (p) {
      var s = statsPersonne(p.id), st = statutDuJour(p.id, auj());
      return '<section class="carte personne cliquable' + (p.actif ? '' : ' inactif') + '" data-action="fiche" data-id="' + p.id + '">' +
        '<div class="avatar">' + h(p.nom.charAt(0).toUpperCase()) + '</div><div class="l-txt"><b>' + h(p.nom) + '</b> ' + st.map(function (x) { return '<span class="badge ' + x[1] + '">' + h(x[0]) + '</span>'; }).join('') +
        (p.actif ? '' : ' <span class="badge gris">Accès retiré</span>') + '<small>' + h([ROLES[p.role], p.poste !== ROLES[p.role] ? p.poste : ''].filter(Boolean).join(' · ')) + '</small>' +
        (p.role !== 'proprietaire' ? '<small class="stats">Ce mois : ' + s.retards + ' retard' + (s.retards > 1 ? 's' : '') + (s.minutes ? ' (' + s.minutes + ' min)' : '') + ' · ' + s.absences + ' absence' + (s.absences > 1 ? 's' : '') +
          ' — Cette année : ' + s.joursConge + ' j de congé · ' + s.permissions + ' permission' + (s.permissions > 1 ? 's' : '') + '</small>' : '') +
        '</div></section>';
    }).join('');
    return html;
  }

  function vueDemandes() {
    var html = '<div class="barre"><h2>Congés et permissions</h2><button class="btn" data-action="demande" data-type="conge">+ Demande</button></div>';
    html += chips('segDem', { attente: 'En attente', futur: 'À venir', toutes: 'Toutes' }, etat.segDem);
    var l = D.demandes.slice().sort(function (a, b) { return a.date_debut < b.date_debut ? 1 : -1; });
    if (etat.segDem === 'attente') l = l.filter(function (d) { return d.statut === 'en_attente'; });
    if (etat.segDem === 'futur') l = l.filter(function (d) { return d.statut === 'accordee' && d.date_fin >= auj(); }).reverse();
    return html + (l.length ? '<section class="carte">' + l.map(ligneDemande).join('') + '</section>' : '<p class="vide">Aucune demande.</p>');
  }

  function texteDemande(d) {
    if (d.type === 'conge') return 'Congé · ' + (d.date_debut === d.date_fin ? dateFr(d.date_debut) : 'du ' + dateFr(d.date_debut) + ' au ' + dateFr(d.date_fin)) + ' (' + nbJours(d.date_debut, d.date_fin) + ' j)';
    return 'Permission · ' + dateFr(d.date_debut) + (d.heure_debut ? ' de ' + d.heure_debut + (d.heure_fin ? ' à ' + d.heure_fin : '') : ' (journée)');
  }

  function ligneDemande(d) {
    var boutons = '';
    if (proprio() && d.statut === 'en_attente') {
      boutons = '<div class="boutons"><button class="btn petit" data-action="decider" data-id="' + d.id + '" data-v="accordee">Accorder</button>' +
        '<button class="btn petit sec" data-action="decider" data-id="' + d.id + '" data-v="refusee">Refuser</button></div>';
    }
    return '<div class="ligne demande' + (d.statut === 'annule' ? ' annule' : '') + '"><div class="l-txt" data-action="detail-demande" data-id="' + d.id + '"><b>' + h(nomDe(d.personne_id)) + '</b> ' + badge(d.statut, d.envoi) +
      '<small>' + h(texteDemande(d)) + '</small>' + (d.motif ? '<small class="motif">« ' + h(d.motif) + ' »</small>' : '') +
      (d.reponse ? '<small class="motif">Réponse : ' + h(d.reponse) + '</small>' : '') + '</div>' + boutons + '</div>';
  }

  function vuePresences() {
    var ym = etat.moisP || auj().slice(0, 7);
    var html = '<div class="barre"><h2>Retards et absences</h2><button class="btn" data-action="presence">+ Noter</button></div>';
    html += '<div class="mois-nav"><button class="icone" data-action="moisP" data-v="-1" aria-label="Mois précédent">‹</button><b>' + h(moisFr(ym)) + '</b><button class="icone" data-action="moisP" data-v="1" aria-label="Mois suivant">›</button></div>';
    var l = D.presences.filter(function (x) { return x.date.slice(0, 7) === ym; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    // Totaux par personne
    var parP = {};
    actifs(l).forEach(function (x) {
      var t = parP[x.personne_id] = parP[x.personne_id] || { r: 0, m: 0, a: 0, nj: 0 };
      if (x.type === 'retard') { t.r++; t.m += Number(x.minutes) || 0; } else { t.a++; if (x.justifie !== 'oui') t.nj++; }
    });
    var ids = Object.keys(parP);
    if (ids.length) {
      html += '<section class="carte"><h3>Total du mois</h3>' + ids.map(function (id) {
        var t = parP[id];
        return '<div class="ligne"><div class="l-txt"><b>' + h(nomDe(id)) + '</b></div><div class="petit-txt">' + t.r + ' retard' + (t.r > 1 ? 's' : '') + (t.m ? ' (' + t.m + ' min)' : '') + ' · ' + t.a + ' absence' + (t.a > 1 ? 's' : '') + (t.nj ? ' dont ' + t.nj + ' non justifiée' + (t.nj > 1 ? 's' : '') : '') + '</div></div>';
      }).join('') + '</section>';
    }
    return html + (l.length ? '<section class="carte">' + l.map(lignePresence).join('') + '</section>' : '<p class="vide">Rien de noté ce mois-ci.</p>');
  }

  function lignePresence(x) {
    var txt = x.type === 'absence' ? 'Absence' : 'Retard' + (x.minutes ? ' de ' + x.minutes + ' min' : '') + (x.heure_arrivee ? ' (arrivée ' + x.heure_arrivee + ')' : '');
    return '<div class="ligne cliquable' + (x.statut === 'annule' ? ' annule' : '') + '" data-action="detail-presence" data-id="' + x.id + '"><div class="pastille ' + (x.type === 'absence' ? 't-depense' : 't-sortie') + '"></div><div class="l-txt"><b>' + h(nomDe(x.personne_id)) + '</b> ' + badge(x.statut, x.envoi) +
      '<span class="badge ' + (x.justifie === 'oui' ? 'ok' : 'alerte') + '">' + (x.justifie === 'oui' ? 'Justifié' : 'Non justifié') + '</span>' +
      '<small>' + h(dateFr(x.date)) + ' · ' + h(txt) + (x.motif ? ' · ' + h(x.motif) : '') + '</small></div></div>';
  }

  /* ======================================================= mes demandes */

  function vueMesDemandes() {
    var html = '<div class="barre"><h2>Mes demandes</h2></div><div class="rapides deux">' +
      '<button class="rapide cal" data-action="demande" data-type="conge">Demander un congé</button><button class="rapide cal" data-action="demande" data-type="permission">Demander une permission</button></div>';
    var mes = D.demandes.filter(function (d) { return d.personne_id === D.moi.id; }).sort(function (a, b) { return a.date_debut < b.date_debut ? 1 : -1; });
    html += mes.length ? '<section class="carte">' + mes.map(ligneDemande).join('') + '</section>' : '<p class="vide">Vous n\'avez encore fait aucune demande.</p>';
    var s = statsPersonne(D.moi.id);
    var pres = D.presences.filter(function (x) { return x.personne_id === D.moi.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    html += '<section class="carte"><h3>Mon dossier</h3><div class="chiffres petits"><div><span>Retards ce mois</span><b>' + s.retards + '</b></div><div><span>Absences ce mois</span><b>' + s.absences + '</b></div>' +
      '<div><span>Congés pris cette année</span><b>' + s.joursConge + ' j</b></div></div>' + (pres.length ? pres.map(lignePresence).join('') : '<p class="vide">Aucun retard ni absence noté.</p>') + '</section>';
    return html;
  }

  /* ================================================================= plus */

  function vuePlus() {
    var html = '<div class="barre"><h2>Plus</h2></div>';
    html += '<section class="carte"><h3>Mon compte</h3><div class="ligne"><div class="avatar">' + h(D.moi.nom.charAt(0)) + '</div><div class="l-txt"><b>' + h(D.moi.nom) + '</b><small>' + h(ROLES[role()]) + (D.moi.poste && D.moi.poste !== ROLES[role()] ? ' · ' + h(D.moi.poste) : '') + '</small></div></div>' +
      '<div class="boutons"><button class="btn sec" data-action="pin">Changer mon code</button><button class="btn sec" data-action="deconnexion">Se déconnecter</button></div></section>';
    var n = API.envois().length;
    html += '<section class="carte"><h3>Synchronisation</h3><p class="aide">' + (horsLigne ? 'Pas de connexion pour le moment. ' : 'Connecté. ') +
      (n ? n + ' saisie' + (n > 1 ? 's' : '') + ' en attente d\'envoi : elles partiront dès que internet revient.' : 'Tout est envoyé.') + '</p>' +
      '<button class="btn sec" data-action="actualiser">Actualiser maintenant</button></section>';
    if (proprio()) {
      html += '<section class="carte"><h3>La pharmacie</h3><button class="btn sec" data-action="nom-pharmacie">Changer le nom (' + h(D.pharmacie) + ')</button>' +
        (D.lien_tableur ? '<a class="btn sec" href="' + h(D.lien_tableur) + '" target="_blank" rel="noopener">Ouvrir le Google Sheets (toutes les données + le journal)</a>' : '') +
        '<button class="btn sec" data-action="partager">Envoyer l\'application aux employés</button>' +
        '<p class="aide">Chaque employé ouvre le lien, installe l\'icône sur son téléphone, puis se connecte avec son nom et le code que vous lui avez donné (onglet Personnel).</p></section>';
    }
    html += '<section class="carte"><h3>Aide</h3><ul class="aide-liste">' +
      '<li><b>Caissières</b> : notez votre recette du jour, puis chaque versement à la caissière principale. Elle confirme quand elle a compté l\'argent.</li>' +
      '<li><b>Caissière principale</b> : confirmez les versements reçus, notez les dépenses et achats payés, et reversez à la propriétaire.</li>' +
      '<li><b>Écart</b> : si l\'argent reçu ne correspond pas au montant annoncé, saisissez le montant réellement reçu ; l\'écart apparaît dans le bilan.</li>' +
      '<li>Rien n\'est effacé : une erreur s\'annule avec un motif et reste visible, barrée.</li></ul>' +
      '<p class="aide petit-txt">Serveur : ' + h(API.serveur().slice(0, 60)) + '… <button class="lien" data-action="serveur">changer</button></p></section>';
    return html;
  }

  /* ============================================================ feuilles */

  function ouvrir(titre, contenu, surEnvoi) {
    var f = $('#feuille');
    f.innerHTML = '<div class="feuille-fond" data-action="fermer"></div><form class="feuille-corps" novalidate><div class="feuille-tete"><h2>' + h(titre) + '</h2><button type="button" class="icone" data-action="fermer" aria-label="Fermer">✕</button></div>' + contenu + '</form>';
    f.hidden = false;
    document.body.classList.add('fige');
    var form = f.querySelector('form');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var donnees = {};
      new FormData(form).forEach(function (v, k) { donnees[k] = typeof v === 'string' ? v.trim() : v; });
      var bouton = ev.submitter;
      if (bouton && bouton.name) donnees[bouton.name] = bouton.value;
      var err = surEnvoi(donnees, form);
      if (err && err.then) {
        var btns = form.querySelectorAll('button[type=submit]');
        btns.forEach(function (b) { b.disabled = true; });
        err.then(function (msg) { if (msg) montrerErreur(form, msg); else fermer(); }, function (e) { montrerErreur(form, e.message || String(e)); })
          .then(function () { btns.forEach(function (b) { b.disabled = false; }); });
        return;
      }
      if (err) montrerErreur(form, err); else fermer();
    });
    var premier = form.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
    if (premier && premier.type !== 'date' && premier.tagName !== 'SELECT') setTimeout(function () { premier.focus(); }, 50);
    return form;
  }
  function montrerErreur(form, msg) {
    var e = form.querySelector('.erreur');
    if (!e) { e = document.createElement('p'); e.className = 'erreur'; form.querySelector('.actions-form').before(e); }
    e.textContent = msg;
  }
  function fermer() { $('#feuille').hidden = true; $('#feuille').innerHTML = ''; document.body.classList.remove('fige'); }

  function champ(label, input, attrs) {
    return '<label class="champ"' + (attrs || '') + '><span>' + h(label) + '</span>' + input + '</label>';
  }
  function options(liste, choisi) {
    return liste.map(function (o) { return '<option value="' + h(o[0]) + '"' + (o[0] === choisi ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('');
  }
  function actionsForm(html) { return '<div class="actions-form">' + html + '</div>'; }

  /* ----- opération de caisse ----- */

  function typesPermis() {
    var r = role();
    if (r === 'caissiere') return ['recette', 'versement_principale', 'depense', 'achat', 'sortie', 'apport'];
    if (r === 'principale') return ['recette', 'versement_principale', 'versement_patronne', 'depense', 'achat', 'sortie', 'apport'];
    return Object.keys(TYPES);
  }

  function caissesPour(type) {
    var pers = D.personnel.filter(function (p) { return p.actif; });
    if (type === 'versement_principale') return pers.filter(function (p) { return p.role === 'caissiere'; });
    if (type === 'versement_patronne') return pers.filter(function (p) { return p.role === 'principale'; });
    if (type === 'recette') return pers.filter(function (p) { return p.role === 'caissiere' || p.role === 'principale'; });
    return pers.filter(function (p) { return p.role === 'caissiere' || p.role === 'principale' || p.role === 'proprietaire'; });
  }

  function formOperation(type) {
    var types = typesPermis();
    type = types.indexOf(type) >= 0 ? type : types[0];
    var principales = D.personnel.filter(function (p) { return p.actif && p.role === 'principale'; });
    var c = '';
    c += champ('Opération', '<select name="type" id="f-type">' + options(types.map(function (t) { return [t, TYPES[t].nom]; }), type) + '</select>');
    c += '<div class="deux-col">' + champ('Date', '<input type="date" name="date" value="' + auj() + '" max="' + auj() + '" required>') +
      champ('Montant (FCFA)', '<input name="montant" inputmode="numeric" pattern="[0-9 ]*" placeholder="0" autocomplete="off" required>') + '</div>';
    if (gere()) c += champ('Caisse de', '<select name="caissiere_id" id="f-caisse"></select>', ' id="w-caisse"');
    c += champ('Remis à', '<select name="destinataire_id">' + options(principales.map(function (p) { return [p.id, p.nom]; }), '') + '</select>', ' data-types="versement_principale"');
    c += champ('Catégorie', '<select name="categorie">' + options(CATEGORIES.map(function (x) { return [x, x]; }), '') + '</select>', ' data-types="depense"');
    c += champ('Fournisseur', '<input name="fournisseur" placeholder="ex. grossiste, laboratoire…" autocomplete="off">', ' data-types="achat"');
    c += champ('Payé comment ?', '<select name="mode">' + options(Object.keys(MODES).map(function (k) { return [k, MODES[k]]; }), 'especes') + '</select>', ' data-types="depense achat sortie"');
    c += champ('Description', '<input name="description" autocomplete="off" placeholder="Qu\'est-ce qui a été payé, pourquoi ?">', ' data-types="depense achat sortie apport recette versement_principale versement_patronne" id="w-desc"');
    c += '<p class="aide" id="f-aide"></p>';
    c += actionsForm('<button class="btn large" type="submit">Enregistrer</button>');
    var form = ouvrir('Opération de caisse', c, function (d) {
      var m = Math.round(Number(String(d.montant).replace(/\s/g, '')));
      if (!(m > 0)) return 'Indiquez le montant.';
      if (['depense', 'achat', 'sortie'].indexOf(d.type) >= 0 && !d.description) return 'Indiquez ce qui a été payé (description).';
      if (d.type === 'versement_principale' && !d.destinataire_id) return 'Aucune caissière principale enregistrée : demandez à la propriétaire.';
      var e = { id: uid(), type: d.type, date: d.date || auj(), montant: m, caissiere_id: d.caissiere_id || D.moi.id, description: d.description || '' };
      if (d.type === 'versement_principale') e.destinataire_id = d.destinataire_id;
      if (d.type === 'depense') e.categorie = d.categorie;
      if (d.type === 'achat') e.fournisseur = d.fournisseur;
      if (['depense', 'achat', 'sortie'].indexOf(d.type) >= 0) e.mode = d.mode;
      if (e.caissiere_id === e.destinataire_id) return 'La caissière principale ne se verse pas à elle-même.';
      ecrire('caisse_ajouter', { element: e }, TYPES[d.type].court + ' de ' + fcfa(m) + ' enregistré' + (d.type === 'recette' || d.type === 'apport' || d.type === 'sortie' || d.type === 'depense' ? 'e' : ''));
    });
    var aides = {
      recette: 'Le total encaissé dans la journée (à recopier du ticket de fin de journée ou du logiciel).',
      versement_principale: 'La caissière principale recevra une demande de confirmation. Tant qu\'elle n\'a pas confirmé, le versement reste « en attente ».',
      versement_patronne: 'La propriétaire confirmera la réception de l\'argent.',
      depense: 'Payée avec l\'argent de la caisse (si « Espèces »).', achat: 'Commande de médicaments ou produits chez un fournisseur.',
      sortie: 'Argent retiré de la caisse pour une autre raison (prêt, avance, monnaie…). Précisez pourquoi.',
      apport: 'Argent ajouté dans la caisse (fond de caisse, monnaie…).'
    };
    function maj() {
      var t = form.type.value;
      form.querySelectorAll('[data-types]').forEach(function (w) { w.hidden = w.getAttribute('data-types').split(' ').indexOf(t) < 0; });
      var sel = form.querySelector('#f-caisse');
      if (sel) {
        var cs = caissesPour(t);
        var actuel = sel.value || (cs.some(function (p) { return p.id === D.moi.id; }) ? D.moi.id : '');
        sel.innerHTML = options(cs.map(function (p) { return [p.id, p.nom + (p.id === D.moi.id ? ' (moi)' : '')]; }), actuel);
        $('#w-caisse span', form).textContent = /^versement/.test(t) ? 'Qui verse' : 'Caisse de';
      }
      $('#w-desc span', form).textContent = ['depense', 'achat', 'sortie'].indexOf(t) >= 0 ? 'Description (obligatoire)' : 'Note (facultatif)';
      $('#f-aide', form).textContent = aides[t] || '';
    }
    form.type.addEventListener('change', maj);
    maj();
  }

  /* ----- confirmation d'un versement ----- */

  function formConfirmer(id) {
    var c = D.caisse.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var html = '<p class="rappel"><b>' + h(nomDe(c.caissiere_id)) + '</b> annonce vous avoir remis <b>' + fcfa(c.montant) + '</b> le ' + h(dateFr(c.date)) + '.</p>' +
      champ('Montant réellement reçu (FCFA)', '<input name="montant_recu" inputmode="numeric" value="' + Number(c.montant) + '">') +
      champ('Note (facultatif)', '<input name="note" placeholder="ex. billets manquants, recompté ensemble…">') +
      '<p class="aide">Si le montant reçu est différent, l\'écart sera enregistré et visible par la propriétaire.</p>' +
      actionsForm('<button class="btn large" type="submit" name="decision" value="confirme">J\'ai reçu cet argent</button><button class="btn large sec" type="submit" name="decision" value="conteste">Contester (pas reçu / problème)</button>');
    ouvrir('Confirmer un versement', html, function (d) {
      var recu = String(d.montant_recu).replace(/\s/g, '');
      if (recu === '' || isNaN(Number(recu))) return 'Indiquez le montant reçu.';
      if (d.decision === 'conteste' && !d.note) return 'Expliquez le problème dans la note.';
      ecrire('caisse_confirmer', { id: id, decision: d.decision || 'confirme', montant_recu: Number(recu), note: d.note || '' }, d.decision === 'conteste' ? 'Versement contesté' : 'Réception confirmée');
    });
  }

  /* ----- détail d'une opération ----- */

  function peutAnnuler(x) {
    if (x.statut === 'annule') return false;
    if (proprio()) return true;
    if (x.saisi_par !== D.moi.id) return false;
    if (x.type && /^versement/.test(x.type) && x.statut === 'confirme') return false;
    if (x.personne_id && x.statut && x.statut !== 'en_attente' && x.type !== 'retard' && x.type !== 'absence') return false;
    return true;
  }

  function detail(titre, lignes, x, quoi, extra) {
    var html = '<dl class="details">' + lignes.filter(function (l) { return l[1] !== '' && l[1] != null; }).map(function (l) {
      return '<dt>' + h(l[0]) + '</dt><dd>' + h(l[1]) + '</dd>';
    }).join('') + '</dl>' + (extra || '');
    var btns = '';
    if (peutAnnuler(x)) btns += '<button class="btn sec" type="button" data-action="annuler" data-quoi="' + quoi + '" data-id="' + x.id + '">Annuler (erreur de saisie)</button>';
    html += actionsForm(btns || '<button class="btn sec" type="button" data-action="fermer">Fermer</button>');
    ouvrir(titre, html, function () {});
  }

  function detailCaisse(id) {
    var c = D.caisse.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var extra = '';
    if (c.destinataire_id === D.moi.id && (c.statut === 'en_attente' || c.statut === 'conteste')) {
      extra = '<button class="btn large" type="button" data-action="confirmer" data-id="' + c.id + '">Confirmer la réception</button>';
    }
    detail(TYPES[c.type].nom, [
      ['Montant', fcfa(c.montant)], ['Date', dateLongue(c.date)],
      [/^versement/.test(c.type) ? 'De' : 'Caisse de', nomDe(c.caissiere_id)],
      ['À', c.destinataire_id ? nomDe(c.destinataire_id) : ''],
      ['Statut', (STATUTS[c.statut] || [''])[0]],
      ['Montant reçu', c.statut === 'confirme' || c.statut === 'conteste' ? fcfa(montantSorti(c)) : ''],
      ['Écart', ecart(c) ? fcfa(ecart(c)) : ''],
      ['Catégorie', c.categorie], ['Fournisseur', c.fournisseur], ['Description', c.description],
      ['Payé', ['depense', 'achat', 'sortie'].indexOf(c.type) >= 0 ? MODES[c.mode || 'especes'] : ''],
      ['Saisi par', nomDe(c.saisi_par) + (c.saisi_le ? ', le ' + heureDe(c.saisi_le) : '')],
      ['Confirmé par', c.confirme_par ? nomDe(c.confirme_par) + ', le ' + heureDe(c.confirme_le) : ''],
      ['Note', c.note]
    ], c, 'caisse', extra);
  }

  function detailDemande(id) {
    var d = D.demandes.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    detail(d.type === 'conge' ? 'Demande de congé' : 'Demande de permission', [
      ['Personne', nomDe(d.personne_id)], ['Quand', texteDemande(d)], ['Motif', d.motif],
      ['Statut', (STATUTS[d.statut] || [''])[0]], ['Demandé le', heureDe(d.saisi_le) + (d.saisi_par !== d.personne_id ? ' par ' + nomDe(d.saisi_par) : '')],
      ['Réponse de', d.decide_par ? nomDe(d.decide_par) + ', le ' + heureDe(d.decide_le) : ''], ['Réponse', d.reponse]
    ], d, 'demande');
  }

  function detailPresence(id) {
    var x = D.presences.filter(function (p) { return p.id === id; })[0];
    if (!x) return;
    detail(x.type === 'absence' ? 'Absence' : 'Retard', [
      ['Personne', nomDe(x.personne_id)], ['Date', dateLongue(x.date)], ['Arrivée', x.heure_arrivee],
      ['Retard', x.minutes ? x.minutes + ' minutes' : ''], ['Justifié', x.justifie === 'oui' ? 'Oui' : 'Non'], ['Motif', x.motif],
      ['Noté par', nomDe(x.saisi_par) + ', le ' + heureDe(x.saisi_le)], ['Note', x.note]
    ], x, 'presence');
  }

  function formAnnuler(quoi, id) {
    var html = '<p class="aide">L\'élément restera visible (barré) avec votre motif, pour garder une trace.</p>' +
      champ('Pourquoi annuler ?', '<input name="motif" required placeholder="ex. erreur de montant, saisi deux fois…">') +
      actionsForm('<button class="btn large danger" type="submit">Annuler cet élément</button>');
    ouvrir('Annuler', html, function (d) {
      if (!d.motif) return 'Indiquez le motif.';
      ecrire('annuler', { quoi: quoi, id: id, motif: d.motif }, 'Annulé');
    });
  }

  /* ----- demandes ----- */

  function formDemande(type, pour) {
    var c = '<div class="seg petit" id="f-seg"><button type="button" data-t="conge" class="' + (type === 'conge' ? 'actif' : '') + '">Congé</button><button type="button" data-t="permission" class="' + (type === 'permission' ? 'actif' : '') + '">Permission</button></div>' +
      '<input type="hidden" name="type" value="' + (type === 'permission' ? 'permission' : 'conge') + '">';
    if (proprio()) {
      c += champ('Pour', '<select name="personne_id">' + options(D.personnel.filter(function (p) { return p.actif && p.role !== 'proprietaire'; }).map(function (p) { return [p.id, p.nom]; }), pour || '') + '</select>');
    }
    c += '<div class="deux-col">' + champ('Du', '<input type="date" name="date_debut" value="' + auj() + '" required>', ' data-t="conge"') +
      champ('Au (inclus)', '<input type="date" name="date_fin" value="' + auj() + '">', ' data-t="conge"') + '</div>';
    c += champ('Date', '<input type="date" name="date_p" value="' + auj() + '">', ' data-t="permission"');
    c += '<div class="deux-col" data-t="permission">' + champ('De (heure)', '<input type="time" name="heure_debut">') + champ('À (heure)', '<input type="time" name="heure_fin">') + '</div>';
    c += '<p class="aide" data-t="permission">Laissez les heures vides pour une permission de toute la journée.</p>';
    c += champ('Motif', '<textarea name="motif" rows="2" placeholder="Raison de la demande"></textarea>');
    c += actionsForm('<button class="btn large" type="submit">Envoyer la demande</button>');
    var form = ouvrir('Nouvelle demande', c, function (d) {
      var e = { id: uid(), type: d.type, motif: d.motif || '' };
      if (proprio()) { if (!d.personne_id) return 'Choisissez la personne.'; e.personne_id = d.personne_id; }
      if (d.type === 'conge') {
        if (!d.date_debut) return 'Indiquez la date de début.';
        e.date_debut = d.date_debut; e.date_fin = d.date_fin || d.date_debut;
        if (e.date_fin < e.date_debut) return 'La date de fin est avant la date de début.';
      } else {
        if (!d.date_p) return 'Indiquez la date.';
        e.date_debut = e.date_fin = d.date_p; e.heure_debut = d.heure_debut || ''; e.heure_fin = d.heure_fin || '';
      }
      if (!e.motif) return 'Indiquez le motif.';
      ecrire('demande_ajouter', { element: e }, 'Demande envoyée');
    });
    function maj(t) {
      form.type.value = t;
      form.querySelectorAll('#f-seg button').forEach(function (b) { b.classList.toggle('actif', b.getAttribute('data-t') === t); });
      form.querySelectorAll('[data-t]').forEach(function (w) { if (w.tagName !== 'BUTTON') w.hidden = w.getAttribute('data-t') !== t; });
    }
    form.querySelectorAll('#f-seg button').forEach(function (b) { b.addEventListener('click', function () { maj(b.getAttribute('data-t')); }); });
    maj(form.type.value);
  }

  function formDecider(id, decision) {
    var d = D.demandes.filter(function (x) { return x.id === id; })[0];
    var html = '<p class="rappel"><b>' + h(nomDe(d.personne_id)) + '</b> — ' + h(texteDemande(d)) + (d.motif ? '<br>« ' + h(d.motif) + ' »' : '') + '</p>';
    // Prévenir si d'autres personnes sont déjà absentes sur ces dates.
    var conflits = actifs(D.demandes).filter(function (o) {
      return o.id !== d.id && o.statut === 'accordee' && o.date_debut <= d.date_fin && o.date_fin >= d.date_debut;
    });
    if (conflits.length) html += '<p class="aide alerte-txt">Déjà absents sur ces dates : ' + conflits.map(function (o) { return h(nomDe(o.personne_id)) + ' (' + h(texteDemande(o)) + ')'; }).join(', ') + '</p>';
    html += champ('Message (facultatif)', '<input name="reponse" placeholder="' + (decision === 'refusee' ? 'Raison du refus' : 'ex. Bon congé !') + '">');
    html += actionsForm('<button class="btn large ' + (decision === 'refusee' ? 'danger' : '') + '" type="submit">' + (decision === 'refusee' ? 'Refuser' : 'Accorder') + '</button>');
    ouvrir(decision === 'refusee' ? 'Refuser la demande' : 'Accorder la demande', html, function (f) {
      ecrire('demande_decider', { id: id, decision: decision, reponse: f.reponse || '' }, decision === 'refusee' ? 'Demande refusée' : 'Demande accordée');
    });
  }

  /* ----- retards / absences ----- */

  function formPresence(pour) {
    var c = champ('Personne', '<select name="personne_id">' + options([['', 'Choisir…']].concat(D.personnel.filter(function (p) { return p.actif && p.role !== 'proprietaire'; }).map(function (p) { return [p.id, p.nom]; })), pour || '') + '</select>');
    c += '<div class="seg petit" id="f-seg"><button type="button" data-t="retard" class="actif">Retard</button><button type="button" data-t="absence">Absence</button></div><input type="hidden" name="type" value="retard">';
    c += champ('Date', '<input type="date" name="date" value="' + auj() + '" max="' + auj() + '">');
    c += '<div class="deux-col" data-t="retard">' + champ('Heure d\'arrivée', '<input type="time" name="heure_arrivee">') + champ('Minutes de retard', '<input name="minutes" inputmode="numeric" placeholder="ex. 30">') + '</div>';
    c += champ('Justifié ?', '<select name="justifie"><option value="non">Non justifié</option><option value="oui">Justifié</option></select>');
    c += champ('Motif / explication', '<input name="motif" placeholder="ex. transport, maladie…">');
    c += actionsForm('<button class="btn large" type="submit">Enregistrer</button>');
    var form = ouvrir('Retard ou absence', c, function (d) {
      if (!d.personne_id) return 'Choisissez la personne.';
      var e = { id: uid(), personne_id: d.personne_id, type: d.type, date: d.date || auj(), justifie: d.justifie, motif: d.motif || '' };
      if (d.type === 'retard') { e.heure_arrivee = d.heure_arrivee || ''; e.minutes = Number(d.minutes) || 0; if (!e.minutes && !e.heure_arrivee) return 'Indiquez l\'heure d\'arrivée ou les minutes de retard.'; }
      ecrire('presence_ajouter', { element: e }, (d.type === 'absence' ? 'Absence' : 'Retard') + ' enregistré' + (d.type === 'absence' ? 'e' : ''));
    });
    function maj(t) {
      form.type.value = t;
      form.querySelectorAll('#f-seg button').forEach(function (b) { b.classList.toggle('actif', b.getAttribute('data-t') === t); });
      form.querySelectorAll('div[data-t]').forEach(function (w) { w.hidden = w.getAttribute('data-t') !== t; });
    }
    form.querySelectorAll('#f-seg button').forEach(function (b) { b.addEventListener('click', function () { maj(b.getAttribute('data-t')); }); });
  }

  /* ----- fiche employé ----- */

  function fiche(id) {
    var p = personne(id);
    if (!p) return;
    var s = statsPersonne(id);
    var html = '<div class="ligne"><div class="avatar grand">' + h(p.nom.charAt(0)) + '</div><div class="l-txt"><b>' + h(p.nom) + '</b><small>' + h([ROLES[p.role], p.poste, p.telephone].filter(Boolean).join(' · ')) + '</small></div></div>';
    if (p.role !== 'proprietaire') {
      html += '<div class="chiffres petits"><div><span>Retards (mois)</span><b>' + s.retards + '</b></div><div><span>Absences (mois)</span><b>' + s.absences + '</b></div><div><span>Congés (année)</span><b>' + s.joursConge + ' j</b></div></div>';
    }
    if (p.role === 'caissiere' || p.role === 'principale') html += '<p class="rappel">' + (p.role === 'caissiere' ? 'Reste à verser' : 'Argent en main') + ' : <b>' + fcfa(solde(p.id)) + '</b></p>';
    var dem = D.demandes.filter(function (d) { return d.personne_id === id; }).sort(function (a, b) { return a.date_debut < b.date_debut ? 1 : -1; });
    var pres = D.presences.filter(function (x) { return x.personne_id === id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    html += '<h4>Congés et permissions</h4>' + (dem.length ? dem.slice(0, 10).map(ligneDemande).join('') : '<p class="vide">Aucune.</p>');
    html += '<h4>Retards et absences</h4>' + (pres.length ? pres.slice(0, 15).map(lignePresence).join('') : '<p class="vide">Aucun.</p>');
    var b = '';
    if (p.role !== 'proprietaire' && p.actif) b += '<button class="btn sec" type="button" data-action="presence" data-pour="' + id + '">+ Retard / absence</button>';
    if (proprio()) b += '<button class="btn sec" type="button" data-action="employe" data-id="' + id + '">Modifier la fiche / le code</button>';
    html += actionsForm(b || '<button class="btn sec" type="button" data-action="fermer">Fermer</button>');
    ouvrir('Fiche employé', html, function () {});
  }

  function formEmploye(id) {
    var p = id ? personne(id) : null;
    var c = champ('Nom et prénom', '<input name="nom" value="' + h(p ? p.nom : '') + '" required autocomplete="off">');
    c += champ('Rôle dans l\'application', '<select name="role">' + options([['employe', 'Employé(e) — congés, permissions'], ['caissiere', 'Caissière — + sa caisse'], ['principale', 'Caissière principale — + toutes les caisses, retards'], ['proprietaire', 'Propriétaire — tout']], p ? p.role : 'employe') + '</select>');
    c += champ('Poste (facultatif)', '<input name="poste" value="' + h(p ? p.poste : '') + '" placeholder="ex. Pharmacien adjoint, vendeuse, magasinier…">');
    c += champ('Téléphone (facultatif)', '<input name="telephone" type="tel" value="' + h(p ? p.telephone : '') + '">');
    c += champ(p ? 'Nouveau code (laisser vide pour garder l\'ancien)' : 'Code de connexion (4 à 6 chiffres)', '<input name="pin" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="ex. 4821">');
    if (p && p.id !== D.moi.id) c += '<label class="case"><input type="checkbox" name="retirer"' + (p.actif ? '' : ' checked') + '> Retirer l\'accès (ne travaille plus à la pharmacie)</label>';
    c += '<p class="aide">Donnez le code à la personne de vive voix. Elle pourra le changer ensuite.</p>';
    c += actionsForm('<button class="btn large" type="submit">Enregistrer</button>');
    ouvrir(p ? 'Modifier ' + prenom(p.nom) : 'Ajouter un employé', c, function (d) {
      if (!d.nom) return 'Indiquez le nom.';
      if (!p && !/^\d{4,6}$/.test(d.pin)) return 'Le code doit avoir 4 à 6 chiffres.';
      if (d.pin && !/^\d{4,6}$/.test(d.pin)) return 'Le code doit avoir 4 à 6 chiffres.';
      var e = { id: p ? p.id : '', nom: d.nom, role: d.role, poste: d.poste, telephone: d.telephone, pin: d.pin || '', actif: !d.retirer };
      return API.appel('personnel_enregistrer', { element: e }).then(function () {
        toast(p ? 'Fiche enregistrée' : d.nom + ' ajouté(e). Code : ' + d.pin, 'ok');
        charger();
      }, function (err) { return err.serveur ? err.message : 'Pas de connexion : réessayez quand internet revient.'; });
    });
  }

  /* ----- divers ----- */

  function formPin() {
    var c = champ('Code actuel', '<input name="ancien" type="password" inputmode="numeric" maxlength="6">') +
      champ('Nouveau code (4 à 6 chiffres)', '<input name="nouveau" type="password" inputmode="numeric" maxlength="6">') +
      champ('Nouveau code, encore une fois', '<input name="nouveau2" type="password" inputmode="numeric" maxlength="6">') +
      actionsForm('<button class="btn large" type="submit">Changer mon code</button>');
    ouvrir('Changer mon code', c, function (d) {
      if (!/^\d{4,6}$/.test(d.nouveau)) return 'Le code doit avoir 4 à 6 chiffres.';
      if (d.nouveau !== d.nouveau2) return 'Les deux nouveaux codes ne sont pas pareils.';
      return API.appel('pin_changer', { ancien: d.ancien, nouveau: d.nouveau }).then(function () { toast('Code changé', 'ok'); },
        function (err) { return err.serveur ? err.message : 'Pas de connexion.'; });
    });
  }

  function formNomPharmacie() {
    ouvrir('Nom de la pharmacie', champ('Nom', '<input name="nom" value="' + h(D.pharmacie) + '">') + actionsForm('<button class="btn large" type="submit">Enregistrer</button>'), function (d) {
      return API.appel('parametres', { pharmacie: d.nom }).then(function () { charger(); }, function (err) { return err.message; });
    });
  }

  function lienPartage() {
    var base = location.origin + location.pathname;
    return window.PHARMACIE_SERVEUR ? base : base + '?serveur=' + encodeURIComponent(API.serveur());
  }

  function partager() {
    var lien = lienPartage();
    var texte = 'Application de la pharmacie ' + D.pharmacie + ' : ouvrez ce lien, ajoutez-le à l\'écran d\'accueil, puis connectez-vous avec votre nom et votre code.';
    if (navigator.share) { navigator.share({ title: D.pharmacie, text: texte, url: lien }).catch(function () {}); return; }
    var c = '<p class="aide">' + h(texte) + '</p>' + champ('Lien', '<input readonly value="' + h(lien) + '" onclick="this.select()">') +
      actionsForm('<button class="btn large" type="button" data-action="copier">Copier le lien</button>');
    ouvrir('Envoyer l\'application', c, function () {});
  }

  function exporter() {
    var liste = caisseFiltree();
    var cols = [['Date', 'date'], ['Opération', function (c) { return TYPES[c.type].nom; }], ['Montant', 'montant'], ['De / caisse', function (c) { return nomDe(c.caissiere_id); }],
      ['À', function (c) { return c.destinataire_id ? nomDe(c.destinataire_id) : ''; }], ['Statut', function (c) { return (STATUTS[c.statut] || [''])[0]; }],
      ['Montant reçu', function (c) { return c.statut === 'confirme' || c.statut === 'conteste' ? montantSorti(c) : ''; }], ['Catégorie', 'categorie'],
      ['Fournisseur', 'fournisseur'], ['Description', 'description'], ['Payé', function (c) { return ['depense', 'achat', 'sortie'].indexOf(c.type) >= 0 ? MODES[c.mode || 'especes'] : ''; }],
      ['Saisi par', function (c) { return nomDe(c.saisi_par); }], ['Saisi le', 'saisi_le'], ['Note', 'note']];
    var lignes = [cols.map(function (c) { return c[0]; })].concat(liste.map(function (c) {
      return cols.map(function (k) { return typeof k[1] === 'function' ? k[1](c) : c[k[1]]; });
    }));
    var csv = '﻿' + lignes.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'caisse-' + periode(etat.periode).debut.replace(/^0+-.*/, 'tout') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ============================================================== clics */

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), id = b.getAttribute('data-id'), v = b.getAttribute('data-v'), t = b.getAttribute('data-type');
    if (a === 'filtre-personne' || a === 'filtre-type') return;
    // Un bouton d'action dans une feuille ne doit pas envoyer le formulaire.
    if (b.tagName === 'BUTTON') ev.preventDefault();
    switch (a) {
      case 'aller': vue = v; fermer(); rendre(); window.scrollTo(0, 0); break;
      case 'fermer': fermer(); break;
      case 'op': formOperation(t); break;
      case 'demande': formDemande(t || 'conge'); break;
      case 'presence': formPresence(b.getAttribute('data-pour')); break;
      case 'confirmer': formConfirmer(id); break;
      case 'detail': detailCaisse(id); break;
      case 'detail-demande': detailDemande(id); break;
      case 'detail-presence': detailPresence(id); break;
      case 'annuler': formAnnuler(b.getAttribute('data-quoi'), id); break;
      case 'decider': formDecider(id, v); break;
      case 'fiche': fiche(id); break;
      case 'employe': formEmploye(id); break;
      case 'seg': etat.seg = v; rendre(); break;
      case 'filtre': etat[b.getAttribute('data-f')] = v; rendre(); break;
      case 'moisP':
        var d = jour((etat.moisP || auj().slice(0, 7)) + '-01'); d.setMonth(d.getMonth() + Number(v));
        etat.moisP = iso(d).slice(0, 7); rendre(); break;
      case 'export': exporter(); break;
      case 'pin': formPin(); break;
      case 'nom-pharmacie': formNomPharmacie(); break;
      case 'partager': partager(); break;
      case 'copier':
        var inp = $('#feuille input[readonly]');
        if (navigator.clipboard) navigator.clipboard.writeText(inp.value).then(function () { toast('Lien copié', 'ok'); });
        else { inp.select(); document.execCommand('copy'); toast('Lien copié', 'ok'); }
        break;
      case 'actualiser': toast('Actualisation…'); charger().then(function () { if (!horsLigne) toast('À jour', 'ok'); }); break;
      case 'deconnexion':
        if (API.envois().length && !confirm('Des saisies ne sont pas encore envoyées. Elles seront perdues si vous vous déconnectez. Continuer ?')) return;
        API.appel('deconnexion').catch(function () {});
        API.oublier(); brut = D = null; vue = 'accueil'; demarrer(); break;
      case 'serveur': ecranServeur(); break;
    }
  });

  document.addEventListener('change', function (ev) {
    var a = ev.target.getAttribute && ev.target.getAttribute('data-action');
    if (a === 'filtre-personne') { etat.personne = ev.target.value; rendre(); }
    if (a === 'filtre-type') { etat.type = ev.target.value; rendre(); }
  });

  /* ======================================== démarrage, connexion, installation */

  function ecranSimple(html) {
    $('#onglets').hidden = true;
    rendreEntete();
    ecran.innerHTML = '<div class="accueil-connexion">' + html + '</div>';
  }

  function ecranServeur() {
    fermer();
    ecranSimple('<h2>Relier l\'application</h2><p class="aide">Collez l\'adresse du serveur de la pharmacie (elle se termine par <b>/exec</b>). La propriétaire la trouve dans Apps Script → Déployer.</p>' +
      '<form id="f-serveur"><input name="u" placeholder="https://script.google.com/macros/s/…/exec" value="' + h(API.serveur()) + '"><button class="btn large">Continuer</button></form>');
    $('#f-serveur').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = e.target.u.value.trim();
      if (!u) return;
      API.changerServeur(u); demarrer();
    });
  }

  function demarrer() {
    fermer();
    if (!API.serveur()) return ecranServeur();
    if (API.jeton()) {
      brut = API.donneesLocales();
      if (brut) { reconstruire(); rendre(); }
      else ecranSimple('<p class="aide">Chargement…</p>');
      return charger();
    }
    ecranSimple('<p class="aide">Chargement…</p>');
    API.appel('etat').then(function (rep) {
      $('#titre').textContent = rep.pharmacie;
      if (!rep.installe) ecranInstallation(); else ecranConnexion(rep);
    }, function (err) {
      ecranSimple('<h2>Pas de connexion</h2><p class="aide">' + h(err.serveur ? err.message : 'Impossible de joindre le serveur. Vérifiez internet puis réessayez.') + '</p>' +
        '<button class="btn large" onclick="location.reload()">Réessayer</button><button class="lien" data-action="serveur">Changer l\'adresse du serveur</button>');
    });
  }

  function ecranConnexion(rep) {
    var html = '<h2>Qui êtes-vous ?</h2><div class="noms">' + rep.personnel.map(function (p) {
      return '<button class="nom" data-pid="' + p.id + '"><span class="avatar">' + h(p.nom.charAt(0).toUpperCase()) + '</span>' + h(p.nom) + '</button>';
    }).join('') + '</div>';
    ecranSimple(html);
    ecran.querySelectorAll('.nom').forEach(function (b) {
      b.addEventListener('click', function () {
        var pid = b.getAttribute('data-pid');
        var nom = b.textContent.slice(1);
        ecranSimple('<button class="lien" id="retour">‹ Changer de personne</button><h2>' + h(nom) + '</h2><form id="f-pin"><label class="champ"><span>Votre code</span><input name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" autofocus></label><p class="erreur" id="err"></p><button class="btn large">Entrer</button></form>');
        $('#retour').addEventListener('click', function () { ecranConnexion(rep); });
        $('#f-pin').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = e.target.querySelector('button'); btn.disabled = true;
          API.appel('connexion', { personne_id: pid, pin: e.target.pin.value }).then(function (r) {
            API.garderJeton(r.jeton); vue = 'accueil'; demarrer();
          }, function (err) {
            btn.disabled = false;
            $('#err').textContent = err.serveur ? err.message : 'Pas de connexion internet.';
            e.target.pin.value = ''; e.target.pin.focus();
          });
        });
      });
    });
  }

  function ecranInstallation() {
    ecranSimple('<h2>Bienvenue</h2><p class="aide">Première ouverture : créez le compte de la propriétaire. Vous ajouterez ensuite les employés.</p>' +
      '<form id="f-inst"><label class="champ"><span>Nom de la pharmacie</span><input name="pharmacie" placeholder="ex. Pharmacie du Centre"></label>' +
      '<label class="champ"><span>Votre nom et prénom</span><input name="nom"></label>' +
      '<label class="champ"><span>Votre code (4 à 6 chiffres)</span><input name="pin" type="password" inputmode="numeric" maxlength="6"></label>' +
      '<label class="champ"><span>Le même code, encore une fois</span><input name="pin2" type="password" inputmode="numeric" maxlength="6"></label>' +
      '<p class="erreur" id="err"></p><button class="btn large">Créer</button></form>');
    $('#f-inst').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.pin.value !== f.pin2.value) { $('#err').textContent = 'Les deux codes ne sont pas pareils.'; return; }
      API.appel('installer', { pharmacie: f.pharmacie.value, nom: f.nom.value, pin: f.pin.value }).then(function (r) {
        API.garderJeton(r.jeton); vue = 'personnel'; etat.seg = 'equipe'; demarrer();
      }, function (err) { $('#err').textContent = err.serveur ? err.message : 'Pas de connexion internet.'; });
    });
  }

  demarrer();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js'); });
  }
})();
