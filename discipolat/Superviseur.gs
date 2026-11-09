/**
 * Discipolat : suivi des disciples
 * Fichier 4/4 : espace superviseur.
 *
 * Tableau de bord, zones automatiques, fin de période d'essai, validation et
 * correction des semaines, motifs d'absence, programmes optionnels, statuts,
 * réglages, critères et récap WhatsApp.
 *
 * Après l'installation, lancez une fois « installerDeclencheurHebdo » :
 * les zones seront vérifiées chaque lundi matin, même sans ouvrir l'app.
 */

// Changements de statut possibles à la main (le passage automatique est géré à part)
var TRANSITIONS_MANUELLES = {};
TRANSITIONS_MANUELLES[STATUTS.CANDIDAT]    = [];
TRANSITIONS_MANUELLES[STATUTS.ESSAI]       = [STATUTS.ACTIF, STATUTS.NON_RETENU];
TRANSITIONS_MANUELLES[STATUTS.ACTIF]       = [STATUTS.OBSERVATION, STATUTS.RETIRE];
TRANSITIONS_MANUELLES[STATUTS.OBSERVATION] = [STATUTS.ACTIF, STATUTS.RETIRE];
TRANSITIONS_MANUELLES[STATUTS.CRITIQUE]    = [STATUTS.ACTIF, STATUTS.OBSERVATION, STATUTS.RETIRE];
TRANSITIONS_MANUELLES[STATUTS.RETIRE]      = [STATUTS.ACTIF];
TRANSITIONS_MANUELLES[STATUTS.NON_RETENU]  = [STATUTS.CANDIDAT];

/** 'vert' ≥ seuil actif, 'orange' ≥ seuil critique, sinon 'rouge'. */
function zoneDe_(score, r) {
  if (score === null || score === undefined) return 'aucune';
  return score >= r.seuilActif ? 'vert' : (score >= r.seuilCritique ? 'orange' : 'rouge');
}

/* =====================================================================
 * Zones automatiques
 * ===================================================================== */

/**
 * Pour les disciples confirmés, regarde les N dernières semaines terminées
 * (N = SemainesZone), postérieures au dernier changement de statut :
 *  - toutes sous le seuil critique  -> Zone critique
 *  - toutes sous le seuil actif     -> En observation (seulement depuis Disciple actif)
 * Les zones ne remontent jamais seules : le retour est proposé au superviseur.
 * Une semaine non remplie compte 0 %.
 */
function verifierZones_(pre) {
  var r = reglages_();
  var scores = {};
  (pre && pre.suivi || lire_(ONGLETS.SUIVI)).forEach(function(l){ scores[String(l.Cle)] = Number(l.Score) || 0; });
  var changes = [];
  lire_(ONGLETS.DISCIPLES).forEach(function(d) {
    if (STATUTS_ZONES.indexOf(d.Statut) === -1 || d.Statut === STATUTS.CRITIQUE) return;
    var depuis = lundiDe_(parseDate_(d.DateDernierStatut));
    var liste = [];
    for (var o = -1; o >= -r.semainesZone; o--) {
      var s = semaineId_(o);
      if (depuis && s <= depuis) return;
      var sc = scores[s + '_' + d.Id];
      liste.push(sc === undefined ? 0 : sc);
    }
    var toutesCritiques = liste.every(function(x){ return x < r.seuilCritique; });
    var toutesSousActif = liste.every(function(x){ return x < r.seuilActif; });
    var detail = liste.slice().reverse().map(function(x){ return x + ' %'; }).join(', ');
    if (toutesCritiques) {
      changerStatut_(d, STATUTS.CRITIQUE, 'Automatique', 'Sous ' + r.seuilCritique + ' % pendant ' + r.semainesZone + ' semaines (' + detail + ')');
      changes.push({ nom: nomAffiche_(d), slug: String(d.Id), vers: STATUTS.CRITIQUE });
    } else if (toutesSousActif && d.Statut === STATUTS.ACTIF) {
      changerStatut_(d, STATUTS.OBSERVATION, 'Automatique', 'Entre ' + r.seuilCritique + ' et ' + (r.seuilActif - 1) + ' % pendant ' + r.semainesZone + ' semaines (' + detail + ')');
      changes.push({ nom: nomAffiche_(d), slug: String(d.Id), vers: STATUTS.OBSERVATION });
    }
  });
  return changes;
}

function verifierStatutsHebdo() {
  cloturerSemaines_();
  var c = verifierZones_();
  Logger.log(c.length ? c.map(function(x){ return x.nom + ' -> ' + x.vers; }).join('\n') : 'Aucun changement.');
}

function installerDeclencheurHebdo() {
  reserveProprietaire_();
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'verifierStatutsHebdo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('verifierStatutsHebdo').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
  Logger.log('Vérification programmée chaque lundi vers 6h.');
}

/* =====================================================================
 * Période d'essai
 * ===================================================================== */

/**
 * Bilan d'essai : scores des semaines d'essai, moyenne, terminé ou non.
 * La moyenne ne compte que les semaines closes (une semaine close non remplie compte 0 %).
 */
function bilanEssai_(d, scores) {
  var sem = semainesEssai_(d);
  var r = reglages_();
  var liste = sem.map(function(s){
    var sc = scores[s + '_' + d.Id];
    return { weekId: s, label: semaineLibelle_(s), score: sc === undefined ? null : sc };
  });
  var fin = texteSemaine_(d.FinEssai);
  var termine = !!fin && semaineId_(0) >= fin;
  var passees = liste.filter(function(x){ return semaineCloturee_(x.weekId); });
  var moyenne = passees.length ? Math.round(passees.reduce(function(a, x){ return a + (x.score || 0); }, 0) / passees.length) : 0;
  return { semaines: liste, moyenne: moyenne, passees: passees.length, termine: termine, fin: fin, reussi: moyenne >= r.seuilActif };
}

function prolongerEssai(token, id) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d || d.Statut !== STATUTS.ESSAI) throw new Error('Ce disciple n\'est pas en période d\'essai.');
  var n = reglages_().semainesEssai;
  var base = texteSemaine_(d.FinEssai) || semaineId_(1);
  var nouvelleFin = decalerSemaine_(base < semaineId_(0) ? semaineId_(0) : base, n);
  majLigne_(ONGLETS.DISCIPLES, d._ligne, { FinEssai: "'" + nouvelleFin });
  journaliserStatut_(d.Id, d.Prenom, d.Statut, d.Statut, 'Superviseur', 'Essai prolongé de ' + n + ' semaines (bilan le ' + nouvelleFin + ')');
  return getLeaderDetail(token, id, 0);
}

/* =====================================================================
 * Tableau de bord
 * ===================================================================== */

function getAdminDashboard(token, offset) {
  sessionAdmin_(token);
  offset = Math.min(0, Number(offset) || 0);
  cloturerSemaines_();
  var pre = { suivi: lire_(ONGLETS.SUIVI) };
  var nouveaux = verifierZones_(pre);
  var r = reglages_();
  var semaine = semaineId_(offset), semainePassee = semaineId_(-1);
  var enCours = !semaineCloturee_(semaine);
  var parCle = {}, scores = {};
  pre.suivi.forEach(function(l){ parCle[String(l.Cle)] = l; scores[String(l.Cle)] = Number(l.Score) || 0; });

  var disciples = lire_(ONGLETS.DISCIPLES);
  var suivis = disciples.filter(function(d){ return STATUTS_SUIVIS.indexOf(d.Statut) !== -1; });
  var absences = lire_(ONGLETS.ABSENCES).filter(function(a){ return String(a.Etat) === ABSENCE.ATTENTE; });

  var rows = suivis.map(function(d) {
    var l = parCle[semaine + '_' + d.Id];
    var sc = l ? Number(l.Score) || 0 : 0;
    return { slug: String(d.Id), name: nomAffiche_(d), statut: d.Statut, percent: sc,
             // Non rempli : ni vert, ni orange, ni rouge dans les compteurs (affiché ⚪ dans la liste)
             zone: enCours ? 'encours' : (l ? zoneDe_(sc, r) : 'aucune'),
             rempli: !!l, validation: l ? String(l.Validation) : 'Non rempli' };
  }).sort(function(a, b){ return b.percent - a.percent || a.name.localeCompare(b.name, 'fr'); });

  // Alertes et propositions
  var alertes = [];
  nouveaux.forEach(function(c){
    alertes.push({ type: c.vers === STATUTS.CRITIQUE ? 'critique' : 'observation', slug: c.slug,
      texte: c.nom + ' passe ' + (c.vers === STATUTS.CRITIQUE ? 'en zone critique' : 'en observation') + ' (' + r.semainesZone + ' semaines de suite).' });
  });
  suivis.forEach(function(d) {
    var nom = nomAffiche_(d), slug = String(d.Id);
    if (d.Statut === STATUTS.CRITIQUE && !nouveaux.some(function(c){ return c.slug === slug; })) {
      alertes.push({ type: 'critique', slug: slug, texte: nom + ' est en zone critique.' });
    }
    if (d.Statut === STATUTS.OBSERVATION || d.Statut === STATUTS.CRITIQUE) {
      var l = parCle[semainePassee + '_' + d.Id];
      if (l && Number(l.Score) >= r.seuilActif) {
        alertes.push({ type: 'remonte', slug: slug, texte: nom + ' est repassé(e) à ' + Number(l.Score) + ' % la semaine dernière. Proposer le retour en Disciple actif ?' });
      }
    }
    if (d.Statut === STATUTS.ESSAI) {
      var b = bilanEssai_(d, scores);
      if (b.termine) {
        alertes.push(b.reussi
          ? { type: 'essai_ok', slug: slug, texte: 'Fin d\'essai : ' + nom + ' a une moyenne de ' + b.moyenne + ' %. Le confirmer Disciple ?' }
          : { type: 'essai_ko', slug: slug, texte: 'Fin d\'essai : ' + nom + ' a une moyenne de ' + b.moyenne + ' %. Prolonger l\'essai ou « Non retenu » ?' });
      }
    }
  });
  if (absences.length) {
    alertes.push({ type: 'absences', texte: absences.length + ' motif' + (absences.length > 1 ? 's' : '') + ' d\'absence à examiner.' });
  }

  var notes = rows.filter(function(x){ return x.rempli; });
  return {
    label: semaineLibelle_(semaine), offsetWeeks: offset, canGoBack: offset > -SEMAINES_MAX_HISTORIQUE,
    seuilActif: r.seuilActif, seuilCritique: r.seuilCritique,
    enCours: enCours, joursEcoules: enCours ? (new Date().getDay() + 6) % 7 + 1 : 7,
    average: notes.length ? Math.round(notes.reduce(function(s, x){ return s + x.percent; }, 0) / notes.length) : 0,
    vert: rows.filter(function(x){ return x.zone === 'vert'; }).length,
    orange: rows.filter(function(x){ return x.zone === 'orange'; }).length,
    rouge: rows.filter(function(x){ return x.zone === 'rouge'; }).length,
    aValider: rows.filter(function(x){ return x.validation === VALIDATION.A_VALIDER; }).length,
    enAttente: disciples.filter(function(d){ return d.Statut === STATUTS.CANDIDAT; }).length,
    absencesEnAttente: absences.length,
    alertes: alertes,
    rows: rows,
    autres: disciples.filter(function(d){ return d.Statut === STATUTS.RETIRE || d.Statut === STATUTS.NON_RETENU; })
      .map(function(d){ return { slug: String(d.Id), name: nomAffiche_(d), statut: d.Statut, depuis: fmtDate_(d.DateDernierStatut) }; }),
    teamHistory: historiqueEquipe_(pre.suivi, suivis, 8)
  };
}

function historiqueEquipe_(suivi, suivis, nb) {
  var ids = {};
  suivis.forEach(function(d){ ids[String(d.Id)] = true; });
  var points = [];
  for (var o = -(nb - 1); o <= 0; o++) {
    var s = semaineId_(o);
    var sc = suivi.filter(function(l){ return semaineDe_(l) === s && ids[String(l.DiscipleId)]; })
      .map(function(l){ return Number(l.Score) || 0; });
    points.push({ weekId: s, label: s.slice(8, 10) + '/' + s.slice(5, 7), long: semaineLibelle_(s),
      score: sc.length ? Math.round(sc.reduce(function(a, b){ return a + b; }, 0) / sc.length) : null,
      participants: sc.length });
  }
  return points;
}

/* =====================================================================
 * Fiche d'un disciple
 * ===================================================================== */

function getLeaderDetail(token, id, offset) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  offset = Math.min(0, Number(offset) || 0);
  var criteres = lireCriteres_(true);
  var semaine = semaineId_(offset);
  var vue = construireVueSemaine_(d, semaine, offset, chargerSemaine_(d.Id, semaine), criteres, true);
  vue.editable = true; // le superviseur peut toujours corriger
  var scores = {};
  lire_(ONGLETS.SUIVI).forEach(function(l){ scores[String(l.Cle)] = Number(l.Score) || 0; });
  return {
    slug: String(d.Id), name: nomAffiche_(d), telephone: String(d.Telephone).replace(/^'/, ''), statut: d.Statut,
    inscrit: fmtDate_(d.DateInscription), note: String(d.NoteSuperviseur || ''),
    transitions: TRANSITIONS_MANUELLES[d.Statut] || [],
    essai: d.Statut === STATUTS.ESSAI ? bilanEssai_(d, scores) : null,
    semaine: vue,
    history: historiqueDisciple_(d.Id, 12),
    statuts: lire_(ONGLETS.HISTORIQUE).filter(function(h){ return String(h.DiscipleId) === String(d.Id); })
      .map(function(h){ return { date: fmtDate_(h.Date), de: String(h.AncienStatut), vers: String(h.NouveauStatut),
                                 origine: String(h.Origine), motif: String(h.Motif) }; }).reverse()
  };
}

/* =====================================================================
 * Validation et correction d'une semaine
 * ===================================================================== */

function validerSemaine(token, id, offset, commentaire) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  var criteres = lireCriteres_(true);
  var semaine = semaineId_(Number(offset) || 0);
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var ctx = chargerSemaine_(d.Id, semaine);
    var etat = ctx.ligne && ctx.ligne.Validation === VALIDATION.CORRIGE ? VALIDATION.CORRIGE : VALIDATION.VALIDE;
    recalculerSemaine_(d, semaine, criteres, {
      Validation: etat, DateValidation: maintenant_(), CommentaireSuperviseur: String(commentaire || '').slice(0, 500)
    });
  } finally { verrou.releaseLock(); }
  return getLeaderDetail(token, id, offset);
}

/**
 * Corrige une case. cible = { type: 'jour'|'semaine'|'present'|'alHeure', critere, element, valeur }
 *  - jour    : critere = id du critère, element = 'Lun'…'Dim'
 *  - semaine : critere = id du critère, element = index de la case (0, 1…)
 *  - present / alHeure : element = id du programme
 */
function corrigerCase(token, id, offset, cible) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  var criteres = lireCriteres_(true);
  var semaine = semaineId_(Number(offset) || 0);
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var ctx = chargerSemaine_(d.Id, semaine);
    var ligne = ctx.ligne || creerLigneSemaine_(d, semaine, criteres);
    var valeur = !!cible.valeur, ancien, libelle;
    if (cible.type === 'jour' || cible.type === 'semaine') {
      var c = trouverCritere_(criteres, cible.critere, cible.type);
      var col = cible.type === 'jour' ? c.Id + '_' + cible.element : c.Id + '_' + (Number(cible.element) + 1);
      if (colonnesCritere_(c).indexOf(col) === -1) throw new Error('Case inconnue.');
      ancien = estVrai_(ligne[col]);
      libelle = cible.type === 'jour' ? c.Libelle + ' (' + cible.element + ')' : c.Elements[Number(cible.element)];
      var champs = {}; champs[col] = valeur;
      majLigne_(ONGLETS.SUIVI, ligne._ligne, champs);
    } else if (cible.type === 'present' || cible.type === 'alHeure') {
      var p = ctx.programmes.filter(function(x){ return x.id === cible.element; })[0];
      if (!p) throw new Error('Programme inconnu pour cette semaine.');
      var pr = ctx.presences[p.id] || { present: false, alHeure: false };
      ancien = cible.type === 'present' ? pr.present : pr.alHeure;
      var present = cible.type === 'present' ? valeur : (valeur || pr.present);
      var alHeure = cible.type === 'alHeure' ? valeur : (valeur ? pr.alHeure : false);
      ecrirePresence_(d, semaine, p.id, present, present && alHeure);
      libelle = p.nom + (cible.type === 'alHeure' ? ' · à l\'heure' : ' · présent');
    } else {
      throw new Error('Type de case inconnu.');
    }
    if (ancien !== valeur) {
      ajouterLigne_(ONGLETS.CORRECTIONS, { Date: maintenant_(), DiscipleId: d.Id, Semaine: "'" + semaine, Critere: libelle,
        AncienneValeur: ancien ? 'Oui' : 'Non', NouvelleValeur: valeur ? 'Oui' : 'Non' });
      recalculerSemaine_(d, semaine, criteres, { Validation: VALIDATION.CORRIGE, DateValidation: maintenant_() });
    }
  } finally { verrou.releaseLock(); }
  return getLeaderDetail(token, id, offset);
}

/* =====================================================================
 * Motifs d'absence
 * ===================================================================== */

function getAbsencesEnAttente(token) {
  sessionAdmin_(token);
  var noms = {};
  lire_(ONGLETS.DISCIPLES).forEach(function(d){ noms[String(d.Id)] = nomAffiche_(d); });
  return lire_(ONGLETS.ABSENCES).filter(function(a){ return String(a.Etat) === ABSENCE.ATTENTE; })
    .map(function(a){
      var s = texteSemaine_(a.Semaine);
      return { id: String(a.Id), slug: String(a.DiscipleId), name: noms[String(a.DiscipleId)] || String(a.Prenom),
               semaine: semaineLibelle_(s), libelle: String(a.Libelle), motif: String(a.Motif),
               precision: String(a.Precision || ''), date: fmtDate_(a.DateDemande) };
    });
}

/** accepter = true : la case est retirée du calcul ; false : elle compte comme non faite. */
function deciderAbsence(token, idAbsence, accepter) {
  sessionAdmin_(token);
  var a = lire_(ONGLETS.ABSENCES).filter(function(x){ return String(x.Id) === String(idAbsence); })[0];
  if (!a) throw new Error('Motif introuvable.');
  if (String(a.Etat) !== ABSENCE.ATTENTE) throw new Error('Ce motif a déjà été traité.');
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    majLigne_(ONGLETS.ABSENCES, a._ligne, { Etat: accepter ? ABSENCE.ACCEPTEE : ABSENCE.REFUSEE, DateDecision: maintenant_() });
    var d = trouverDisciple_(a.DiscipleId);
    if (d) recalculerSemaine_(d, texteSemaine_(a.Semaine), lireCriteres_(true));
  } finally { verrou.releaseLock(); }
  return getAbsencesEnAttente(token);
}

/* =====================================================================
 * Programmes optionnels
 * ===================================================================== */

function getProgrammes(token) {
  sessionAdmin_(token);
  var depuis = semaineId_(-4);
  return lire_(ONGLETS.PROGRAMMES).filter(function(p){ return p.Id && estVrai_(p.Actif); })
    .filter(function(p){ return String(p.Type) === 'fixe' || texteSemaine_(p.Semaine) >= depuis; })
    .map(function(p){
      return { id: String(p.Id), nom: String(p.Nom), type: String(p.Type), horaire: String(p.Horaire || ''),
               date: fmtDate_(p.Date).slice(0, 10), semaine: texteSemaine_(p.Semaine) };
    })
    .sort(function(a, b){ return (a.type === 'fixe' ? 0 : 1) - (b.type === 'fixe' ? 0 : 1) || (a.semaine < b.semaine ? -1 : 1); });
}

/** dateIso = 'aaaa-mm-jj' (le programme apparaît pour la semaine de cette date). */
function ajouterProgrammeOptionnel(token, nom, dateIso) {
  sessionAdmin_(token);
  nom = String(nom || '').trim();
  if (nom.length < 3) throw new Error('Donnez un nom au programme.');
  var m = String(dateIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Choisissez une date.');
  var date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  var semaine = lundiDe_(date);
  if (semaine < semaineId_(-1)) throw new Error('Choisissez une date à partir de la semaine dernière.');
  var ids = lire_(ONGLETS.PROGRAMMES).map(function(p){ return String(p.Id); });
  var base = 'opt_' + slugifier_(nom).replace(/-/g, '_').slice(0, 20) + '_' + semaine.replace(/-/g, '');
  var id = base, n = 2;
  while (ids.indexOf(id) !== -1) { id = base + '_' + n; n++; }
  ajouterLigne_(ONGLETS.PROGRAMMES, { Id: id, Nom: nom, Type: 'optionnel', Horaire: '',
    Date: Utilities.formatDate(date, tz_(), 'dd/MM/yyyy'), Semaine: "'" + semaine, Actif: true, Ordre: 50 });
  return getProgrammes(token);
}

/** Retire un programme optionnel (les présences déjà notées sont gardées dans Presences). */
function retirerProgramme(token, id) {
  sessionAdmin_(token);
  var p = lire_(ONGLETS.PROGRAMMES).filter(function(x){ return String(x.Id) === String(id); })[0];
  if (!p) throw new Error('Programme introuvable.');
  if (String(p.Type) === 'fixe') throw new Error('Les programmes fixes se modifient dans l\'onglet Programmes de la Google Sheet.');
  majLigne_(ONGLETS.PROGRAMMES, p._ligne, { Actif: false });
  return getProgrammes(token);
}

/* =====================================================================
 * Statut manuel et note
 * ===================================================================== */

function changerStatutManuel(token, id, nouveau, motif) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  if ((TRANSITIONS_MANUELLES[d.Statut] || []).indexOf(nouveau) === -1) {
    throw new Error('Passage de « ' + d.Statut + ' » à « ' + nouveau + ' » non autorisé.');
  }
  motif = String(motif || '').trim();
  if (nouveau === STATUTS.RETIRE && !motif) throw new Error('Indiquez le motif du retrait.');
  var ancien = d.Statut;
  if (ancien === STATUTS.ESSAI && nouveau === STATUTS.ACTIF) motif = motif || 'Confirmé Disciple à la fin de l\'essai';
  if (ancien === STATUTS.RETIRE && nouveau === STATUTS.ACTIF) motif = motif || 'Réintégration';
  changerStatut_(d, nouveau, 'Superviseur', motif);
  if (ancien === STATUTS.ESSAI && nouveau === STATUTS.ACTIF) majLigne_(ONGLETS.DISCIPLES, d._ligne, { DateConfirmation: maintenant_() });
  return getLeaderDetail(token, id, 0);
}

function setNoteSuperviseur(token, id, note) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  majLigne_(ONGLETS.DISCIPLES, d._ligne, { NoteSuperviseur: String(note || '').slice(0, 1000) });
  return true;
}

/* =====================================================================
 * Réglages et critères
 * ===================================================================== */

function getReglages(token) {
  sessionAdmin_(token);
  var r = reglages_();
  r.criteres = lireCriteres_(false).map(function(c){
    return { id: c.Id, label: c.Libelle, type: c.Type, elements: c.Elements, joursPrevus: c.JoursPrevus,
             poids: c.Poids, actif: c.Actif, ordre: c.Ordre };
  });
  r.programmes = getProgrammes(token);
  return r;
}

/** valeurs = { seuilActif, seuilCritique, semainesEssai, semainesZone } */
function setReglages(token, valeurs) {
  sessionAdmin_(token);
  var a = Math.round(Number(valeurs.seuilActif)), c = Math.round(Number(valeurs.seuilCritique));
  var e = Math.round(Number(valeurs.semainesEssai)), z = Math.round(Number(valeurs.semainesZone));
  if (!(a > 0 && a <= 100)) throw new Error('Le seuil « Disciple actif » doit être entre 1 et 100 %.');
  if (!(c >= 0 && c < a)) throw new Error('Le seuil critique doit être plus bas que le seuil « Disciple actif ».');
  if (!(e >= 1 && e <= 12)) throw new Error('La période d\'essai doit durer entre 1 et 12 semaines.');
  if (!(z >= 1 && z <= 8)) throw new Error('Le nombre de semaines avant changement de zone doit être entre 1 et 8.');
  ecrireReglage_('SeuilActif', a);
  ecrireReglage_('SeuilCritique', c);
  ecrireReglage_('SemainesEssai', e);
  ecrireReglage_('SemainesZone', z);
  return getReglages(token);
}

/** type = 'jour' (detail = jours prévus, ex. ['Lun','Mar']) ou 'semaine' (detail = noms des cases). */
function ajouterCritere(token, libelle, type, detail, poids) {
  sessionAdmin_(token);
  libelle = String(libelle || '').trim();
  if (libelle.length < 3) throw new Error('Donnez un nom au critère.');
  if (type !== 'jour' && type !== 'semaine') throw new Error('Choisissez « chaque jour » ou « chaque semaine ».');
  var p = Number(poids) || 1;
  if (!(p > 0 && p <= 10)) throw new Error('Le poids doit être entre 1 et 10.');
  var jours = '', elements = '';
  if (type === 'jour') {
    var liste = (detail || []).filter(function(j){ return JOURS.indexOf(j) !== -1; });
    if (!liste.length) throw new Error('Choisissez au moins un jour.');
    jours = JOURS.filter(function(j){ return liste.indexOf(j) !== -1; }).join(',');
  } else {
    var cases = (detail || []).map(function(x){ return String(x).trim(); }).filter(String);
    elements = (cases.length ? cases : [libelle]).join(';');
  }
  var existants = lireCriteres_(false);
  var base = slugifier_(libelle).replace(/-/g, '_').slice(0, 24), id = base, n = 2;
  var ids = existants.map(function(c){ return c.Id; });
  while (ids.indexOf(id) !== -1 || id === 'programmes') { id = base + '_' + n; n++; }
  var ordre = existants.reduce(function(m, c){ return Math.max(m, c.Ordre); }, 0) + 1;
  ajouterLigne_(ONGLETS.PARAMETRES, { Id: id, Libelle: libelle, Type: type, Elements: elements, JoursPrevus: jours,
    Poids: p, Actif: true, Ordre: ordre });
  assurerColonnesSuivi_(lireCriteres_(false));
  return getReglages(token);
}

/** champs : { label, poids, actif, joursPrevus } (tous facultatifs). Le type ne change pas. */
function modifierCritere(token, id, champs) {
  sessionAdmin_(token);
  var c = lireCriteres_(false).filter(function(x){ return x.Id === id; })[0];
  if (!c) throw new Error('Critère introuvable.');
  var maj = {};
  if (champs.label !== undefined) {
    if (String(champs.label).trim().length < 3) throw new Error('Donnez un nom au critère.');
    maj.Libelle = String(champs.label).trim();
  }
  if (champs.poids !== undefined) {
    var p = Number(champs.poids);
    if (!(p > 0 && p <= 10)) throw new Error('Le poids doit être entre 1 et 10.');
    maj.Poids = p;
  }
  if (champs.actif !== undefined) maj.Actif = !!champs.actif;
  if (champs.joursPrevus !== undefined) {
    if (c.Type !== 'jour') throw new Error('Seuls les critères quotidiens ont des jours prévus.');
    var liste = JOURS.filter(function(j){ return champs.joursPrevus.indexOf(j) !== -1; });
    if (!liste.length) throw new Error('Choisissez au moins un jour.');
    maj.JoursPrevus = liste.join(',');
  }
  majLigne_(ONGLETS.PARAMETRES, c._ligne, maj);
  return getReglages(token);
}

/* =====================================================================
 * Récap WhatsApp
 * ===================================================================== */

function generateRecap(token, offset) {
  var data = getAdminDashboard(token, offset);
  var pastille = { vert: '🟢', orange: '🟠', rouge: '🔴', aucune: '⚪', encours: '⏳' };
  var lignes = [];
  lignes.push('*Suivi des disciples – ' + data.label + (data.enCours ? ' (en cours, jour ' + data.joursEcoules + '/7)' : '') + '*');
  lignes.push('');
  lignes.push('📊 Moyenne' + (data.enCours ? ' jusqu\'ici' : '') + ' : *' + data.average + ' %*');
  if (!data.enCours) {
    lignes.push('🟢 ' + data.vert + ' (≥ ' + data.seuilActif + ' %)   🟠 ' + data.orange + '   🔴 ' + data.rouge + ' (< ' + data.seuilCritique + ' %)');
  }
  lignes.push('');
  var medailles = ['🥇', '🥈', '🥉'];
  data.rows.forEach(function(r, i) {
    var marque = i < 3 && r.percent > 0 ? medailles[i] : pastille[r.rempli ? r.zone : 'aucune'];
    lignes.push(marque + ' ' + r.name + ' : ' + (r.rempli ? r.percent + ' %' : 'non rempli') +
      (r.statut === STATUTS.ESSAI ? ' (essai)' : ''));
  });
  lignes.push('');
  lignes.push('« Ne nous lassons pas de faire le bien. » Galates 6:9');
  return lignes.join('\n');
}

var VERSETS_RECAP = [
  '« Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas. » Galates 6:9',
  '« Priez sans cesse. » 1 Thessaloniciens 5:17',
  '« Ta parole est une lampe à mes pieds, et une lumière sur mon sentier. » Psaume 119:105',
  '« Cherchez premièrement le royaume et la justice de Dieu. » Matthieu 6:33',
  '« Soyez fermes, inébranlables, travaillant de mieux en mieux à l\'œuvre du Seigneur. » 1 Corinthiens 15:58',
  '« Je puis tout par celui qui me fortifie. » Philippiens 4:13'
];

/** Récap à partager au groupe : aucun nom, seulement des chiffres collectifs et un verset. */
function generateRecapGroupe(token, offset) {
  var data = getAdminDashboard(token, offset);
  var notes = data.rows.filter(function(r){ return r.rempli; });
  var verset = VERSETS_RECAP[Math.abs(String(data.label).split('').reduce(function(a, c){ return a + c.charCodeAt(0); }, 0)) % VERSETS_RECAP.length];
  var lignes = [];
  lignes.push('*Notre semaine ensemble – ' + data.label + (data.enCours ? ' (en cours)' : '') + '*');
  lignes.push('');
  lignes.push('📊 Moyenne du groupe' + (data.enCours ? ' jusqu\'ici' : '') + ' : *' + data.average + ' %*');
  lignes.push('👥 ' + notes.length + ' disciple' + (notes.length > 1 ? 's ont' : ' a') + ' rempli son suivi');
  if (!data.enCours) {
    lignes.push('🟢 ' + data.vert + ' en zone verte (≥ ' + data.seuilActif + ' %)');
    lignes.push('🟠 ' + data.orange + ' en zone orange');
    lignes.push('🔴 ' + data.rouge + ' en zone rouge (< ' + data.seuilCritique + ' %)');
  }
  lignes.push('');
  lignes.push(verset);
  lignes.push('');
  lignes.push('Courage à chacun, on avance ensemble 🙏');
  return lignes.join('\n');
}
