/**
 * Discipolat : suivi des disciples
 * Fichier 3/4 : suivi rempli par le disciple, absences et calcul du score.
 *
 * Règles :
 *  - Le disciple remplit la semaine en cours et la précédente, tant que le
 *    superviseur ne les a pas validées. Il ne peut pas cocher un jour futur.
 *  - Chaque modification remet la semaine « À valider ».
 *  - Une case vide peut recevoir un motif d'absence. Tant que le superviseur
 *    ne l'a pas acceptée, elle compte comme « non fait ». Acceptée, elle est
 *    retirée du calcul.
 */

var SEMAINES_MAX_HISTORIQUE = 26;   // jusqu'où on peut remonter
var SEMAINES_MODIFIABLES = 2;       // semaine en cours + semaine précédente
var HEURE_CLOTURE = 20;             // la semaine est close le dimanche à partir de 20h
ABSENCE.ANNULEE = 'Annulée';

/* =====================================================================
 * Clôture de la semaine
 * ===================================================================== */

/**
 * Une semaine est close à partir du dimanche HEURE_CLOTURE h. Avant, le score est
 * une progression « en cours » ; niveau, zone et badges ne sont attribués qu'à la clôture.
 */
function semaineCloturee_(semaine) {
  var actuelle = semaineId_(0);
  if (semaine < actuelle) return true;
  if (semaine > actuelle) return false;
  var maintenant = new Date();
  var heure = Number(Utilities.formatDate(maintenant, tz_(), 'H'));
  return (maintenant.getDay() === 0) && heure >= HEURE_CLOTURE;
}

/** Ajoute une colonne à la fin d'un onglet si elle n'existe pas. */
function assurerColonneFin_(nomOnglet, nomColonne) {
  var sh = feuille_(nomOnglet);
  if (entetes_(sh).indexOf(nomColonne) !== -1) return;
  var col = sh.getLastColumn() + 1;
  sh.getRange(1, col).setValue(nomColonne).setFontWeight('bold').setBackground('#EDE4FF');
}

/**
 * Recalcule le score définitif des semaines closes dont le score enregistré était
 * encore « en cours » (colonne Cloture différente de TRUE). Appelé avant toute
 * lecture des scores (tableau de bord, historique, vérification du lundi).
 */
function cloturerSemaines_() {
  assurerColonneFin_(ONGLETS.SUIVI, 'Cloture');
  var aFaire = lire_(ONGLETS.SUIVI).filter(function(l){
    return l.Cle && !estVrai_(l.Cloture) && semaineCloturee_(semaineDe_(l));
  });
  if (!aFaire.length) return 0;
  var verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  try {
    var criteres = lireCriteres_(true);
    var disciples = {};
    lire_(ONGLETS.DISCIPLES).forEach(function(d){ disciples[String(d.Id)] = d; });
    aFaire.forEach(function(l){
      var d = disciples[String(l.DiscipleId)];
      if (d) recalculerSemaine_(d, semaineDe_(l), criteres);
    });
  } finally { verrou.releaseLock(); }
  return aFaire.length;
}

/* =====================================================================
 * Chargement des données d'une semaine
 * ===================================================================== */

/**
 * Programmes d'une semaine pour une église : fixes actifs de l'église
 * + optionnels de cette semaine (de l'église ou de toutes les églises).
 */
function programmesSemaine_(semaine, tous, eglise) {
  return (tous || lire_(ONGLETS.PROGRAMMES))
    .filter(function(p){
      if (!p.Id || !estVrai_(p.Actif)) return false;
      var e = egliseProgramme_(p);
      if (String(p.Type) === 'fixe') return e === eglise;
      return texteSemaine_(p.Semaine) === semaine && (!e || e === eglise);
    })
    .map(function(p){
      return { id: String(p.Id), nom: String(p.Nom), type: String(p.Type), horaire: String(p.Horaire || ''),
               date: fmtDate_(p.Date).slice(0, 10), ordre: Number(p.Ordre) || 99, jour: jourProgramme_(p) };
    })
    .sort(function(a, b){ return (a.type === 'fixe' ? 0 : 1) - (b.type === 'fixe' ? 0 : 1) || a.ordre - b.ordre; });
}

/** Jour du programme (0 = lundi) : date du programme optionnel, ou premier mot de l'horaire (« Mercredi 18h00 »). */
function jourProgramme_(p) {
  var d = parseDate_(p.Date);
  if (d) return (d.getDay() + 6) % 7;
  var noms = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  var mot = String(p.Horaire || '').trim().split(/\s+/)[0].toLowerCase();
  var i = noms.indexOf(mot);
  return i === -1 ? 6 : i;
}

/**
 * Tout ce qu'il faut pour afficher et noter une semaine.
 * `pre` peut contenir des onglets déjà lus (suivi, presences, absences, programmes)
 * pour éviter de relire la feuille quand on traite plusieurs disciples.
 */
function chargerSemaine_(d, semaine, pre) {
  pre = pre || {};
  var idDisciple = d.Id;
  var cle = semaine + '_' + idDisciple;
  var suivi = pre.suivi || lire_(ONGLETS.SUIVI);
  var ligne = null;
  for (var i = 0; i < suivi.length; i++) if (String(suivi[i].Cle) === cle) { ligne = suivi[i]; break; }

  var presences = {};
  (pre.presences || lire_(ONGLETS.PRESENCES)).forEach(function(p){
    if (semaineDe_(p) === semaine && String(p.DiscipleId) === String(idDisciple)) {
      presences[String(p.ProgrammeId)] = { present: estVrai_(p.Present), alHeure: estVrai_(p.AlHeure), _ligne: p._ligne };
    }
  });

  // La demande la plus récente pour un élément l'emporte
  var absences = {};
  (pre.absences || lire_(ONGLETS.ABSENCES)).forEach(function(a){
    if (texteSemaine_(a.Semaine) !== semaine || String(a.DiscipleId) !== String(idDisciple)) return;
    var k = String(a.Critere) + ':' + String(a.Element);
    if (String(a.Etat) === ABSENCE.ANNULEE) { delete absences[k]; return; }
    absences[k] = { id: String(a.Id), motif: String(a.Motif), precision: String(a.Precision || ''), etat: String(a.Etat), _ligne: a._ligne };
  });

  return { ligne: ligne, presences: presences, absences: absences,
           programmes: programmesSemaine_(semaine, pre.programmes, egliseDe_(d)),
           enCours: !semaineCloturee_(semaine), jour: (new Date().getDay() + 6) % 7 };
}

function excuse_(ctx, critere, element) {
  var a = ctx.absences[critere + ':' + element];
  return !!a && a.etat === ABSENCE.ACCEPTEE;
}

/* =====================================================================
 * Score
 * ===================================================================== */

/**
 * Taux de chaque critère, puis score = somme(taux × poids) / somme(poids).
 *  - jour        : jours cochés / (jours prévus − absences acceptées)
 *  - semaine     : cases cochées / cases
 *  - programmes  : programmes suivis / (programmes de la semaine − absences acceptées)
 *  - ponctualite : programmes à l'heure / programmes suivis
 * Un critère sans rien à compter (ex. aucun programme suivi pour la ponctualité)
 * est retiré du calcul.
 * Semaine en cours : ce qui n'est pas encore arrivé (jours à venir, programmes
 * d'aujourd'hui ou plus tard, cases hebdomadaires pas encore cochées) n'est pas
 * compté tant que ce n'est pas fait. Les semaines terminées comptent tout.
 */
function calculerScore_(ctx, criteres) {
  var l = ctx.ligne || {};
  var detail = [], total = 0, obtenu = 0;
  var pasEncore = function(jourIndex){ return ctx.enCours && jourIndex >= ctx.jour; };
  criteres.forEach(function(c) {
    var fait = 0, attendu = 0;
    if (c.Type === 'jour') {
      c.JoursPrevus.forEach(function(j){
        var ok = estVrai_(l[c.Id + '_' + j]);
        if (ok) { fait++; attendu++; }
        else if (!excuse_(ctx, c.Id, j) && !pasEncore(JOURS.indexOf(j))) attendu++;
      });
    } else if (c.Type === 'semaine') {
      c.Elements.forEach(function(e, i){
        var ok = estVrai_(l[c.Id + '_' + (i + 1)]);
        if (ok) { fait++; attendu++; } else if (!ctx.enCours) attendu++;
      });
    } else if (c.Type === 'programmes') {
      ctx.programmes.forEach(function(p){
        var pr = ctx.presences[p.id];
        if (pr && pr.present) { fait++; attendu++; }
        else if (!excuse_(ctx, 'programmes', p.id) && !pasEncore(p.jour)) attendu++;
      });
    } else if (c.Type === 'ponctualite') {
      ctx.programmes.forEach(function(p){
        var pr = ctx.presences[p.id];
        if (pr && pr.present) { attendu++; if (pr.alHeure) fait++; }
      });
    }
    var taux = attendu ? fait / attendu : null;
    detail.push({ id: c.Id, label: c.Libelle, type: c.Type, fait: fait, attendu: attendu,
                  taux: taux === null ? null : Math.round(taux * 100) });
    if (taux !== null) { obtenu += taux * c.Poids; total += c.Poids; }
  });
  return { score: total ? Math.round((obtenu / total) * 100) : 0, detail: detail };
}

function detailTexte_(detail) {
  return detail.filter(function(x){ return x.attendu; })
    .map(function(x){ return x.label.split(' (')[0] + ' ' + x.fait + '/' + x.attendu; }).join(' · ');
}

/**
 * Recalcule et enregistre le score d'une semaine (crée la ligne Suivi si besoin).
 * champsEnPlus : colonnes à écrire en même temps (ex. Validation).
 */
function recalculerSemaine_(d, semaine, criteres, champsEnPlus) {
  var ctx = chargerSemaine_(d, semaine);
  if (!ctx.ligne) ctx.ligne = creerLigneSemaine_(d, semaine, criteres);
  var res = calculerScore_(ctx, criteres);
  assurerColonneFin_(ONGLETS.SUIVI, 'Cloture');
  var champs = { Score: res.score, DetailScore: detailTexte_(res.detail), DerniereMaj: maintenant_(),
                 Cloture: !ctx.enCours };
  Object.keys(champsEnPlus || {}).forEach(function(k){ champs[k] = champsEnPlus[k]; });
  majLigne_(ONGLETS.SUIVI, ctx.ligne._ligne, champs);
  Object.keys(champs).forEach(function(k){ ctx.ligne[k] = champs[k]; });
  return ctx;
}

function creerLigneSemaine_(d, semaine, criteres) {
  assurerColonnesSuivi_(criteres);
  var obj = { Cle: semaine + '_' + d.Id, Semaine: "'" + semaine, DiscipleId: d.Id, Prenom: d.Prenom,
              Score: 0, Validation: VALIDATION.A_VALIDER, DerniereMaj: maintenant_() };
  criteres.forEach(function(c){ colonnesCritere_(c).forEach(function(col){ obj[col] = false; }); });
  var n = ajouterLigne_(ONGLETS.SUIVI, obj);
  obj._ligne = n;
  return obj;
}

/* =====================================================================
 * Série de jours consécutifs (Commande au matin)
 * ===================================================================== */

/**
 * Jours prévus consécutifs cochés, en remontant depuis aujourd'hui.
 * Aujourd'hui non coché ne casse pas la série (la journée n'est pas finie).
 * Un jour d'absence acceptée est sauté sans casser la série.
 */
function serieJours_(idDisciple, critere) {
  if (!critere) return 0;
  var parSemaine = {};
  lire_(ONGLETS.SUIVI).forEach(function(l){ if (String(l.DiscipleId) === String(idDisciple)) parSemaine[semaineDe_(l)] = l; });
  var absences = lire_(ONGLETS.ABSENCES);
  var serie = 0, jourAuj = (new Date().getDay() + 6) % 7;
  for (var o = 0; o > -SEMAINES_MAX_HISTORIQUE; o--) {
    var s = semaineId_(o), l = parSemaine[s] || {};
    var ctx = { absences: {} };
    absences.forEach(function(a){
      if (texteSemaine_(a.Semaine) === s && String(a.DiscipleId) === String(idDisciple) && String(a.Critere) === critere.Id) {
        ctx.absences[critere.Id + ':' + a.Element] = { etat: String(a.Etat) };
      }
    });
    for (var j = 6; j >= 0; j--) {
      if (o === 0 && j > jourAuj) continue;
      var jour = JOURS[j];
      if (critere.JoursPrevus.indexOf(jour) === -1) continue;
      if (estVrai_(l[critere.Id + '_' + jour])) { serie++; continue; }
      if (o === 0 && j === jourAuj) continue;
      if (excuse_(ctx, critere.Id, jour)) continue;
      return serie;
    }
  }
  return serie;
}

/* =====================================================================
 * Fonctions appelées par l'écran du disciple
 * ===================================================================== */

function getMyWeek(token, offset) {
  var d = sessionDisciple_(token, false);
  offset = Math.min(0, Math.max(-SEMAINES_MAX_HISTORIQUE, Number(offset) || 0));
  var criteres = lireCriteres_(true);
  var semaine = semaineId_(offset);
  var vue = construireVueSemaine_(d, semaine, offset, chargerSemaine_(d, semaine), criteres, true);
  vue.groupe = statsGroupe_();
  return vue;
}

var GROUPE_MINIMUM = 3; // en dessous, les statistiques collectives ne sont pas affichées (anonymat)

/**
 * Statistiques anonymes du groupe sur la dernière semaine close :
 * moyenne et nombre de disciples en zone verte. Aucun nom, aucun score individuel.
 */
function statsGroupe_() {
  cloturerSemaines_();
  var semaine = semaineCloturee_(semaineId_(0)) ? semaineId_(0) : semaineId_(-1);
  var suivis = {};
  lire_(ONGLETS.DISCIPLES).forEach(function(d){ if (STATUTS_SUIVIS.indexOf(d.Statut) !== -1) suivis[String(d.Id)] = true; });
  var scores = lire_(ONGLETS.SUIVI)
    .filter(function(l){ return semaineDe_(l) === semaine && suivis[String(l.DiscipleId)]; })
    .map(function(l){ return Number(l.Score) || 0; });
  var r = reglages_();
  if (scores.length < GROUPE_MINIMUM) return { disponible: false, semaine: semaineLibelle_(semaine), minimum: GROUPE_MINIMUM };
  return {
    disponible: true,
    semaine: semaineLibelle_(semaine),
    participants: scores.length,
    moyenne: Math.round(scores.reduce(function(a, b){ return a + b; }, 0) / scores.length),
    vert: scores.filter(function(s){ return s >= r.seuilActif; }).length,
    seuilActif: r.seuilActif
  };
}

/** Coche ou décoche un jour d'un critère quotidien. */
function setCritereJour(token, offset, idCritere, jour, valeur) {
  if (JOURS.indexOf(jour) === -1) throw new Error('Jour inconnu.');
  if (Number(offset) === 0 && JOURS.indexOf(jour) > (new Date().getDay() + 6) % 7) {
    throw new Error('Vous ne pouvez pas cocher un jour qui n\'est pas encore arrivé.');
  }
  return modifier_(token, offset, function(d, semaine, criteres, ligne) {
    var c = trouverCritere_(criteres, idCritere, 'jour');
    if (c.JoursPrevus.indexOf(jour) === -1) throw new Error('Ce jour n\'est pas prévu pour ce critère.');
    var champs = {}; champs[c.Id + '_' + jour] = !!valeur;
    majLigne_(ONGLETS.SUIVI, ligne._ligne, champs);
  });
}

/** Coche ou décoche une case d'un critère hebdomadaire (index à partir de 0). */
function setCritereSemaine(token, offset, idCritere, index, valeur) {
  return modifier_(token, offset, function(d, semaine, criteres, ligne) {
    var c = trouverCritere_(criteres, idCritere, 'semaine');
    var i = Number(index);
    if (!(i >= 0 && i < c.Elements.length)) throw new Error('Case inconnue.');
    var champs = {}; champs[c.Id + '_' + (i + 1)] = !!valeur;
    majLigne_(ONGLETS.SUIVI, ligne._ligne, champs);
  });
}

/** Présence à un programme et « à l'heure ». Décocher la présence efface « à l'heure ». */
function setPresence(token, offset, idProgramme, present, alHeure) {
  return modifier_(token, offset, function(d, semaine) {
    ecrirePresence_(d, semaine, idProgramme, !!present, !!present && !!alHeure);
  });
}

function ecrirePresence_(d, semaine, idProgramme, present, alHeure) {
  var prog = programmesSemaine_(semaine, null, egliseDe_(d)).filter(function(p){ return p.id === idProgramme; })[0];
  if (!prog) throw new Error('Ce programme n\'existe pas pour cette semaine.');
  if (present && semaine === semaineId_(0) && prog.jour > (new Date().getDay() + 6) % 7) {
    throw new Error('Ce programme n\'a pas encore eu lieu.');
  }
  var ctx = chargerSemaine_(d, semaine);
  var existant = ctx.presences[idProgramme];
  if (existant) {
    majLigne_(ONGLETS.PRESENCES, existant._ligne, { Present: present, AlHeure: alHeure, DerniereMaj: maintenant_() });
  } else {
    ajouterLigne_(ONGLETS.PRESENCES, { Cle: semaine + '_' + d.Id + '_' + idProgramme, Semaine: "'" + semaine,
      DiscipleId: d.Id, Prenom: d.Prenom, ProgrammeId: idProgramme, Present: present, AlHeure: alHeure, DerniereMaj: maintenant_() });
  }
}

/**
 * Motif d'absence pour une case vide.
 * idCritere = id d'un critère « jour » (element = 'Lun'…'Dim') ou 'programmes' (element = id du programme).
 */
function declarerAbsence(token, offset, idCritere, element, motif, precision) {
  if (MOTIFS_ABSENCE.indexOf(motif) === -1) throw new Error('Choisissez un motif : ' + MOTIFS_ABSENCE.join(', ') + '.');
  if (motif === 'Autre' && !String(precision || '').trim()) throw new Error('Précisez le motif.');
  return modifier_(token, offset, function(d, semaine, criteres) {
    var ctx = chargerSemaine_(d, semaine);
    var libelle = libelleElement_(criteres, ctx, idCritere, element);
    var a = ctx.absences[idCritere + ':' + element];
    if (a && a.etat === ABSENCE.ACCEPTEE) throw new Error('Cette absence a déjà été acceptée par le superviseur.');
    if (a) majLigne_(ONGLETS.ABSENCES, a._ligne, { Etat: ABSENCE.ANNULEE, DateDecision: maintenant_() });
    ajouterLigne_(ONGLETS.ABSENCES, {
      Id: Utilities.getUuid().slice(0, 8), DateDemande: maintenant_(), DiscipleId: d.Id, Prenom: d.Prenom,
      Semaine: "'" + semaine, Critere: idCritere, Element: element, Libelle: libelle,
      Motif: motif, Precision: String(precision || '').trim().slice(0, 200), Etat: ABSENCE.ATTENTE
    });
  });
}

/** Retire un motif encore en attente. */
function annulerAbsence(token, offset, idCritere, element) {
  return modifier_(token, offset, function(d, semaine) {
    var a = chargerSemaine_(d, semaine).absences[idCritere + ':' + element];
    if (!a) return;
    if (a.etat === ABSENCE.ACCEPTEE) throw new Error('Cette absence a déjà été acceptée : demandez au superviseur.');
    majLigne_(ONGLETS.ABSENCES, a._ligne, { Etat: ABSENCE.ANNULEE, DateDecision: maintenant_() });
  });
}

/**
 * Autres enseignements suivis et autres programmes de la semaine (texte libre).
 * Ils sont montrés au superviseur mais ne comptent pas dans le score.
 */
function setAutres(token, offset, enseignements, programmes) {
  return modifier_(token, offset, function(d, semaine, criteres, ligne) {
    assurerColonneFin_(ONGLETS.SUIVI, 'AutresEnseignements');
    assurerColonneFin_(ONGLETS.SUIVI, 'AutresProgrammes');
    majLigne_(ONGLETS.SUIVI, ligne._ligne, {
      AutresEnseignements: String(enseignements || '').trim().slice(0, 300),
      AutresProgrammes: String(programmes || '').trim().slice(0, 300)
    });
  });
}

/** Les 8 dernières semaines du disciple, pour son graphique. */
function getMyHistory(token) {
  var d = sessionDisciple_(token, false);
  cloturerSemaines_();
  return historiqueDisciple_(d.Id, 8);
}

/* =====================================================================
 * Modification commune : vérifications, verrou, recalcul du score
 * ===================================================================== */

function modifier_(token, offset, action) {
  var d = sessionDisciple_(token, false);
  offset = Number(offset) || 0;
  if (offset > 0 || offset <= -SEMAINES_MODIFIABLES) throw new Error('Cette semaine ne peut plus être modifiée.');
  var criteres = lireCriteres_(true);
  var semaine = semaineId_(offset);
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var ctx = chargerSemaine_(d, semaine);
    var ligne = ctx.ligne || creerLigneSemaine_(d, semaine, criteres);
    if (ligne.Validation === VALIDATION.VALIDE || ligne.Validation === VALIDATION.CORRIGE) {
      throw new Error('Le superviseur a déjà validé cette semaine. Elle ne peut plus être modifiée.');
    }
    action(d, semaine, criteres, ligne);
    var maj = recalculerSemaine_(d, semaine, criteres, { Validation: VALIDATION.A_VALIDER });
    return construireVueSemaine_(d, semaine, offset, maj, criteres, true);
  } finally {
    verrou.releaseLock();
  }
}

function trouverCritere_(criteres, id, type) {
  var c = criteres.filter(function(x){ return x.Id === id && (!type || x.Type === type); })[0];
  if (!c) throw new Error('Ce critère n\'existe plus. Rechargez la page.');
  return c;
}

function libelleElement_(criteres, ctx, idCritere, element) {
  if (idCritere === 'programmes') {
    var p = ctx.programmes.filter(function(x){ return x.id === element; })[0];
    if (!p) throw new Error('Programme inconnu pour cette semaine.');
    return p.nom + (p.date ? ' (' + p.date + ')' : '');
  }
  var c = trouverCritere_(criteres, idCritere, 'jour');
  var i = JOURS.indexOf(element);
  if (i === -1 || c.JoursPrevus.indexOf(element) === -1) throw new Error('Jour non prévu pour ce critère.');
  return c.Libelle + ' · ' + ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i];
}

/* =====================================================================
 * Données envoyées à l'écran
 * ===================================================================== */

function construireVueSemaine_(d, semaine, offset, ctx, criteres, avecSerie) {
  var r = reglages_();
  var l = ctx.ligne || {};
  var validee = l.Validation === VALIDATION.VALIDE || l.Validation === VALIDATION.CORRIGE;
  var calc = calculerScore_(ctx, criteres);
  var absence = function(crit, el){
    var a = ctx.absences[crit + ':' + el];
    return a ? { motif: a.motif, precision: a.precision, etat: a.etat } : null;
  };
  var vue = {
    weekId: semaine, label: semaineLibelle_(semaine), offsetWeeks: offset,
    canGoBack: offset > -SEMAINES_MAX_HISTORIQUE,
    editable: offset > -SEMAINES_MODIFIABLES && !validee,
    statut: d.Statut,
    seuilActif: r.seuilActif, seuilCritique: r.seuilCritique,
    jourCourant: offset === 0 ? (new Date().getDay() + 6) % 7 : 7,
    cloturee: !ctx.enCours,
    joursEcoules: ctx.enCours ? ctx.jour + 1 : 7,
    score: calc.score, detail: calc.detail,
    validation: ctx.ligne ? String(l.Validation) : VALIDATION.A_VALIDER,
    commentaire: String(l.CommentaireSuperviseur || ''),
    motifs: MOTIFS_ABSENCE,
    eglise: egliseDe_(d),
    autres: { enseignements: String(l.AutresEnseignements || ''), programmes: String(l.AutresProgrammes || '') },
    criteresJour: [], criteresSemaine: [], programmes: null, ponctualite: null, serie: null, essai: null
  };
  criteres.forEach(function(c) {
    if (c.Type === 'jour') {
      vue.criteresJour.push({ id: c.Id, label: c.Libelle,
        prevus: JOURS.map(function(j){ return c.JoursPrevus.indexOf(j) !== -1; }),
        jours: JOURS.map(function(j){ return estVrai_(l[c.Id + '_' + j]); }),
        absences: JOURS.map(function(j){ return absence(c.Id, j); }) });
    } else if (c.Type === 'semaine') {
      vue.criteresSemaine.push({ id: c.Id, label: c.Libelle,
        elements: c.Elements.map(function(e, i){ return { label: e, fait: estVrai_(l[c.Id + '_' + (i + 1)]) }; }) });
    } else if (c.Type === 'programmes') {
      vue.programmes = { label: c.Libelle, liste: ctx.programmes.map(function(p){
        var pr = ctx.presences[p.id] || {};
        return { id: p.id, nom: p.nom, horaire: p.horaire, type: p.type, date: p.date,
                 aVenir: offset === 0 && p.jour > (new Date().getDay() + 6) % 7,
                 present: !!pr.present, alHeure: !!pr.alHeure, absence: absence('programmes', p.id) };
      }) };
    } else if (c.Type === 'ponctualite') {
      vue.ponctualite = { label: c.Libelle };
    }
  });
  if (avecSerie) {
    var cam = criteres.filter(function(c){ return c.Id === 'commande_matin'; })[0];
    if (cam) vue.serie = { label: cam.Libelle, jours: serieJours_(d.Id, cam) };
  }
  if (d.Statut === STATUTS.ESSAI) {
    var sem = semainesEssai_(d);
    var idx = sem.indexOf(semaineId_(0));
    vue.essai = { total: sem.length, numero: idx === -1 ? (semaineId_(0) < sem[0] ? 0 : sem.length) : idx + 1,
                  fin: texteSemaine_(d.FinEssai) };
  }
  return vue;
}

function historiqueDisciple_(idDisciple, nbSemaines) {
  var parSemaine = {};
  lire_(ONGLETS.SUIVI).forEach(function(l){
    if (String(l.DiscipleId) === String(idDisciple)) parSemaine[semaineDe_(l)] = l;
  });
  var points = [];
  for (var o = -(nbSemaines - 1); o <= 0; o++) {
    var s = semaineId_(o), l = parSemaine[s];
    points.push({ weekId: s, label: s.slice(8, 10) + '/' + s.slice(5, 7), long: semaineLibelle_(s),
                  score: l ? Number(l.Score) || 0 : null, validation: l ? String(l.Validation) : null });
  }
  return points;
}
