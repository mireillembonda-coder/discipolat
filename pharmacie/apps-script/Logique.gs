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

var PH_VERSION = '1.1';

/* ------------------------------------------------------------------ */
/* Rôles et droits                                                     */
/* ------------------------------------------------------------------ */
var PH_ROLES = {
  admin: {
    nom: 'Gérant(e)',
    droits: ['recettes', 'mouvements', 'fournisseurs', 'journee', 'bilan', 'valider', 'equipe', 'journal', 'demandes']
  },
  principale: {
    nom: 'Caissière principale',
    droits: ['recettes', 'mouvements', 'fournisseurs', 'journee', 'demandes']
  },
  caissiere: {
    nom: 'Caissière',
    droits: ['recettes', 'mouvements', 'journee', 'demandes']
  },
  employe: {
    nom: 'Employé(e)',
    droits: ['demandes']
  }
};

var PH_SESSIONS_CAISSE = ['Matin', 'Soir'];

// Colonnes d'encaissement d'une caisse (dans l'ordre d'affichage)
var PH_ENCAISSEMENTS = [
  { cle: 'especes',     nom: 'Espèces' },
  { cle: 'orangeMoney', nom: 'Orange Money' },
  { cle: 'mtnMomo',     nom: 'MTN MoMo' },
  { cle: 'carte',       nom: 'Carte bancaire' },
  { cle: 'cheque',      nom: 'Chèques' },
  { cle: 'assurance',   nom: 'Assurances / tiers payant' },
  { cle: 'credit',      nom: 'Crédit clients' }
];

// Sorties. charge:false = ce n'est pas une dépense (l'argent change seulement de place).
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
  { nom: 'Transport / courses' },
  { nom: 'Entretien / ménage' },
  { nom: 'Fournitures de bureau' },
  { nom: 'Réparations / maintenance' },
  { nom: 'Sécurité / gardiennage' },
  { nom: 'Frais bancaires' },
  { nom: 'Versement en banque', charge: false },
  { nom: 'Autre sortie' }
];

var PH_CATEGORIES_ENTREE = [
  { nom: 'Fond de caisse' },
  { nom: 'Règlement crédit client' },
  { nom: 'Remboursement assurance' },
  { nom: 'Retrait banque' },
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

/* ------------------------------------------------------------------ */
/* Tableaux (onglets du Google Sheet) et leurs colonnes                */
/* ------------------------------------------------------------------ */
var PH_TABLES = {
  Utilisateurs: ['id', 'nom', 'role', 'pinHash', 'pinAChanger', 'actif', 'essais', 'bloqueJusqua', 'creeLe'],
  Sessions:     ['jeton', 'userId', 'expire'],
  Recettes:     ['id', 'date', 'session', 'especes', 'orangeMoney', 'mtnMomo', 'carte', 'cheque', 'assurance', 'credit',
                 'total', 'logiciel', 'ecart', 'observation', 'saisiParId', 'saisiPar', 'saisiLe', 'modifiePar', 'modifieLe'],
  Mouvements:   ['id', 'date', 'sens', 'categorie', 'fournisseurId', 'fournisseur', 'reference', 'libelle', 'montant', 'mode',
                 'saisiParId', 'saisiPar', 'saisiLe', 'modifiePar', 'modifieLe'],
  Fournisseurs: ['id', 'nom', 'principal', 'telephone', 'contact', 'notes', 'actif'],
  Demandes:     ['id', 'userId', 'demandeur', 'type', 'du', 'au', 'creneau', 'heures', 'motif', 'remplacantId', 'remplacant',
                 'statut', 'reponseRemplacant', 'valideur', 'commentaire', 'creeLe', 'traiteLe'],
  Parametres:   ['cle', 'valeur'],
  Journal:      ['quand', 'qui', 'action', 'details']
};
// Colonnes qui contiennent des nombres (les autres sont du texte)
var PH_NUMERIQUES = ['especes', 'orangeMoney', 'mtnMomo', 'carte', 'cheque', 'assurance', 'credit', 'total', 'logiciel',
  'ecart', 'montant', 'essais'];

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
    var t = { recettes: 0, parMode: {}, parSession: {}, ecart: 0, entrees: 0, sorties: 0, charges: 0,
      especesRecettes: 0, especesEntrees: 0, especesSorties: 0 };
    PH_ENCAISSEMENTS.forEach(function (e) { t.parMode[e.cle] = 0; });
    recettes.forEach(function (r) {
      t.recettes += Number(r.total || 0);
      t.ecart += Number(r.ecart || 0);
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
    var total = 0;
    PH_ENCAISSEMENTS.forEach(function (e) { ligne[e.cle] = montant(r[e.cle], e.nom); total += ligne[e.cle]; });
    if (total <= 0) erreur('Saisissez au moins un montant.');
    ligne.total = total;
    ligne.logiciel = r.logiciel === '' || r.logiciel == null ? '' : montant(r.logiciel, 'logiciel');
    ligne.ecart = ligne.logiciel === '' ? '' : total - ligne.logiciel;

    if (r.id) {
      var ex = store.lire('Recettes').filter(function (x) { return x.id === r.id; })[0];
      if (!ex) erreur('Caisse introuvable.');
      if (!modifiable(u, ex, aujourdhui)) erreur('Cette caisse ne peut plus être modifiée. Demandez au gérant.');
      ligne.modifiePar = u.nom; ligne.modifieLe = outils.maintenant();
      store.maj('Recettes', 'id', ex.id, ligne);
      journaliser(u, 'Caisse modifiée', ex.date + ' ' + ex.session + ' : ' + ex.total + ' → ' + total);
      return { id: ex.id };
    }
    ligne.id = id('R');
    ligne.saisiParId = u.id; ligne.saisiPar = u.nom; ligne.saisiLe = outils.maintenant();
    ligne.modifiePar = ''; ligne.modifieLe = '';
    store.ajouter('Recettes', ligne);
    journaliser(u, 'Caisse saisie', d + ' ' + s + ' : ' + total);
    return { id: ligne.id };
  };

  api.supprimerRecette = function (jeton, rid) {
    var u = session(jeton);
    var ex = store.lire('Recettes').filter(function (x) { return x.id === rid; })[0];
    if (!ex) erreur('Caisse introuvable.');
    if (!supprimable(u, ex, outils.aujourdhui())) erreur("Vous n'avez pas le droit de supprimer cette caisse.");
    store.suppr('Recettes', 'id', rid);
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
      reference: txt(m.reference, 80), libelle: txt(m.libelle, 300), montant: montant(m.montant), mode: '' };
    if (ligne.montant <= 0) erreur('Saisissez le montant.');
    if (PH_MODES.indexOf(m.mode) === -1) erreur('Choisissez le mode de paiement.');
    ligne.mode = m.mode;
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
      ligne.modifiePar = u.nom; ligne.modifieLe = outils.maintenant();
      store.maj('Mouvements', 'id', ex.id, ligne);
      journaliser(u, sens + ' modifiée', ex.date + ' ' + ex.categorie + ' : ' + ex.montant + ' → ' + ligne.montant);
      return { id: ex.id };
    }
    ligne.id = id('M');
    ligne.saisiParId = u.id; ligne.saisiPar = u.nom; ligne.saisiLe = outils.maintenant();
    ligne.modifiePar = ''; ligne.modifieLe = '';
    store.ajouter('Mouvements', ligne);
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
    store.suppr('Mouvements', 'id', mid);
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

  /* ---------- Bilan du mois (gérant) ---------- */
  api.bilan = function (jeton, mois) {
    var u = session(jeton);
    exiger(u, 'bilan');
    var m = txt(mois, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) erreur('Mois invalide.');
    var recettes = store.lire('Recettes').filter(function (r) { return r.date.slice(0, 7) === m; });
    var mouvements = store.lire('Mouvements').filter(function (x) { return x.date.slice(0, 7) === m; });
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
  'equipe', 'enregistrerUtilisateur', 'reinitialiserPin', 'renommerPharmacie', 'journal'];
