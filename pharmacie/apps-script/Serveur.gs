/**
 * Pharmacie : serveur Google Apps Script.
 * Fichier 1/2 : le Google Sheet et la porte d'entrée de la page.
 * Fichier 2/2 : « Logique.gs » = copie EXACTE de pharmacie/logique.js.
 *
 * INSTALLATION (une seule fois) — voir aussi pharmacie/README.md :
 *  1. Créez un Google Sheet vide nommé « Pharmacie — Gestion ».
 *  2. Menu Extensions > Apps Script. Remplacez le contenu de « Code.gs » par ce fichier,
 *     puis ajoutez un fichier « Logique » et collez-y pharmacie/logique.js.
 *  3. Choisissez la fonction « installer » puis « Exécuter » (acceptez les autorisations).
 *  4. Déployer > Nouveau déploiement > Application Web :
 *       Exécuter en tant que : Moi      Qui a accès : Tout le monde
 *     Copiez l'adresse qui finit par /exec et mettez-la dans pharmacie/config.js.
 */

var FUSEAU = 'Africa/Douala';

function classeur_() {
  var actif = SpreadsheetApp.getActiveSpreadsheet();
  if (actif) return actif;
  var props = PropertiesService.getScriptProperties();
  var sid = props.getProperty('SHEET_ID');
  if (sid) return SpreadsheetApp.openById(sid);
  var nouveau = SpreadsheetApp.create('Pharmacie Jireh — Gestion');
  props.setProperty('SHEET_ID', nouveau.getId());
  return nouveau;
}

/* ---------- Le « magasin » : lit et écrit les onglets ---------- */
var cacheLecture_ = {};

function onglet_(nom) {
  var ss = classeur_();
  var sh = ss.getSheetByName(nom);
  var colonnes = PH_TABLES[nom];
  if (!sh) {
    sh = ss.insertSheet(nom);
    sh.getRange(1, 1, 1, colonnes.length).setValues([colonnes]).setFontWeight('bold').setBackground('#E3F4EC');
    sh.setFrozenRows(1);
    // tout en texte sauf les montants, pour que Google ne transforme pas les dates
    colonnes.forEach(function (c, i) {
      sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat(PH_NUMERIQUES.indexOf(c) !== -1 ? '#,##0' : '@');
    });
  }
  return sh;
}

function valeurTexte_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, FUSEAU, v.getHours() || v.getMinutes() ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  return v;
}

var magasin = {
  lire: function (table) {
    if (cacheLecture_[table]) return cacheLecture_[table].map(function (o) { return Object.assign({}, o); });
    var sh = onglet_(table), colonnes = PH_TABLES[table];
    var n = sh.getLastRow() - 1;
    var lignes = n > 0 ? sh.getRange(2, 1, n, colonnes.length).getValues() : [];
    var res = lignes.filter(function (l) { return l[0] !== ''; }).map(function (l) {
      var o = {};
      colonnes.forEach(function (c, i) {
        var v = valeurTexte_(l[i]);
        o[c] = PH_NUMERIQUES.indexOf(c) !== -1 ? (v === '' ? '' : Number(v)) : String(v);
      });
      return o;
    });
    cacheLecture_[table] = res;
    return res.map(function (o) { return Object.assign({}, o); });
  },
  ajouter: function (table, obj) {
    delete cacheLecture_[table];
    var colonnes = PH_TABLES[table];
    onglet_(table).appendRow(colonnes.map(function (c) { return obj[c] == null ? '' : obj[c]; }));
  },
  maj: function (table, cle, valeur, champs) {
    delete cacheLecture_[table];
    var sh = onglet_(table), colonnes = PH_TABLES[table];
    var ic = colonnes.indexOf(cle);
    var n = sh.getLastRow() - 1;
    if (n <= 0) return;
    var cles = sh.getRange(2, ic + 1, n, 1).getValues();
    for (var i = 0; i < cles.length; i++) {
      if (String(valeurTexte_(cles[i][0])) === String(valeur)) {
        var ligne = sh.getRange(i + 2, 1, 1, colonnes.length);
        var vals = ligne.getValues()[0];
        colonnes.forEach(function (c, k) { if (champs.hasOwnProperty(c)) vals[k] = champs[c] == null ? '' : champs[c]; });
        ligne.setValues([vals]);
        return;
      }
    }
  },
  suppr: function (table, cle, valeur) {
    delete cacheLecture_[table];
    var sh = onglet_(table), colonnes = PH_TABLES[table];
    var ic = colonnes.indexOf(cle);
    var n = sh.getLastRow() - 1;
    if (n <= 0) return;
    var cles = sh.getRange(2, ic + 1, n, 1).getValues();
    for (var i = cles.length - 1; i >= 0; i--) {
      if (String(valeurTexte_(cles[i][0])) === String(valeur)) sh.deleteRow(i + 2);
    }
  }
};

var outils = {
  maintenant: function (d) { return Utilities.formatDate(d || new Date(), FUSEAU, 'yyyy-MM-dd HH:mm'); },
  aujourdhui: function () { return Utilities.formatDate(new Date(), FUSEAU, 'yyyy-MM-dd'); },
  jeton: function () { return Utilities.getUuid().replace(/-/g, ''); }
};

function moteur_() { return creerPharmacie(magasin, outils); }

/* ---------- À lancer une fois depuis l'éditeur ---------- */
function installer() {
  var ss = classeur_();
  Object.keys(PH_TABLES).forEach(onglet_);
  var feuille1 = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (feuille1 && ss.getSheets().length > 1) ss.deleteSheet(feuille1);
  var msg = moteur_().installer();
  Logger.log(msg + '  Classeur : ' + ss.getUrl());
  return msg;
}

/* ---------- Porte d'entrée de la page ---------- */
function doGet() {
  return ContentService.createTextOutput('Serveur de la pharmacie : en marche (version ' + PH_VERSION + ').');
}

function doPost(e) {
  var reponse;
  var verrou = LockService.getScriptLock();
  try {
    var demande = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(demande.fn || '');
    if (PH_FONCTIONS.indexOf(fn) === -1) throw new Error('Action inconnue.');
    var args = Array.isArray(demande.args) ? demande.args : [];
    // une seule écriture à la fois (deux caissières qui valident en même temps)
    if (!verrou.tryLock(20000)) throw new Error('Le serveur est occupé. Réessayez dans un instant.');
    var api = moteur_().api;
    reponse = { ok: true, result: api[fn].apply(null, args) };
  } catch (err) {
    reponse = { ok: false, error: (err && err.message) || String(err) };
  } finally {
    try { verrou.releaseLock(); } catch (x) {}
  }
  return ContentService.createTextOutput(JSON.stringify(reponse)).setMimeType(ContentService.MimeType.JSON);
}
