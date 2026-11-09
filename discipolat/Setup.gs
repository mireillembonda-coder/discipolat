/**
 * Discipolat : suivi des disciples
 * Fichier 1/4 : installation, archivage et outils communs.
 *
 * À lancer UNE fois depuis l'éditeur : sélectionnez « installer » puis « Exécuter ».
 * La fonction peut être relancée sans risque : elle ne recrée que ce qui manque
 * et ne supprime jamais rien.
 */

var SHEET_ID = '1P6kgggbo2MYv_9yWq9-MYWEb9NDa2eqf-HJd3rWu9L4';

var ONGLETS = {
  DISCIPLES:   'Disciples',
  SUIVI:       'Suivi',
  PRESENCES:   'Presences',
  PROGRAMMES:  'Programmes',
  PARAMETRES:  'Parametres',
  REGLAGES:    'Reglages',
  ABSENCES:    'Absences',
  HISTORIQUE:  'Historique_Statuts',
  CORRECTIONS: 'Corrections'
};

// Anciens onglets des responsables -> nom d'archive
var ARCHIVES = [
  ['Responsables',    'Archive_Responsables'],
  ['Entrees',         'Archive_Entrees'],
  ['Entrees_archive', 'Archive_Entrees_ancien'],
  ['Parametres',      'Archive_Parametres']
];

var STATUTS = {
  CANDIDAT:    'Candidat',
  ESSAI:       "Période d'essai",
  ACTIF:       'Disciple actif',
  OBSERVATION: 'En observation',
  CRITIQUE:    'Zone critique',
  RETIRE:      'Retiré',
  NON_RETENU:  'Non retenu'
};
// Statuts qui remplissent un suivi
var STATUTS_SUIVIS = [STATUTS.ESSAI, STATUTS.ACTIF, STATUTS.OBSERVATION, STATUTS.CRITIQUE];
// Statuts soumis aux zones automatiques
var STATUTS_ZONES = [STATUTS.ACTIF, STATUTS.OBSERVATION, STATUTS.CRITIQUE];

var VALIDATION = { A_VALIDER: 'À valider', VALIDE: 'Validé', CORRIGE: 'Corrigé' };
var ABSENCE = { ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée' };
var MOTIFS_ABSENCE = ['Maladie', 'Travail', 'Voyage', 'Autre'];

var JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

var ENTETES = {};
ENTETES[ONGLETS.DISCIPLES] = ['Id','Prenom','Nom','Telephone','Statut','DateInscription','DateValidation','FinEssai',
  'DateConfirmation','DateDernierStatut','PinHash','PinSalt','Jeton','NoteSuperviseur'];
// Les colonnes des critères (ex. commande_matin_Lun, enseignements_1) sont ajoutées par assurerColonnesSuivi_
ENTETES[ONGLETS.SUIVI] = ['Cle','Semaine','DiscipleId','Prenom','Score','DetailScore','Validation','DateValidation',
  'CommentaireSuperviseur','DerniereMaj'];
ENTETES[ONGLETS.PRESENCES] = ['Cle','Semaine','DiscipleId','Prenom','ProgrammeId','Present','AlHeure','DerniereMaj'];
ENTETES[ONGLETS.PROGRAMMES] = ['Id','Nom','Type','Horaire','Date','Semaine','Actif','Ordre'];
ENTETES[ONGLETS.PARAMETRES] = ['Id','Libelle','Type','Elements','JoursPrevus','Poids','Actif','Ordre'];
ENTETES[ONGLETS.REGLAGES] = ['Cle','Valeur'];
ENTETES[ONGLETS.ABSENCES] = ['Id','DateDemande','DiscipleId','Prenom','Semaine','Critere','Element','Libelle',
  'Motif','Precision','Etat','DateDecision'];
ENTETES[ONGLETS.HISTORIQUE] = ['Date','DiscipleId','Prenom','AncienStatut','NouveauStatut','Origine','Motif'];
ENTETES[ONGLETS.CORRECTIONS] = ['Date','DiscipleId','Semaine','Critere','AncienneValeur','NouvelleValeur'];

/*
 * Types de critères :
 *  - jour        : une case par jour prévu (JoursPrevus, ex. « Lun,Mar,Mer,Jeu,Ven »)
 *  - semaine     : une case par élément (Elements séparés par « ; »)
 *  - programmes  : une case par programme de l'onglet Programmes (fixes + optionnels de la semaine)
 *  - ponctualite : calculé, programmes « à l'heure » ÷ programmes suivis
 */
var TOUS_JOURS = JOURS.join(',');
var CRITERES_DEPART = [
  ['commande_matin', 'Commande au matin', 'jour', '', 'Lun,Mar,Mer,Jeu,Ven', 1, true, 1],
  ['bible', 'Lecture-méditation de la Bible (30 min)', 'jour', '', TOUS_JOURS, 1, true, 2],
  ['priere', 'Prière personnelle', 'jour', '', TOUS_JOURS, 1, true, 3],
  ['enseignements', 'Enseignements des apôtres', 'semaine', 'Enseignement apôtre Yves;Enseignement apôtre Yvan', '', 1, true, 4],
  ['jeune', "Jeûne d'un jour", 'semaine', "Jeûne d'un jour dans la semaine", '', 1, true, 5],
  ['programmes', "Programmes de l'église", 'programmes', '', '', 1, true, 6],
  ['ponctualite', 'Ponctualité', 'ponctualite', '', '', 1, true, 7]
];
var PROGRAMMES_DEPART = [
  ['etude_biblique', 'Étude biblique', 'fixe', 'Mercredi 18h00', '', '', true, 1],
  ['adp',            'ADP',            'fixe', 'Vendredi 18h00', '', '', true, 2],
  ['culte_1',        'Culte 1',        'fixe', 'Dimanche 08h00', '', '', true, 3],
  ['culte_2',        'Culte 2',        'fixe', 'Dimanche 11h00', '', '', true, 4]
];
var REGLAGES_DEPART = [
  ['SeuilActif', 75],
  ['SeuilCritique', 50],
  ['SemainesEssai', 4],
  ['SemainesZone', 2]
];

/* =====================================================================
 * Installation
 * ===================================================================== */

/**
 * Bloque une fonction d'administration si elle est appelée depuis la page web.
 * Depuis l'éditeur Apps Script, l'utilisateur actif est la propriétaire du script ;
 * depuis l'application publique, il est vide ou différent.
 */
function reserveProprietaire_() {
  var actif = Session.getActiveUser().getEmail();
  var proprietaire = Session.getEffectiveUser().getEmail();
  if (!actif || actif !== proprietaire) {
    throw new Error('Cette fonction se lance uniquement depuis l\'éditeur Apps Script.');
  }
}

function installer() {
  reserveProprietaire_();
  var ss = getSs_();
  var journal = [];

  // 1. Récupérer le code du superviseur AVANT de renommer quoi que ce soit
  var adminPin = lireAncienPinSuperviseur_(ss);

  // 2. Archiver les onglets des responsables (renommage + protection, aucune suppression)
  ARCHIVES.forEach(function(paire) {
    var ancien = ss.getSheetByName(paire[0]);
    if (!ancien || ss.getSheetByName(paire[1])) return;
    // « Parametres » n'est archivé que s'il s'agit de l'ancien format (Activite / Norme)
    if (paire[0] === 'Parametres' && String(ancien.getRange(1, 1).getValue()) !== 'Activite') return;
    ancien.setName(paire[1]);
    ancien.setTabColor('#9E9E9E');
    ancien.protect().setDescription('Archive des responsables : lecture seule').setWarningOnly(true);
    journal.push('Archivé : ' + paire[0] + ' -> ' + paire[1]);
  });

  // 3. Créer les nouveaux onglets s'ils n'existent pas
  Object.keys(ENTETES).forEach(function(nom) {
    if (ss.getSheetByName(nom)) return;
    var sh = ss.insertSheet(nom);
    var ent = ENTETES[nom];
    sh.getRange(1, 1, 1, ent.length).setValues([ent]).setFontWeight('bold').setBackground('#EDE4FF');
    sh.setFrozenRows(1);
    sh.setTabColor('#6A2BD9');
    journal.push('Créé : ' + nom);
  });

  // 4. Données de départ
  remplirSiVide_(ONGLETS.PARAMETRES, CRITERES_DEPART, journal, 'Critères de départ ajoutés');
  remplirSiVide_(ONGLETS.PROGRAMMES, PROGRAMMES_DEPART, journal, 'Programmes fixes ajoutés');
  REGLAGES_DEPART.forEach(function(r){ definirReglageSiAbsent_(r[0], r[1]); });
  if (adminPin) {
    definirReglageSiAbsent_('AdminPinHash', adminPin.hash);
    definirReglageSiAbsent_('AdminPinSalt', adminPin.salt);
    journal.push('Code du superviseur conservé');
  } else {
    definirReglageSiAbsent_('AdminPinHash', '');
    definirReglageSiAbsent_('AdminPinSalt', '');
    journal.push('Aucun ancien code superviseur : le premier code saisi deviendra le code superviseur');
  }

  // 5. Colonnes des critères dans Suivi
  assurerColonnesSuivi_(lireCriteres_(false));

  Logger.log(journal.length ? journal.join('\n') : 'Rien à faire : tout est déjà installé.');
  return journal;
}

/** Secours : fixe un nouveau code superviseur. Remplacez 0000 puis exécutez. */
function definirCodeSuperviseur() {
  reserveProprietaire_();
  var NOUVEAU_CODE = '0000';
  if (!/^[0-9]{4}$/.test(NOUVEAU_CODE)) throw new Error('Le code doit contenir 4 chiffres.');
  var salt = Utilities.getUuid();
  ecrireReglage_('AdminPinSalt', salt);
  ecrireReglage_('AdminPinHash', hacherPin_(NOUVEAU_CODE, salt));
  ecrireReglage_('AdminJeton', '');
  Logger.log('Nouveau code superviseur enregistré.');
}

function lireAncienPinSuperviseur_(ss) {
  var sh = ss.getSheetByName('Responsables') || ss.getSheetByName('Archive_Responsables');
  if (!sh) return null;
  var lignes = lireLignes_(sh);
  for (var i = 0; i < lignes.length; i++) {
    if (String(lignes[i].Slug) === 'admin' && lignes[i].PinHash) {
      return { hash: String(lignes[i].PinHash), salt: String(lignes[i].PinSalt) };
    }
  }
  return null;
}

function remplirSiVide_(nom, lignes, journal, message) {
  var sh = feuille_(nom);
  if (sh.getLastRow() >= 2) return;
  sh.getRange(2, 1, lignes.length, lignes[0].length).setValues(lignes);
  journal.push(message + ' (' + lignes.length + ')');
}

/* =====================================================================
 * Critères et colonnes de l'onglet Suivi
 * ===================================================================== */

/** Critères triés par ordre. actifsSeulement = true pour ignorer ceux désactivés. */
function lireCriteres_(actifsSeulement) {
  return lire_(ONGLETS.PARAMETRES)
    .filter(function(c){ return c.Id && (!actifsSeulement || estVrai_(c.Actif)); })
    .map(function(c){
      var jours = String(c.JoursPrevus || '').split(',').map(function(j){ return j.trim(); })
        .filter(function(j){ return JOURS.indexOf(j) !== -1; });
      return {
        Id: String(c.Id), Libelle: String(c.Libelle), Type: String(c.Type),
        Elements: String(c.Elements || '').split(';').map(function(e){ return e.trim(); }).filter(String),
        JoursPrevus: jours.length ? jours : JOURS.slice(),
        Poids: Number(c.Poids) || 1, Actif: estVrai_(c.Actif), Ordre: Number(c.Ordre) || 99, _ligne: c._ligne
      };
    })
    .sort(function(a, b){ return a.Ordre - b.Ordre; });
}

/**
 * Colonnes d'un critère dans Suivi. Un critère « jour » a toujours 7 colonnes
 * (seuls les jours prévus comptent), un critère « semaine » une par élément.
 * Les programmes et la ponctualité sont dans l'onglet Presences.
 */
function colonnesCritere_(c) {
  if (c.Type === 'jour') return JOURS.map(function(j){ return c.Id + '_' + j; });
  if (c.Type === 'semaine') return c.Elements.map(function(e, i){ return c.Id + '_' + (i + 1); });
  return [];
}

/** Ajoute dans Suivi les colonnes manquantes, juste avant « Score ». */
function assurerColonnesSuivi_(criteres) {
  var sh = feuille_(ONGLETS.SUIVI);
  var ent = entetes_(sh);
  criteres.forEach(function(c) {
    colonnesCritere_(c).forEach(function(nom) {
      if (ent.indexOf(nom) !== -1) return;
      var pos = ent.indexOf('Score') + 1;
      sh.insertColumnBefore(pos);
      sh.getRange(1, pos).setValue(nom).setFontWeight('bold').setBackground('#EDE4FF');
      ent = entetes_(sh);
    });
  });
}

/* =====================================================================
 * Outils communs : feuilles, lignes, réglages
 * ===================================================================== */

// Gardés en mémoire le temps d'un appel (Apps Script repart de zéro à chaque appel),
// pour n'ouvrir la feuille qu'une fois au lieu d'une vingtaine.
var ss_ = null;
var feuilles_ = {};

function getSs_() { return ss_ || (ss_ = SpreadsheetApp.openById(SHEET_ID)); }

function feuille_(nom) {
  if (feuilles_[nom]) return feuilles_[nom];
  var sh = getSs_().getSheetByName(nom);
  if (!sh) throw new Error("L'onglet « " + nom + " » est introuvable. Lancez d'abord la fonction installer.");
  return (feuilles_[nom] = sh);
}

/** Lit un onglet en tableau d'objets { colonne: valeur, _ligne: n° de ligne }. */
function lireLignes_(sh) {
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var ent = data[0], out = [];
  for (var r = 1; r < data.length; r++) {
    var o = { _ligne: r + 1 };
    for (var c = 0; c < ent.length; c++) o[ent[c]] = data[r][c];
    out.push(o);
  }
  return out;
}

function lire_(nom) { return lireLignes_(feuille_(nom)); }

function entetes_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]; }

/** Ajoute une ligne à partir d'un objet (les colonnes absentes restent vides). */
function ajouterLigne_(nom, obj) {
  var sh = feuille_(nom);
  var ent = entetes_(sh);
  sh.appendRow(ent.map(function(h){ return obj.hasOwnProperty(h) ? obj[h] : ''; }));
  return sh.getLastRow();
}

/** Met à jour certaines colonnes d'une ligne existante. */
function majLigne_(nom, numLigne, champs) {
  var sh = feuille_(nom);
  var ent = entetes_(sh);
  Object.keys(champs).forEach(function(k) {
    var c = ent.indexOf(k);
    if (c === -1) throw new Error('Colonne inconnue « ' + k + ' » dans ' + nom);
    sh.getRange(numLigne, c + 1).setValue(champs[k]);
  });
}

function lireReglage_(cle, defaut) {
  var lignes = lire_(ONGLETS.REGLAGES);
  for (var i = 0; i < lignes.length; i++) if (String(lignes[i].Cle) === cle) return lignes[i].Valeur;
  return defaut;
}

function ecrireReglage_(cle, valeur) {
  var lignes = lire_(ONGLETS.REGLAGES);
  for (var i = 0; i < lignes.length; i++) {
    if (String(lignes[i].Cle) === cle) { majLigne_(ONGLETS.REGLAGES, lignes[i]._ligne, { Valeur: valeur }); return; }
  }
  ajouterLigne_(ONGLETS.REGLAGES, { Cle: cle, Valeur: valeur });
}

function definirReglageSiAbsent_(cle, valeur) {
  if (lireReglage_(cle, null) === null) ecrireReglage_(cle, valeur);
}

/** Tous les réglages chiffrés, avec leurs valeurs par défaut. */
function reglages_() {
  // Une seule lecture de l'onglet Reglages pour les quatre valeurs
  var v = {};
  lire_(ONGLETS.REGLAGES).forEach(function(l){ if (!v.hasOwnProperty(String(l.Cle))) v[String(l.Cle)] = l.Valeur; });
  return {
    seuilActif:    Number(v.SeuilActif) || 75,
    seuilCritique: Number(v.SeuilCritique) || 50,
    semainesEssai: Number(v.SemainesEssai) || 4,
    semainesZone:  Number(v.SemainesZone) || 2
  };
}

/* =====================================================================
 * Outils communs : dates
 * ===================================================================== */

function tz_() { return Session.getScriptTimeZone() || 'Europe/Paris'; }

function maintenant_() { return Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm:ss'); }

/** Lundi de la semaine (décalée de `decalage` semaines), au format aaaa-MM-jj. */
function semaineId_(decalage) {
  var d = new Date();
  d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7 * (decalage || 0));
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

/** Décale un identifiant de semaine de n semaines. */
function decalerSemaine_(id, n) {
  var p = String(id).split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 7 * n, 12);
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

function semaineLibelle_(id) {
  var p = String(id).split('-');
  var lundi = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
  var dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
  var f = function(d){ return Utilities.formatDate(d, tz_(), 'dd/MM'); };
  return 'Semaine du ' + f(lundi) + ' au ' + f(dimanche);
}

/** Lit une date écrite « jj/mm/aaaa … » ou un objet Date (Sheets convertit parfois). */
function parseDate_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v;
  var m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12) : null;
}

/** Lundi de la semaine d'une date, au format aaaa-MM-jj (null si pas de date). */
function lundiDe_(date) {
  if (!date) return null;
  var d = new Date(date);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

/** Identifiant de semaine stocké en texte ou converti en date par Sheets. */
function texteSemaine_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return String(v).replace(/^'/, '');
}

/** Semaine d'une ligne de Suivi ou Presences, lue dans la clé. */
function semaineDe_(ligne) { return String(ligne.Cle).split('_')[0]; }

/** Affiche une date (texte ou objet Date) en jj/mm/aaaa hh:mm. */
function fmtDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'dd/MM/yyyy HH:mm');
  return String(v).slice(0, 16);
}

/* =====================================================================
 * Outils communs : divers
 * ===================================================================== */

function estVrai_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function slugifier_(texte) {
  return String(texte).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'disciple';
}

function hex_(octets) {
  return octets.map(function(b){ return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** SHA-256 hexadécimal de sel + code. */
function hacherPin_(pin, salt) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + String(pin), Utilities.Charset.UTF_8));
}

/** Vérifie un code. Accepte aussi l'ordre code + sel, utilisé par certaines anciennes versions. */
function verifierPin_(pin, salt, hash) {
  if (!hash) return false;
  var h = String(hash).toLowerCase();
  if (hacherPin_(pin, salt) === h) return true;
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin) + String(salt), Utilities.Charset.UTF_8)) === h;
}
