/**
 * Pharmacie : gestion de caisse, sorties et demandes du personnel.
 * LOGIQUE COMMUNE : ce même fichier sert
 *   - au serveur Google Apps Script (copié tel quel sous le nom « Logique.gs ») ;
 *   - au mode démo du navigateur (chargé par index.html).
 * Il ne dépend ni de Google ni du navigateur : il reçoit un « magasin » (store)
 * qui sait lire et écrire les tableaux, et ne fait que les règles et les calculs.
 *
 * Pour changer une liste (catégories de sorties, modes de paiement…), c'est ici.
 */

var PH_VERSION = '1.3';

/* ------------------------------------------------------------------ */
/* Rôles et droits                                                     */
/* ------------------------------------------------------------------ */
var PH_ROLES = {
  admin: {
    nom: 'Gérant(e)',
    droits: ['recettes', 'mouvements', 'fournisseurs', 'journee', 'bilan', 'valider', 'equipe', 'journal', 'demandes',
      'verser', 'tresorerie', 'banque'],
    comptesVus: ['caisse', 'principale', 'om', 'momo', 'gerante', 'banque'],
    comptesSortie: ['caisse', 'principale', 'om', 'momo', 'gerante', 'banque']
  },
  principale: {
    nom: 'Caissière principale',
    droits: ['recettes', 'mouvements', 'fournisseurs', 'journee', 'demandes', 'verser', 'tresorerie'],
    comptesVus: ['caisse', 'principale', 'om', 'momo'],
    comptesSortie: ['caisse', 'principale', 'om', 'momo', 'banque']
  },
  caissiere: {
    nom: 'Caissière',
    droits: ['recettes', 'mouvements', 'journee', 'demandes', 'verser'],
    comptesVus: ['caisse'],
    comptesSortie: ['caisse']
  },
  employe: {
    nom: 'Employé(e)',
    droits: ['demandes'],
    comptesVus: [],
    comptesSortie: []
  }
};

/*
 * Les « comptes » : chaque endroit où se trouve l'argent de la pharmacie.
 * mode = comment on paie quand une sortie part de ce compte.
 */
var PH_COMPTES = [
  { cle: 'caisse',     nom: 'Caisse (tiroir)',          court: 'Caisse',            mode: 'Espèces' },
  { cle: 'principale', nom: 'Caissière principale',     court: 'Caisse principale', mode: 'Espèces' },
  { cle: 'om',         nom: 'Orange Money',             court: 'Orange Money',      mode: 'Mobile Money' },
  { cle: 'momo',       nom: 'MTN MoMo',                 court: 'MTN MoMo',          mode: 'Mobile Money' },
  { cle: 'gerante',    nom: 'Espèces chez la gérante',  court: 'Gérante',           mode: 'Espèces' },
  { cle: 'banque',     nom: 'Banque',                   court: 'Banque',            mode: 'Chèque' }
];

var PH_SESSIONS_CAISSE = ['Matin', 'Soir'];

// Colonnes d'encaissement d'une caisse (dans l'ordre d'affichage) et le compte qu'elles alimentent
var PH_ENCAISSEMENTS = [
  { cle: 'especes',     nom: 'Espèces',        compte: 'caisse' },
  { cle: 'orangeMoney', nom: 'Orange Money',   compte: 'om' },
  { cle: 'mtnMomo',     nom: 'MTN MoMo',       compte: 'momo' },
  { cle: 'cheque',      nom: 'Chèques',        compte: 'banque' },
  { cle: 'credit',      nom: 'Crédit clients' }   // vendu mais pas encore payé : n'entre dans aucun compte
];

// Sorties (dépenses). Les mouvements d'argent entre comptes (versements, dépôts en banque,
// retraits Orange Money…) ne sont PAS des sorties : ce sont des transferts (onglet Comptes).
var PH_CATEGORIES_SORTIE = [
  { nom: 'Fournisseur (achats)', fournisseur: true },
  { nom: 'Électricité (ENEO)' },
  { nom: 'Eau (CAMWATER)' },
  { nom: 'Internet / téléphone' },
  { nom: 'Loyer' },
  { nom: 'Salaires' },
  { nom: 'Avance sur salaire' },
  { nom: 'CNPS / charges sociales' },
  { nom: 'Impôts et taxes' },
  { nom: 'Comptable' },
  { nom: 'Sécurité / gardiennage' },
  { nom: 'Transport / courses' },
  { nom: 'Entretien / ménage' },
  { nom: 'Fournitures de bureau' },
  { nom: 'Réparations / maintenance' },
  { nom: 'Frais bancaires' },
  { nom: 'Autre sortie' }
];
var PH_CATEGORIE_FRAIS = 'Frais de retrait / transfert';

var PH_CATEGORIES_ENTREE = [
  { nom: 'Fond de caisse' },
  { nom: 'Règlement crédit client' },
  { nom: 'Apport du gérant' },
  { nom: 'Autre entrée' }
];

var PH_MODES = ['Espèces', 'Chèque', 'Virement', 'Mobile Money', 'Autre'];

var PH_TYPES_DEMANDE = ['Permission', 'Congé', 'Absence maladie', 'Remplacement', 'Échange de poste'];
var PH_CRENEAUX = ['Journée entière', 'Matin', 'Soir', 'Garde de nuit', 'Quelques heures'];

var PH_STATUTS = {
  REMPLACANT: 'En attente du remplaçant',
  ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée'
};

var PH_T = { ATTENTE: 'En attente', CONFIRME: 'Confirmé', REFUSE: 'Refusé', ANNULE: 'Annulé' };

/* ------------------------------------------------------------------ */
/* Tableaux (onglets du Google Sheet) et leurs colonnes                */
/* ------------------------------------------------------------------ */
var PH_TABLES = {
  Utilisateurs: ['id', 'nom', 'role', 'pinHash', 'pinAChanger', 'actif', 'essais', 'bloqueJusqua', 'creeLe'],
  Sessions:     ['jeton', 'userId', 'expire'],
  Recettes:     ['id', 'date', 'session', 'especes', 'orangeMoney', 'mtnMomo', 'carte', 'cheque', 'assurance', 'credit',
                 'total', 'logiciel', 'ecart', 'observation', 'saisiParId', 'saisiPar', 'saisiLe', 'modifiePar', 'modifieLe',
                 // especesComptees = ce qui reste dans le tiroir ; sortiesCaisse = payé avec l'argent de cette caisse ;
                 // especes = especesComptees + sortiesCaisse (les vraies ventes en espèces) ; annules = tickets annulés
                 'especesComptees', 'sortiesCaisse', 'annules'],
  Mouvements:   ['id', 'date', 'sens', 'categorie', 'fournisseurId', 'fournisseur', 'reference', 'libelle', 'montant', 'mode',
                 'saisiParId', 'saisiPar', 'saisiLe', 'modifiePar', 'modifieLe', 'compte', 'rapproche', 'rapprocheLe', 'session'],
  // argent qui passe d'un compte à un autre (versements, retraits Orange Money, dépôts en banque…)
  Transferts:   ['id', 'date', 'de', 'vers', 'montant', 'frais', 'montantRecu', 'ecart', 'reference', 'note', 'statut',
                 'saisiParId', 'saisiPar', 'saisiLe', 'confirmePar', 'confirmeLe', 'rapproche', 'rapprocheLe'],
  // soldes de départ et contrôles (recoupages) : solde réel constaté contre solde calculé
  Soldes:       ['id', 'date', 'compte', 'type', 'montant', 'calcule', 'ecart', 'note', 'saisiPar', 'saisiLe'],
  Fournisseurs: ['id', 'nom', 'principal', 'telephone', 'contact', 'notes', 'actif'],
  Demandes:     ['id', 'userId', 'demandeur', 'type', 'du', 'au', 'creneau', 'heures', 'motif', 'remplacantId', 'remplacant',
                 'statut', 'reponseRemplacant', 'valideur', 'commentaire', 'creeLe', 'traiteLe'],
  Parametres:   ['cle', 'valeur'],
  Journal:      ['quand', 'qui', 'action', 'details']
};
// Colonnes qui contiennent des nombres (les autres sont du texte)
var PH_NUMERIQUES = ['especes', 'orangeMoney', 'mtnMomo', 'carte', 'cheque', 'assurance', 'credit', 'total', 'logiciel',
  'ecart', 'montant', 'essais', 'frais', 'montantRecu', 'calcule', 'especesComptees', 'sortiesCaisse', 'annules'];

var PH_PROFILS_DEPART = [
  ['Gérant(e)', 'admin'],
  ['Caissière principale', 'principale'],
  ['Caissière', 'caissiere'],
  ['Employé 4', 'employe'], ['Employé 5', 'employe'], ['Employé 6', 'employe'], ['Employé 7', 'employe'],
  ['Employé 8', 'employe'], ['Employé 9', 'employe'], ['Employé 10', 'employe']
];
var PH_PIN_DEPART = '0000';

/* ------------------------------------------------------------------ */
/* SHA-256 (pour ne jamais garder les codes en clair)                  */
/* ------------------------------------------------------------------ */
function phSha256(texte) {
  var s = unescape(encodeURIComponent(String(texte)));
  var K = [], H = [], i, j, n = 0, c = 2;
  function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
  while (n < 64) {
    for (j = 2; j * j <= c; j++) if (c % j === 0) break;
    if (j * j > c) { if (n < 8) H[n] = frac(Math.pow(c, 1 / 2)); K[n++] = frac(Math.pow(c, 1 / 3)); }
    c++;
  }
  var bytes = [];
  for (i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  var bits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);
  function rot(v, r) { return (v >>> r) | (v << (32 - r)); }
  for (var o = 0; o < bytes.length; o += 64) {
    var w = [];
    for (i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (i = 16; i < 64; i++) {
      var s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      var s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], cc = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      var t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      var t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
}

/* ------------------------------------------------------------------ */
/* Le moteur                                                           */
/* ------------------------------------------------------------------ */
/**
 * @param store  { lire(table) -> [obj], ajouter(table, obj), maj(table, cle, valeur, champs), suppr(table, cle, valeur) }
 * @param outils { maintenant() -> 'AAAA-MM-JJ HH:MM', aujourdhui() -> 'AAAA-MM-JJ', jeton() -> texte aléatoire }
 */
function creerPharmacie(store, outils) {
  var DUREE_SESSION_JOURS = 30;

  /* ---------- petits outils ---------- */
  function erreur(msg) { throw new Error(msg); }
  function txt(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function oui(v) { return v === true || v === 'oui' || v === 'TRUE' || v === 'true'; }
  function montant(v, nom) {
    if (v === '' || v == null) return 0;
    var n = Number(String(v).replace(/[\s  ]/g, '').replace(',', '.'));
    if (!isFinite(n) || n < 0) erreur('Montant invalide' + (nom ? ' (' + nom + ')' : '') + '.');
    return Math.round(n);
  }
  function date(v, nom) {
    var d = txt(v, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) erreur((nom || 'Date') + ' invalide.');
    return d;
  }
  function id(prefixe) { return prefixe + outils.jeton().replace(/[^a-z0-9]/gi, '').slice(0, 10); }
  function hashPin(userId, pin) { return phSha256('pharmacie|' + userId + '|' + pin); }
  function journaliser(user, action, details) {
    store.ajouter('Journal', { quand: outils.maintenant(), qui: user ? user.nom : '—', action: action, details: txt(details, 500) });
  }
  function joursEntre(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function ajouterJours(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function parametre(cle, defaut) {
    var p = store.lire('Parametres').filter(function (x) { return x.cle === cle; })[0];
    return p && p.valeur !== '' ? p.valeur : defaut;
  }

  /* ---------- utilisateurs et sessions ---------- */
  function utilisateurs() { return store.lire('Utilisateurs'); }
  function trouverUser(uid) { return utilisateurs().filter(function (u) { return u.id === uid; })[0]; }
  function droits(user) { return (PH_ROLES[user.role] || PH_ROLES.employe).droits; }
  function peut(user, droit) { return droits(user).indexOf(droit) !== -1; }
  function exiger(user, droit) { if (!peut(user, droit)) erreur("Vous n'avez pas le droit de faire cela."); }
  function publicUser(u) {
    return { id: u.id, nom: u.nom, role: u.role, roleNom: (PH_ROLES[u.role] || {}).nom || u.role, actif: oui(u.actif) };
  }
  function session(jeton) {
    var j = txt(jeton, 100);
    if (!j) erreur('Session expirée. Reconnectez-vous.');
    var s = store.lire('Sessions').filter(function (x) { return x.jeton === j; })[0];
    if (!s || s.expire < outils.aujourdhui()) erreur('Session expirée. Reconnectez-vous.');
    var u = trouverUser(s.userId);
    if (!u || !oui(u.actif)) erreur('Session expirée. Reconnectez-vous.');
    return u;
  }

  function installer() {
    if (utilisateurs().length) return 'Déjà installé : rien à faire.';
    PH_PROFILS_DEPART.forEach(function (p, i) {
      var uid = 'u' + (i + 1);
      store.ajouter('Utilisateurs', { id: uid, nom: p[0], role: p[1], pinHash: hashPin(uid, PH_PIN_DEPART), pinAChanger: 'oui',
        actif: 'oui', essais: 0, bloqueJusqua: '', creeLe: outils.maintenant() });
    });
    store.ajouter('Parametres', { cle: 'nomPharmacie', valeur: 'Pharmacie Jireh' });
    journaliser(null, 'Installation', PH_PROFILS_DEPART.length + ' profils créés (code de départ ' + PH_PIN_DEPART + ')');
    return 'Installation terminée : ' + PH_PROFILS_DEPART.length + ' profils créés.';
  }

  /* ================================================================== */
  /* Fonctions appelables par la page                                    */
  /* ================================================================== */
  var api = {};

  api.profils = function () {
    return {
      nomPharmacie: parametre('nomPharmacie', 'Pharmacie Jireh'),
      profils: utilisateurs().filter(function (u) { return oui(u.actif); }).map(publicUser)
    };
  };

  api.connexion = function (userId, pin) {
    var u = trouverUser(txt(userId, 40));
    if (!u || !oui(u.actif)) erreur('Profil introuvable.');
    var now = outils.maintenant();
    if (u.bloqueJusqua && u.bloqueJusqua > now) erreur('Trop d\'essais. Réessayez après ' + u.bloqueJusqua.slice(11) + '.');
    if (hashPin(u.id, txt(pin, 12)) !== u.pinHash) {
      var essais = Number(u.essais || 0) + 1;
      var champs = { essais: essais };
      if (essais >= 5) {
        var t = new Date(Date.now() + 5 * 60000);
        champs = { essais: 0, bloqueJusqua: outils.maintenant(t) };
        store.maj('Utilisateurs', 'id', u.id, champs);
        erreur('Code incorrect 5 fois. Profil bloqué 5 minutes.');
      }
      store.maj('Utilisateurs', 'id', u.id, champs);
      erreur('Code incorrect (' + essais + '/5).');
    }
    store.maj('Utilisateurs', 'id', u.id, { essais: 0, bloqueJusqua: '' });
    var jeton = outils.jeton() + outils.jeton();
    var aujourdhui = outils.aujourdhui();
    // ménage des sessions expirées
    store.lire('Sessions').forEach(function (s) { if (s.expire < aujourdhui) store.suppr('Sessions', 'jeton', s.jeton); });
    store.ajouter('Sessions', { jeton: jeton, userId: u.id, expire: ajouterJours(aujourdhui, DUREE_SESSION_JOURS) });
    journaliser(u, 'Connexion', '');
    return { jeton: jeton, user: publicUser(u), pinAChanger: oui(u.pinAChanger) };
  };

  api.deconnexion = function (jeton) {
    try { store.suppr('Sessions', 'jeton', txt(jeton, 100)); } catch (e) {}
    return true;
  };

  api.changerPin = function (jeton, ancien, nouveau) {
    var u = session(jeton);
    if (hashPin(u.id, txt(ancien, 12)) !== u.pinHash) erreur('Ancien code incorrect.');
    var n = txt(nouveau, 12);
    if (!/^\d{4}$/.test(n)) erreur('Le nouveau code doit faire 4 chiffres.');
    if (n === PH_PIN_DEPART || /^(\d)\1+$/.test(n) || '0123456789'.indexOf(n) !== -1) erreur('Code trop facile. Choisissez-en un autre.');
    store.maj('Utilisateurs', 'id', u.id, { pinHash: hashPin(u.id, n), pinAChanger: 'non' });
    journaliser(u, 'Changement de code', '');
    return true;
  };

  /* ---------- Chargement de l'application (selon le rôle) ---------- */
  api.charger = function (jeton) {
    var u = session(jeton);
    var aujourdhui = outils.aujourdhui();
    var equipe = utilisateurs().filter(function (x) { return oui(x.actif); }).map(publicUser);
    var demandes = store.lire('Demandes');
    var res = {
      version: PH_VERSION,
      aujourdhui: aujourdhui,
      nomPharmacie: parametre('nomPharmacie', 'Pharmacie Jireh'),
      user: publicUser(u),
      pinAChanger: oui(u.pinAChanger),
      droits: droits(u),
      listes: {
        sessions: PH_SESSIONS_CAISSE, encaissements: PH_ENCAISSEMENTS, sorties: PH_CATEGORIES_SORTIE,
        entrees: PH_CATEGORIES_ENTREE, modes: PH_MODES, typesDemande: PH_TYPES_DEMANDE, creneaux: PH_CRENEAUX,
        comptes: PH_COMPTES, comptesVus: role(u).comptesVus, comptesSortie: role(u).comptesSortie,
        roles: Object.keys(PH_ROLES).map(function (k) { return { cle: k, nom: PH_ROLES[k].nom }; })
      },
      equipe: equipe,
      mesDemandes: demandes.filter(function (d) { return d.userId === u.id; }).sort(parDateCreation).slice(0, 30),
      aRemplacer: demandes.filter(function (d) { return d.remplacantId === u.id && d.statut === PH_STATUTS.REMPLACANT; }),
      absences: demandes.filter(function (d) { return d.statut === PH_STATUTS.ACCEPTEE && d.au >= aujourdhui && joursEntre(aujourdhui, d.du) <= 30; })
        .sort(function (a, b) { return a.du < b.du ? -1 : 1; })
    };
    if (peut(u, 'valider')) res.aValider = demandes.filter(function (d) { return d.statut === PH_STATUTS.ATTENTE || d.statut === PH_STATUTS.REMPLACANT; }).sort(parDateCreation);
    if (peut(u, 'mouvements') || peut(u, 'fournisseurs')) res.fournisseurs = listeFournisseurs(peut(u, 'fournisseurs'));
    if (peut(u, 'verser')) res.aConfirmer = store.lire('Transferts').filter(function (t) { return t.statut === PH_T.ATTENTE && peutConfirmer(u, t); });
    return res;
  };
  function parDateCreation(a, b) { return a.creeLe < b.creeLe ? 1 : -1; }

  /* ---------- Journée de caisse ---------- */
  api.journee = function (jeton, jour) {
    var u = session(jeton);
    var d = date(jour || outils.aujourdhui());
    var aujourdhui = outils.aujourdhui();
    if (!peut(u, 'recettes') && !peut(u, 'journee')) erreur("Vous n'avez pas le droit de faire cela.");
    var recettes = store.lire('Recettes').filter(function (r) { return r.date === d; });
    var voitTout = peut(u, 'journee');
    var res = {
      date: d,
      recettes: recettes.map(function (r) {
        r.modifiable = modifiable(u, r, aujourdhui);
        r.supprimable = supprimable(u, r, aujourdhui);
        return r;
      }).sort(function (a, b) { return PH_SESSIONS_CAISSE.indexOf(a.session) - PH_SESSIONS_CAISSE.indexOf(b.session); })
    };
    if (!voitTout) {
      // une caissière voit le détail de ses propres caisses, et seulement qui a saisi les autres
      res.recettes = res.recettes.map(function (r) {
        return r.saisiParId === u.id ? r : { id: r.id, date: r.date, session: r.session, saisiPar: r.saisiPar, masque: true };
      });
      return res;
    }
    var mouvements = store.lire('Mouvements').filter(function (m) { return m.date === d; }).map(function (m) {
      m.modifiable = modifiable(u, m, aujourdhui);
      m.supprimable = supprimable(u, m, aujourdhui);
      return m;
    });
    res.mouvements = mouvements;
    res.totaux = totaux(recettes, mouvements);
    return res;
  };

  function modifiable(u, ligne, aujourdhui) {
    if (peut(u, 'bilan')) return true;                 // gérant(e) : toujours
    return ligne.saisiParId === u.id && String(ligne.saisiLe).slice(0, 10) === aujourdhui; // sa propre saisie, le jour même
  }
  function supprimable(u, ligne, aujourdhui) { return modifiable(u, ligne, aujourdhui); }

  function totaux(recettes, mouvements) {
    var t = { recettes: 0, annules: 0, parMode: {}, parSession: {}, ecart: 0, entrees: 0, sorties: 0, charges: 0,
      especesRecettes: 0, especesEntrees: 0, especesSorties: 0 };
    PH_ENCAISSEMENTS.forEach(function (e) { t.parMode[e.cle] = 0; });
    recettes.forEach(function (r) {
      t.recettes += Number(r.total || 0);
      t.ecart += Number(r.ecart || 0);
      t.annules += Number(r.annules || 0);
      t.parSession[r.session] = (t.parSession[r.session] || 0) + Number(r.total || 0);
      PH_ENCAISSEMENTS.forEach(function (e) { t.parMode[e.cle] += Number(r[e.cle] || 0); });
    });
    t.especesRecettes = t.parMode.especes;
    var nonCharges = PH_CATEGORIES_SORTIE.filter(function (c) { return c.charge === false; }).map(function (c) { return c.nom; });
    (mouvements || []).forEach(function (m) {
      var v = Number(m.montant || 0);
      if (m.sens === 'Entrée') { t.entrees += v; if (m.mode === 'Espèces') t.especesEntrees += v; }
      else {
        t.sorties += v;
        if (nonCharges.indexOf(m.categorie) === -1) t.charges += v;
        if (m.mode === 'Espèces') t.especesSorties += v;
      }
    });
    t.soldeEspeces = t.especesRecettes + t.especesEntrees - t.especesSorties;
    return t;
  }

  /* ---------- Recettes (caisse du matin / du soir) ---------- */
  /** Total des sorties payées avec l'argent du tiroir pour une date et une caisse (matin / soir). */
  function totalSortiesCaisse(d, s) {
    return store.lire('Mouvements').filter(function (m) { return m.date === d && m.session === s && m.sens === 'Sortie' && compteMouvement(m) === 'caisse'; })
      .reduce(function (a, m) { return a + Number(m.montant || 0); }, 0);
  }
  /**
   * Les sorties de caisse d'une session sont rattachées à la PREMIÈRE caisse saisie pour cette session
   * (s'il y en a deux, la seconde n'en reçoit pas). rid = la caisse qu'on enregistre.
   */
  function sortiesDeCaisse(d, s, rid) {
    var autres = store.lire('Recettes').filter(function (x) { return x.date === d && x.session === s; })
      .sort(function (a, b) { return a.saisiLe < b.saisiLe ? -1 : 1; });
    if (autres.length && (!rid || autres[0].id !== rid)) return 0;
    return totalSortiesCaisse(d, s);
  }
  function calculerLigneRecette(l) {
    var comptees = l.especesComptees === '' || l.especesComptees == null ? Number(l.especes || 0) - Number(l.sortiesCaisse || 0) : Number(l.especesComptees);
    l.especesComptees = comptees;
    l.especes = comptees + Number(l.sortiesCaisse || 0);
    l.total = 0;
    PH_ENCAISSEMENTS.forEach(function (e) { l.total += Number(l[e.cle] || 0); });
    var attendu = l.logiciel === '' || l.logiciel == null ? '' : Number(l.logiciel) - Number(l.annules || 0);
    l.ecart = attendu === '' ? '' : l.total - attendu;
    return l;
  }
  /** Après l'ajout / la modification d'une sortie de caisse : on remet à jour la caisse concernée. */
  function recalculerCaisses(d, s) {
    if (!d || !s) return;
    var liste = store.lire('Recettes').filter(function (x) { return x.date === d && x.session === s; })
      .sort(function (a, b) { return a.saisiLe < b.saisiLe ? -1 : 1; });
    liste.forEach(function (r, i) {
      var l = { especes: r.especes, especesComptees: r.especesComptees, sortiesCaisse: r.sortiesCaisse, logiciel: r.logiciel, annules: r.annules };
      PH_ENCAISSEMENTS.forEach(function (e) { l[e.cle] = r[e.cle]; });
      calculerLigneRecette(l);                       // fixe d'abord les espèces comptées
      l.sortiesCaisse = i === 0 ? totalSortiesCaisse(d, s) : 0;
      calculerLigneRecette(l);
      if (l.especes !== Number(r.especes) || l.total !== Number(r.total) || String(l.ecart) !== String(r.ecart) || l.sortiesCaisse !== Number(r.sortiesCaisse || 0) || r.especesComptees === '') {
        store.maj('Recettes', 'id', r.id, { especes: l.especes, especesComptees: l.especesComptees, sortiesCaisse: l.sortiesCaisse, total: l.total, ecart: l.ecart });
      }
    });
  }

  api.enregistrerRecette = function (jeton, r) {
    var u = session(jeton);
    exiger(u, 'recettes');
    r = r || {};
    var aujourdhui = outils.aujourdhui();
    var d = date(r.date);
    if (d > aujourdhui) erreur('La date ne peut pas être dans le futur.');
    if (!peut(u, 'bilan') && joursEntre(d, aujourdhui) > 2) erreur('Pour une caisse de plus de 2 jours, demandez au gérant.');
    var s = txt(r.session, 10);
    if (PH_SESSIONS_CAISSE.indexOf(s) === -1) erreur('Choisissez la caisse du matin ou du soir.');
    var ligne = { date: d, session: s, observation: txt(r.observation, 500) };
    PH_ENCAISSEMENTS.forEach(function (e) { ligne[e.cle] = montant(r[e.cle], e.nom); });
    // « Espèces » saisies = ce qui est réellement dans le tiroir
    ligne.especesComptees = ligne.especes;
    ligne.annules = montant(r.annules, 'tickets annulés');
    ligne.logiciel = r.logiciel === '' || r.logiciel == null ? '' : montant(r.logiciel, 'logiciel');
    if (ligne.annules && ligne.logiciel !== '' && ligne.annules > ligne.logiciel) erreur('Les tickets annulés dépassent le chiffre du logiciel.');
    var sorties = sortiesDeCaisse(d, s, r.id || '');
    ligne.sortiesCaisse = sorties;
    calculerLigneRecette(ligne);
    if (ligne.total <= 0) erreur('Saisissez au moins un montant.');
    var total = ligne.total;

    if (r.id) {
      var ex = store.lire('Recettes').filter(function (x) { return x.id === r.id; })[0];
      if (!ex) erreur('Caisse introuvable.');
      if (!modifiable(u, ex, aujourdhui)) erreur('Cette caisse ne peut plus être modifiée. Demandez au gérant.');
      ligne.modifiePar = u.nom; ligne.modifieLe = outils.maintenant();
      store.maj('Recettes', 'id', ex.id, ligne);
      if (ex.date !== d || ex.session !== s) recalculerCaisses(ex.date, ex.session);
      journaliser(u, 'Caisse modifiée', ex.date + ' ' + ex.session + ' : ' + ex.total + ' → ' + total);
      return { id: ex.id };
    }
    ligne.id = id('R');
    ligne.saisiParId = u.id; ligne.saisiPar = u.nom; ligne.saisiLe = outils.maintenant();
    ligne.modifiePar = ''; ligne.modifieLe = '';
    store.ajouter('Recettes', ligne);
    recalculerCaisses(d, s);
    journaliser(u, 'Caisse saisie', d + ' ' + s + ' : ' + total + (sorties ? ' (dont ' + sorties + ' de sorties payées en caisse)' : ''));
    return { id: ligne.id };
  };

  api.supprimerRecette = function (jeton, rid) {
    var u = session(jeton);
    var ex = store.lire('Recettes').filter(function (x) { return x.id === rid; })[0];
    if (!ex) erreur('Caisse introuvable.');
    if (!supprimable(u, ex, outils.aujourdhui())) erreur("Vous n'avez pas le droit de supprimer cette caisse.");
    store.suppr('Recettes', 'id', rid);
    recalculerCaisses(ex.date, ex.session);
    journaliser(u, 'Caisse supprimée', ex.date + ' ' + ex.session + ' (' + ex.saisiPar + ') : ' + ex.total);
    return true;
  };

  /* ---------- Entrées et sorties ---------- */
  api.enregistrerMouvement = function (jeton, m) {
    var u = session(jeton);
    exiger(u, 'mouvements');
    m = m || {};
    var aujourdhui = outils.aujourdhui();
    var d = date(m.date);
    if (d > aujourdhui) erreur('La date ne peut pas être dans le futur.');
    if (!peut(u, 'bilan') && joursEntre(d, aujourdhui) > 2) erreur('Pour une opération de plus de 2 jours, demandez au gérant.');
    var sens = m.sens === 'Entrée' ? 'Entrée' : 'Sortie';
    var cats = sens === 'Entrée' ? PH_CATEGORIES_ENTREE : PH_CATEGORIES_SORTIE;
    var cat = cats.filter(function (c) { return c.nom === m.categorie; })[0];
    if (!cat) erreur('Choisissez une catégorie.');
    var ligne = { date: d, sens: sens, categorie: cat.nom, fournisseurId: '', fournisseur: '',
      reference: txt(m.reference, 80), libelle: txt(m.libelle, 300), montant: montant(m.montant), mode: '', compte: '' };
    if (ligne.montant <= 0) erreur('Saisissez le montant.');
    var comptesPermis = (PH_ROLES[u.role] || PH_ROLES.employe).comptesSortie;
    if (comptesPermis.indexOf(m.compte) === -1) erreur(sens === 'Sortie' ? 'Choisissez d\'où part l\'argent.' : 'Choisissez où arrive l\'argent.');
    ligne.compte = m.compte;
    ligne.mode = compteDef(m.compte).mode;
    ligne.session = '';
    if (m.compte === 'caisse' && sens === 'Sortie') {
      ligne.session = PH_SESSIONS_CAISSE.indexOf(m.session) !== -1 ? m.session : erreur('Précisez : caisse du matin ou du soir ?');
    }
    if (m.compte === 'banque') ligne.mode = m.mode === 'Virement' ? 'Virement' : 'Chèque';
    if (cat.fournisseur) {
      var f = store.lire('Fournisseurs').filter(function (x) { return x.id === m.fournisseurId; })[0];
      if (!f) erreur('Choisissez le fournisseur.');
      ligne.fournisseurId = f.id; ligne.fournisseur = f.nom;
    }
    if (r_vide(ligne.libelle) && !cat.fournisseur && /^Autre/.test(cat.nom)) erreur('Précisez le libellé.');

    if (m.id) {
      var ex = store.lire('Mouvements').filter(function (x) { return x.id === m.id; })[0];
      if (!ex) erreur('Opération introuvable.');
      if (!modifiable(u, ex, aujourdhui)) erreur('Cette opération ne peut plus être modifiée. Demandez au gérant.');
      if (oui(ex.rapproche) && (ex.montant !== ligne.montant || ex.compte !== ligne.compte)) erreur('Cette opération est déjà pointée sur le relevé bancaire : dépointez-la d\'abord.');
      ligne.modifiePar = u.nom; ligne.modifieLe = outils.maintenant();
      store.maj('Mouvements', 'id', ex.id, ligne);
      recalculerCaisses(ex.date, ex.session); recalculerCaisses(ligne.date, ligne.session);
      journaliser(u, sens + ' modifiée', ex.date + ' ' + ex.categorie + ' : ' + ex.montant + ' → ' + ligne.montant);
      return { id: ex.id };
    }
    ligne.id = id('M');
    ligne.saisiParId = u.id; ligne.saisiPar = u.nom; ligne.saisiLe = outils.maintenant();
    ligne.modifiePar = ''; ligne.modifieLe = ''; ligne.rapproche = ''; ligne.rapprocheLe = '';
    store.ajouter('Mouvements', ligne);
    recalculerCaisses(ligne.date, ligne.session);
    journaliser(u, sens + ' saisie', d + ' ' + cat.nom + (ligne.fournisseur ? ' / ' + ligne.fournisseur : '') + ' : ' + ligne.montant);
    return { id: ligne.id };
  };
  function r_vide(s) { return !s || !String(s).trim(); }

  api.supprimerMouvement = function (jeton, mid) {
    var u = session(jeton);
    exiger(u, 'mouvements');
    var ex = store.lire('Mouvements').filter(function (x) { return x.id === mid; })[0];
    if (!ex) erreur('Opération introuvable.');
    if (!supprimable(u, ex, outils.aujourdhui())) erreur("Vous n'avez pas le droit de supprimer cette opération.");
    if (oui(ex.rapproche)) erreur('Cette opération est pointée sur le relevé bancaire : dépointez-la d\'abord.');
    store.suppr('Mouvements', 'id', mid);
    recalculerCaisses(ex.date, ex.session);
    journaliser(u, ex.sens + ' supprimée', ex.date + ' ' + ex.categorie + (ex.fournisseur ? ' / ' + ex.fournisseur : '') + ' : ' + ex.montant);
    return true;
  };

  /* ---------- Fournisseurs ---------- */
  function listeFournisseurs(tous) {
    return store.lire('Fournisseurs').filter(function (f) { return tous || oui(f.actif); }).map(function (f) {
      return { id: f.id, nom: f.nom, principal: oui(f.principal), telephone: f.telephone, contact: f.contact, notes: f.notes, actif: oui(f.actif) };
    }).sort(function (a, b) {
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      return a.nom.localeCompare(b.nom, 'fr');
    });
  }
  api.enregistrerFournisseur = function (jeton, f) {
    var u = session(jeton);
    exiger(u, 'fournisseurs');
    f = f || {};
    var nom = txt(f.nom, 100);
    if (!nom) erreur('Le nom du fournisseur est obligatoire.');
    var tous = store.lire('Fournisseurs');
    var doublon = tous.filter(function (x) { return x.nom.toLowerCase() === nom.toLowerCase() && x.id !== f.id; })[0];
    if (doublon) erreur('Ce fournisseur existe déjà.');
    var ligne = { nom: nom, principal: f.principal ? 'oui' : 'non', telephone: txt(f.telephone, 40), contact: txt(f.contact, 100),
      notes: txt(f.notes, 300), actif: f.actif === false ? 'non' : 'oui' };
    if (f.id) {
      if (!tous.some(function (x) { return x.id === f.id; })) erreur('Fournisseur introuvable.');
      store.maj('Fournisseurs', 'id', f.id, ligne);
      journaliser(u, 'Fournisseur modifié', nom);
      return listeFournisseurs(true);
    }
    ligne.id = id('F');
    store.ajouter('Fournisseurs', ligne);
    journaliser(u, 'Fournisseur ajouté', nom);
    return listeFournisseurs(true);
  };
  /** Colle une liste (un fournisseur par ligne) : ajoute ceux qui n'existent pas encore. */
  api.importerFournisseurs = function (jeton, texte) {
    var u = session(jeton);
    exiger(u, 'fournisseurs');
    var existants = store.lire('Fournisseurs').map(function (x) { return x.nom.toLowerCase(); });
    var ajoutes = 0;
    String(texte || '').split(/\r?\n/).forEach(function (l) {
      var nom = txt(l.replace(/^[\s\-•*\d.)]+/, ''), 100);
      if (!nom || existants.indexOf(nom.toLowerCase()) !== -1) return;
      existants.push(nom.toLowerCase());
      store.ajouter('Fournisseurs', { id: id('F'), nom: nom, principal: 'non', telephone: '', contact: '', notes: '', actif: 'oui' });
      ajoutes++;
    });
    if (ajoutes) journaliser(u, 'Fournisseurs importés', ajoutes + ' ajoutés');
    return { ajoutes: ajoutes, fournisseurs: listeFournisseurs(true) };
  };

  /* ---------- Demandes (permissions, congés, remplacements) ---------- */
  api.nouvelleDemande = function (jeton, d) {
    var u = session(jeton);
    exiger(u, 'demandes');
    d = d || {};
    var type = PH_TYPES_DEMANDE.indexOf(d.type) !== -1 ? d.type : erreur('Choisissez le type de demande.');
    var du = date(d.du, 'Date de début');
    var au = d.au ? date(d.au, 'Date de fin') : du;
    if (au < du) erreur('La date de fin est avant la date de début.');
    if (du < ajouterJours(outils.aujourdhui(), -7)) erreur('La date est trop ancienne.');
    var creneau = PH_CRENEAUX.indexOf(d.creneau) !== -1 ? d.creneau : PH_CRENEAUX[0];
    var remp = null;
    if (d.remplacantId) {
      remp = trouverUser(d.remplacantId);
      if (!remp || !oui(remp.actif) || remp.id === u.id) erreur('Remplaçant invalide.');
    }
    if ((type === 'Remplacement' || type === 'Échange de poste') && !remp) erreur('Choisissez la personne qui vous remplace.');
    var motif = txt(d.motif, 500);
    if (!motif) erreur('Indiquez le motif.');
    var ligne = { id: id('D'), userId: u.id, demandeur: u.nom, type: type, du: du, au: au, creneau: creneau,
      heures: txt(d.heures, 40), motif: motif, remplacantId: remp ? remp.id : '', remplacant: remp ? remp.nom : '',
      statut: remp ? PH_STATUTS.REMPLACANT : PH_STATUTS.ATTENTE, reponseRemplacant: '', valideur: '', commentaire: '',
      creeLe: outils.maintenant(), traiteLe: '' };
    store.ajouter('Demandes', ligne);
    journaliser(u, 'Demande envoyée', type + ' du ' + du + (au !== du ? ' au ' + au : '') + (remp ? ' (remplaçant : ' + remp.nom + ')' : ''));
    return ligne;
  };

  function trouverDemande(did) {
    var d = store.lire('Demandes').filter(function (x) { return x.id === did; })[0];
    if (!d) erreur('Demande introuvable.');
    return d;
  }

  api.repondreRemplacement = function (jeton, did, accepte) {
    var u = session(jeton);
    var d = trouverDemande(did);
    if (d.remplacantId !== u.id) erreur("Cette demande ne vous concerne pas.");
    if (d.statut !== PH_STATUTS.REMPLACANT) erreur('Cette demande a déjà reçu une réponse.');
    var champs = accepte
      ? { statut: PH_STATUTS.ATTENTE, reponseRemplacant: 'Accepté le ' + outils.maintenant() }
      : { statut: PH_STATUTS.REFUSEE, reponseRemplacant: 'Refusé le ' + outils.maintenant(), traiteLe: outils.maintenant() };
    store.maj('Demandes', 'id', did, champs);
    journaliser(u, accepte ? 'Remplacement accepté' : 'Remplacement refusé', d.demandeur + ' — ' + d.type + ' du ' + d.du);
    return true;
  };

  api.traiterDemande = function (jeton, did, accepte, commentaire) {
    var u = session(jeton);
    exiger(u, 'valider');
    var d = trouverDemande(did);
    if (d.statut !== PH_STATUTS.ATTENTE && d.statut !== PH_STATUTS.REMPLACANT) erreur('Cette demande a déjà été traitée.');
    store.maj('Demandes', 'id', did, { statut: accepte ? PH_STATUTS.ACCEPTEE : PH_STATUTS.REFUSEE, valideur: u.nom,
      commentaire: txt(commentaire, 300), traiteLe: outils.maintenant() });
    journaliser(u, accepte ? 'Demande acceptée' : 'Demande refusée', d.demandeur + ' — ' + d.type + ' du ' + d.du);
    return true;
  };

  api.annulerDemande = function (jeton, did) {
    var u = session(jeton);
    var d = trouverDemande(did);
    if (d.userId !== u.id) erreur("Ce n'est pas votre demande.");
    if (d.statut === PH_STATUTS.REFUSEE || d.statut === PH_STATUTS.ANNULEE) erreur('Cette demande est déjà close.');
    if (d.statut === PH_STATUTS.ACCEPTEE && d.du < outils.aujourdhui()) erreur('Cette demande est déjà en cours ou passée.');
    store.maj('Demandes', 'id', did, { statut: PH_STATUTS.ANNULEE, traiteLe: outils.maintenant() });
    journaliser(u, 'Demande annulée', d.type + ' du ' + d.du);
    return true;
  };

  api.historiqueDemandes = function (jeton, mois) {
    var u = session(jeton);
    exiger(u, 'valider');
    var m = txt(mois, 7);
    return store.lire('Demandes').filter(function (d) { return !m || d.du.slice(0, 7) === m || d.au.slice(0, 7) === m; }).sort(parDateCreation);
  };

  /* ================================================================== */
  /* Trésorerie : où est l'argent de la pharmacie                         */
  /* ================================================================== */
  function role(u) { return PH_ROLES[u.role] || PH_ROLES.employe; }
  function compteDef(cle) { return PH_COMPTES.filter(function (c) { return c.cle === cle; })[0] || { cle: cle, nom: cle, court: cle, mode: 'Autre' }; }
  function nomCompte(cle) { return compteDef(cle).nom; }
  function transfertsValides() { return store.lire('Transferts').filter(function (t) { return t.statut === PH_T.CONFIRME; }); }
  /** Ancien enregistrement sans compte : on le devine d'après le mode de paiement. */
  function compteMouvement(m) {
    if (m.compte) return m.compte;
    if (m.mode === 'Espèces') return 'caisse';
    if (m.mode === 'Mobile Money') return 'om';
    if (m.mode === 'Chèque' || m.mode === 'Virement') return 'banque';
    return '';
  }
  function libelleTransfert(t) {
    var k = t.de + '>' + t.vers;
    var noms = {
      'caisse>principale': 'Versement à la caissière principale',
      'om>principale': 'Retrait Orange Money', 'momo>principale': 'Retrait MTN MoMo',
      'principale>gerante': 'Versement à la gérante',
      'gerante>banque': 'Dépôt en banque', 'principale>banque': 'Dépôt en banque', 'caisse>banque': 'Dépôt en banque',
      'banque>gerante': 'Retrait à la banque', 'om>banque': 'Orange Money vers la banque', 'momo>banque': 'MTN MoMo vers la banque'
    };
    return noms[k] || (compteDef(t.de).court + ' → ' + compteDef(t.vers).court);
  }
  /** Qui doit confirmer qu'il a bien reçu l'argent (sinon : confirmé tout de suite). */
  function confirmationPar(t) {
    if (t.vers === 'principale' && t.de === 'caisse') return 'tresorerie';
    if (t.vers === 'gerante' && t.de === 'principale') return 'banque';
    return '';
  }
  function peutConfirmer(u, t) { var c = confirmationPar(t); return !!c && peut(u, c); }
  function transfertPermis(u, de, vers) {
    if (peut(u, 'banque')) return true;
    var k = de + '>' + vers;
    if (peut(u, 'tresorerie') && ['caisse>principale', 'om>principale', 'momo>principale', 'principale>gerante', 'principale>banque'].indexOf(k) !== -1) return true;
    return peut(u, 'verser') && k === 'caisse>principale';
  }

  /** Solde de chaque compte à une date (comprise), à partir du dernier solde de départ. */
  function calculerSoldes(jusqua) {
    var departs = {};
    store.lire('Soldes').forEach(function (x) {
      if (x.type !== 'Départ' || x.date > jusqua) return;
      if (!departs[x.compte] || x.date >= departs[x.compte].date) departs[x.compte] = x;
    });
    var s = {};
    PH_COMPTES.forEach(function (c) { s[c.cle] = departs[c.cle] ? Number(departs[c.cle].montant || 0) : 0; });
    function ajouter(cle, d, v) {
      if (!cle || !(cle in s) || d > jusqua) return;
      if (departs[cle] && d < departs[cle].date) return;
      s[cle] += v;
    }
    store.lire('Recettes').forEach(function (r) {
      PH_ENCAISSEMENTS.forEach(function (e) { if (e.compte) ajouter(e.compte, r.date, Number(r[e.cle] || 0)); });
    });
    store.lire('Mouvements').forEach(function (m) {
      ajouter(compteMouvement(m), m.date, (m.sens === 'Entrée' ? 1 : -1) * Number(m.montant || 0));
    });
    transfertsValides().forEach(function (t) {
      ajouter(t.de, t.date, -(Number(t.montant || 0) + Number(t.frais || 0)));
      ajouter(t.vers, t.date, Number(t.montantRecu === '' ? t.montant : t.montantRecu));
    });
    return { soldes: s, departs: departs };
  }

  api.tresorerie = function (jeton) {
    var u = session(jeton);
    exiger(u, 'verser');
    var aujourdhui = outils.aujourdhui();
    var vus = role(u).comptesVus;
    var calc = calculerSoldes(aujourdhui);
    var controles = store.lire('Soldes').filter(function (x) { return x.type !== 'Départ'; });
    var tous = store.lire('Transferts');
    var enAttente = tous.filter(function (t) { return t.statut === PH_T.ATTENTE; });
    function concerne(t) {
      if (peut(u, 'banque') || t.saisiParId === u.id) return true;
      return peut(u, 'tresorerie') && (vus.indexOf(t.de) !== -1 || vus.indexOf(t.vers) !== -1);
    }
    return {
      date: aujourdhui,
      comptes: vus.map(function (cle) {
        var dernier = controles.filter(function (x) { return x.compte === cle; }).sort(function (a, b) { return a.saisiLe < b.saisiLe ? 1 : -1; })[0] || null;
        var dep = calc.departs[cle];
        return {
          cle: cle, nom: nomCompte(cle), solde: calc.soldes[cle], dernierControle: dernier,
          depart: dep ? { date: dep.date, montant: Number(dep.montant || 0) } : null,
          sortant: enAttente.filter(function (t) { return t.de === cle; }).reduce(function (a, t) { return a + Number(t.montant || 0); }, 0)
        };
      }),
      aConfirmer: enAttente.filter(function (t) { return peutConfirmer(u, t); }).map(decorer),
      transferts: tous.filter(function (t) { return joursEntre(t.date, aujourdhui) <= 45 && concerne(t); })
        .sort(function (a, b) { return a.saisiLe < b.saisiLe ? 1 : -1; }).slice(0, 80).map(function (t) {
          var x = decorer(t);
          x.annulable = (t.statut === PH_T.ATTENTE && t.saisiParId === u.id) || (peut(u, 'banque') && t.statut !== PH_T.ANNULE && !oui(t.rapproche));
          return x;
        }),
      possibles: {
        versement: transfertPermis(u, 'caisse', 'principale'),
        retraitMobile: transfertPermis(u, 'om', 'principale'),
        versementGerante: transfertPermis(u, 'principale', 'gerante'),
        banque: peut(u, 'banque')
      }
    };
  };
  function decorer(t) {
    var x = Object.assign({}, t);
    x.libelle = libelleTransfert(t); x.deNom = nomCompte(t.de); x.versNom = nomCompte(t.vers);
    return x;
  }

  api.nouveauTransfert = function (jeton, t) {
    var u = session(jeton);
    exiger(u, 'verser');
    t = t || {};
    var aujourdhui = outils.aujourdhui();
    var d = date(t.date || aujourdhui);
    if (d > aujourdhui) erreur('La date ne peut pas être dans le futur.');
    if (!peut(u, 'banque') && joursEntre(d, aujourdhui) > 2) erreur('Pour une date de plus de 2 jours, demandez à la gérante.');
    var de = txt(t.de, 20), vers = txt(t.vers, 20);
    if (!PH_COMPTES.some(function (c) { return c.cle === de; }) || !PH_COMPTES.some(function (c) { return c.cle === vers; }) || de === vers) erreur('Choisissez d\'où part l\'argent et où il arrive.');
    if (!transfertPermis(u, de, vers)) erreur("Vous n'avez pas le droit de faire ce mouvement.");
    var ligne = { id: id('T'), date: d, de: de, vers: vers, montant: montant(t.montant), frais: montant(t.frais, 'frais'), montantRecu: '', ecart: '',
      reference: txt(t.reference, 80), note: txt(t.note, 300), statut: PH_T.ATTENTE, saisiParId: u.id, saisiPar: u.nom,
      saisiLe: outils.maintenant(), confirmePar: '', confirmeLe: '', rapproche: '', rapprocheLe: '' };
    if (ligne.montant <= 0) erreur('Saisissez le montant.');
    if (!confirmationPar(ligne) || peutConfirmer(u, ligne)) {
      ligne.statut = PH_T.CONFIRME; ligne.montantRecu = ligne.montant; ligne.ecart = 0;
      ligne.confirmePar = u.nom; ligne.confirmeLe = ligne.saisiLe;
    }
    store.ajouter('Transferts', ligne);
    journaliser(u, libelleTransfert(ligne), d + ' : ' + ligne.montant + (ligne.frais ? ' (frais ' + ligne.frais + ')' : '') +
      (ligne.statut === PH_T.ATTENTE ? ' — en attente de confirmation' : ''));
    return decorer(ligne);
  };

  api.confirmerTransfert = function (jeton, tid, accepte, recu, note) {
    var u = session(jeton);
    var t = store.lire('Transferts').filter(function (x) { return x.id === tid; })[0];
    if (!t) erreur('Mouvement introuvable.');
    if (t.statut !== PH_T.ATTENTE) erreur('Ce mouvement a déjà été traité.');
    if (!peutConfirmer(u, t)) erreur("Ce n'est pas à vous de confirmer ce versement.");
    var champs = { confirmePar: u.nom, confirmeLe: outils.maintenant() };
    if (accepte) {
      var r = recu === '' || recu == null ? Number(t.montant) : montant(recu, 'montant reçu');
      champs.statut = PH_T.CONFIRME; champs.montantRecu = r; champs.ecart = r - Number(t.montant);
    } else champs.statut = PH_T.REFUSE;
    if (note) champs.note = txt((t.note ? t.note + ' / ' : '') + note, 300);
    store.maj('Transferts', 'id', tid, champs);
    journaliser(u, accepte ? 'Versement reçu' : 'Versement refusé', libelleTransfert(t) + ' de ' + t.saisiPar + ' : ' + t.montant +
      (accepte && champs.ecart ? ' — reçu ' + champs.montantRecu + ' (écart ' + champs.ecart + ')' : ''));
    return true;
  };

  api.annulerTransfert = function (jeton, tid) {
    var u = session(jeton);
    var t = store.lire('Transferts').filter(function (x) { return x.id === tid; })[0];
    if (!t) erreur('Mouvement introuvable.');
    var ok = (t.statut === PH_T.ATTENTE && t.saisiParId === u.id) || (peut(u, 'banque') && t.statut !== PH_T.ANNULE);
    if (!ok) erreur("Vous ne pouvez pas annuler ce mouvement.");
    if (oui(t.rapproche)) erreur('Ce mouvement est pointé sur le relevé bancaire : dépointez-le d\'abord.');
    store.maj('Transferts', 'id', tid, { statut: PH_T.ANNULE });
    journaliser(u, 'Mouvement annulé', libelleTransfert(t) + ' du ' + t.date + ' : ' + t.montant);
    return true;
  };

  /** Recoupage : on compte l'argent réel (ou on lit le solde Orange Money / le relevé) et on compare. */
  api.controlerSolde = function (jeton, cle, reel, note) {
    var u = session(jeton);
    exiger(u, 'verser');
    if (role(u).comptesVus.indexOf(cle) === -1) erreur("Vous n'avez pas accès à ce compte.");
    if (reel === '' || reel == null) erreur('Saisissez le montant constaté.');
    var r = montant(reel, 'montant constaté');
    var calc = calculerSoldes(outils.aujourdhui()).soldes[cle];
    var ligne = { id: id('S'), date: outils.aujourdhui(), compte: cle, type: 'Contrôle', montant: r, calcule: calc, ecart: r - calc,
      note: txt(note, 300), saisiPar: u.nom, saisiLe: outils.maintenant() };
    store.ajouter('Soldes', ligne);
    journaliser(u, 'Contrôle ' + nomCompte(cle), 'constaté ' + r + ', calculé ' + calc + ', écart ' + (r - calc));
    return ligne;
  };

  api.definirSoldeDepart = function (jeton, cle, jour, valeur) {
    var u = session(jeton);
    exiger(u, 'banque');
    if (!PH_COMPTES.some(function (c) { return c.cle === cle; })) erreur('Compte inconnu.');
    var d = date(jour);
    var v = montant(valeur, 'solde de départ');
    var ex = store.lire('Soldes').filter(function (x) { return x.type === 'Départ' && x.compte === cle && x.date === d; })[0];
    if (ex) store.maj('Soldes', 'id', ex.id, { montant: v, saisiPar: u.nom, saisiLe: outils.maintenant() });
    else store.ajouter('Soldes', { id: id('S'), date: d, compte: cle, type: 'Départ', montant: v, calcule: '', ecart: '', note: '', saisiPar: u.nom, saisiLe: outils.maintenant() });
    journaliser(u, 'Solde de départ', nomCompte(cle) + ' au ' + d + ' : ' + v);
    return true;
  };

  /** Rapprochement bancaire : opérations de la banque, pointées ou non sur le relevé. */
  api.banque = function (jeton, mois) {
    var u = session(jeton);
    exiger(u, 'banque');
    var m = txt(mois, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) erreur('Mois invalide.');
    var aujourdhui = outils.aujourdhui();
    var dep = calculerSoldes(aujourdhui).departs.banque;
    function apresDepart(d) { return !dep || d >= dep.date; }
    var ops = [];
    store.lire('Mouvements').forEach(function (x) {
      if (compteMouvement(x) !== 'banque' || !apresDepart(x.date)) return;
      ops.push({ type: 'M', id: x.id, date: x.date, montant: (x.sens === 'Entrée' ? 1 : -1) * Number(x.montant || 0),
        libelle: (x.fournisseur || x.categorie) + (x.libelle ? ' — ' + x.libelle : ''), reference: x.reference, mode: x.mode,
        rapproche: oui(x.rapproche), rapprocheLe: x.rapprocheLe, par: x.saisiPar });
    });
    store.lire('Recettes').forEach(function (r) {
      if (Number(r.cheque) > 0 && apresDepart(r.date)) ops.push({ type: 'R', id: r.id, date: r.date, montant: Number(r.cheque),
        libelle: 'Chèques clients — caisse du ' + r.session.toLowerCase(), reference: '', mode: 'Chèque', rapproche: true, par: r.saisiPar });
    });
    transfertsValides().forEach(function (t) {
      if ((t.de !== 'banque' && t.vers !== 'banque') || !apresDepart(t.date)) return;
      var v = t.vers === 'banque' ? Number(t.montantRecu === '' ? t.montant : t.montantRecu) : -(Number(t.montant) + Number(t.frais || 0));
      ops.push({ type: 'T', id: t.id, date: t.date, montant: v, libelle: libelleTransfert(t) + (t.note ? ' — ' + t.note : ''),
        reference: t.reference, mode: '', rapproche: oui(t.rapproche), rapprocheLe: t.rapprocheLe, par: t.saisiPar });
    });
    var solde = calculerSoldes(aujourdhui).soldes.banque;
    var nonPointes = ops.filter(function (o) { return !o.rapproche; });
    var debitsEnAttente = nonPointes.filter(function (o) { return o.montant < 0; }).reduce(function (a, o) { return a - o.montant; }, 0);
    var creditsEnAttente = nonPointes.filter(function (o) { return o.montant > 0; }).reduce(function (a, o) { return a + o.montant; }, 0);
    var releves = store.lire('Soldes').filter(function (x) { return x.compte === 'banque' && x.type === 'Relevé'; })
      .sort(function (a, b) { return a.saisiLe < b.saisiLe ? 1 : -1; });
    return {
      mois: m, solde: solde, debitsEnAttente: debitsEnAttente, creditsEnAttente: creditsEnAttente,
      attenduReleve: solde + debitsEnAttente - creditsEnAttente,
      operations: ops.filter(function (o) { return !o.rapproche || o.date.slice(0, 7) === m; })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; }),
      dernierReleve: releves[0] || null
    };
  };

  api.pointer = function (jeton, type, oid, pointe) {
    var u = session(jeton);
    exiger(u, 'banque');
    var table = type === 'T' ? 'Transferts' : type === 'M' ? 'Mouvements' : erreur('Opération inconnue.');
    var x = store.lire(table).filter(function (y) { return y.id === oid; })[0];
    if (!x) erreur('Opération introuvable.');
    store.maj(table, 'id', oid, { rapproche: pointe ? 'oui' : '', rapprocheLe: pointe ? outils.maintenant() : '' });
    return true;
  };

  api.enregistrerReleve = function (jeton, valeur, note) {
    var u = session(jeton);
    exiger(u, 'banque');
    var r = montant(valeur, 'solde du relevé');
    var b = api.banque(jeton, outils.aujourdhui().slice(0, 7));
    var ligne = { id: id('S'), date: outils.aujourdhui(), compte: 'banque', type: 'Relevé', montant: r, calcule: b.attenduReleve,
      ecart: r - b.attenduReleve, note: txt(note, 300), saisiPar: u.nom, saisiLe: outils.maintenant() };
    store.ajouter('Soldes', ligne);
    journaliser(u, 'Rapprochement bancaire', 'relevé ' + r + ', attendu ' + b.attenduReleve + ', écart ' + ligne.ecart);
    return ligne;
  };

  /* ---------- Bilan du mois (gérant) ---------- */
  api.bilan = function (jeton, mois) {
    var u = session(jeton);
    exiger(u, 'bilan');
    var m = txt(mois, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) erreur('Mois invalide.');
    var recettes = store.lire('Recettes').filter(function (r) { return r.date.slice(0, 7) === m; });
    var mouvements = store.lire('Mouvements').filter(function (x) { return x.date.slice(0, 7) === m; });
    transfertsValides().filter(function (t) { return t.date.slice(0, 7) === m && Number(t.frais) > 0; }).forEach(function (t) {
      mouvements.push({ id: t.id, date: t.date, sens: 'Sortie', categorie: PH_CATEGORIE_FRAIS, montant: Number(t.frais),
        compte: t.de, mode: compteDef(t.de).mode, libelle: libelleTransfert(t), saisiPar: t.saisiPar, fournisseur: '', reference: t.reference });
    });
    var parJour = {};
    function jour(d) { return parJour[d] || (parJour[d] = { date: d, matin: 0, soir: 0, recettes: 0, ecart: 0, entrees: 0, sorties: 0 }); }
    recettes.forEach(function (r) {
      var j = jour(r.date), v = Number(r.total || 0);
      if (r.session === 'Matin') j.matin += v; else j.soir += v;
      j.recettes += v; j.ecart += Number(r.ecart || 0);
    });
    var parCategorie = {}, parFournisseur = {};
    mouvements.forEach(function (x) {
      var j = jour(x.date), v = Number(x.montant || 0);
      if (x.sens === 'Entrée') { j.entrees += v; return; }
      j.sorties += v;
      parCategorie[x.categorie] = (parCategorie[x.categorie] || 0) + v;
      if (x.fournisseur) parFournisseur[x.fournisseur] = (parFournisseur[x.fournisseur] || 0) + v;
    });
    function trier(o) { return Object.keys(o).map(function (k) { return { nom: k, montant: o[k] }; }).sort(function (a, b) { return b.montant - a.montant; }); }
    return {
      mois: m,
      totaux: totaux(recettes, mouvements),
      jours: Object.keys(parJour).sort().map(function (k) { return parJour[k]; }),
      parCategorie: trier(parCategorie),
      parFournisseur: trier(parFournisseur),
      recettes: recettes.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.session === 'Matin' ? -1 : 1); }),
      mouvements: mouvements.sort(function (a, b) { return a.date < b.date ? -1 : 1; }),
      nbCaisses: recettes.length
    };
  };

  /* ---------- Équipe (gérant) ---------- */
  api.equipe = function (jeton) {
    var u = session(jeton);
    exiger(u, 'equipe');
    return utilisateurs().map(function (x) {
      var p = publicUser(x); p.pinAChanger = oui(x.pinAChanger); return p;
    });
  };
  api.enregistrerUtilisateur = function (jeton, x) {
    var u = session(jeton);
    exiger(u, 'equipe');
    x = x || {};
    var nom = txt(x.nom, 60);
    if (!nom) erreur('Le nom est obligatoire.');
    if (!PH_ROLES[x.role]) erreur('Choisissez un rôle.');
    var tous = utilisateurs();
    if (tous.some(function (y) { return y.nom.toLowerCase() === nom.toLowerCase() && y.id !== x.id; })) erreur('Ce nom est déjà utilisé.');
    if (x.id) {
      var ex = tous.filter(function (y) { return y.id === x.id; })[0];
      if (!ex) erreur('Profil introuvable.');
      if (ex.id === u.id && (x.role !== 'admin' || x.actif === false)) erreur('Vous ne pouvez pas retirer votre propre accès gérant.');
      store.maj('Utilisateurs', 'id', ex.id, { nom: nom, role: x.role, actif: x.actif === false ? 'non' : 'oui' });
      if (x.actif === false) store.lire('Sessions').forEach(function (s) { if (s.userId === ex.id) store.suppr('Sessions', 'jeton', s.jeton); });
      journaliser(u, 'Profil modifié', ex.nom + (ex.nom !== nom ? ' → ' + nom : '') + ' (' + PH_ROLES[x.role].nom + (x.actif === false ? ', désactivé' : '') + ')');
      return api.equipe(jeton);
    }
    var uid = 'u' + outils.jeton().replace(/[^a-z0-9]/gi, '').slice(0, 8);
    store.ajouter('Utilisateurs', { id: uid, nom: nom, role: x.role, pinHash: hashPin(uid, PH_PIN_DEPART), pinAChanger: 'oui',
      actif: 'oui', essais: 0, bloqueJusqua: '', creeLe: outils.maintenant() });
    journaliser(u, 'Profil créé', nom + ' (' + PH_ROLES[x.role].nom + ')');
    return api.equipe(jeton);
  };
  api.reinitialiserPin = function (jeton, uid) {
    var u = session(jeton);
    exiger(u, 'equipe');
    var x = trouverUser(uid);
    if (!x) erreur('Profil introuvable.');
    store.maj('Utilisateurs', 'id', x.id, { pinHash: hashPin(x.id, PH_PIN_DEPART), pinAChanger: 'oui', essais: 0, bloqueJusqua: '' });
    store.lire('Sessions').forEach(function (s) { if (s.userId === x.id) store.suppr('Sessions', 'jeton', s.jeton); });
    journaliser(u, 'Code réinitialisé', x.nom);
    return PH_PIN_DEPART;
  };
  api.renommerPharmacie = function (jeton, nom) {
    var u = session(jeton);
    exiger(u, 'equipe');
    var n = txt(nom, 60);
    if (!n) erreur('Indiquez le nom de la pharmacie.');
    if (store.lire('Parametres').some(function (p) { return p.cle === 'nomPharmacie'; })) store.maj('Parametres', 'cle', 'nomPharmacie', { valeur: n });
    else store.ajouter('Parametres', { cle: 'nomPharmacie', valeur: n });
    journaliser(u, 'Nom de la pharmacie', n);
    return n;
  };

  api.journal = function (jeton) {
    var u = session(jeton);
    exiger(u, 'journal');
    return store.lire('Journal').slice(-300).reverse();
  };

  return { api: api, installer: installer };
}

// Liste des fonctions que la page a le droit d'appeler
var PH_FONCTIONS = ['profils', 'connexion', 'deconnexion', 'changerPin', 'charger', 'journee', 'enregistrerRecette',
  'supprimerRecette', 'enregistrerMouvement', 'supprimerMouvement', 'enregistrerFournisseur', 'importerFournisseurs',
  'nouvelleDemande', 'repondreRemplacement', 'traiterDemande', 'annulerDemande', 'historiqueDemandes', 'bilan',
  'equipe', 'enregistrerUtilisateur', 'reinitialiserPin', 'renommerPharmacie', 'journal',
  'tresorerie', 'nouveauTransfert', 'confirmerTransfert', 'annulerTransfert', 'controlerSolde', 'definirSoldeDepart',
  'banque', 'pointer', 'enregistrerReleve'];
