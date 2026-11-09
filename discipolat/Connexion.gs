/**
 * Discipolat : suivi des disciples
 * Fichier 2/4 : page web, inscription, validation, connexion par code PIN.
 *
 * Version du 9 novembre 2026 :
 *  - numéros camerounais : 9 chiffres commençant par 6, le +237 est facultatif
 *    (« 6 71 23 45 67 » et « +237 6 71 23 45 67 » désignent le même numéro) ;
 *  - l'espace superviseur n'est accessible que par une adresse réservée
 *    (…/exec?espace=CLÉ) : lancez une fois « adresseSuperviseur » depuis l'éditeur
 *    pour obtenir cette adresse ;
 *  - « Réinitialiser son code » crée un code provisoire que le superviseur transmet
 *    au disciple (plus de « premier code saisi » que n'importe qui pourrait prendre) ;
 *  - après 15 codes faux, le compte est bloqué 6 heures (en plus du blocage de 10 min
 *    après 5 codes faux) : deviner un code devient pratiquement impossible ;
 *  - la fonction « debloquerSuperviseur » (à lancer depuis l'éditeur) lève le blocage
 *    de l'espace superviseur.
 */

var MAX_ESSAIS = 5;                 // codes faux avant un blocage court
var BLOCAGE_SECONDES = 600;         // blocage court (10 min)
var MAX_ESSAIS_LONG = 15;           // codes faux avant un blocage long
var BLOCAGE_LONG_SECONDES = 21600;  // blocage long (6 h, durée maximale du cache)
var MAX_JETONS = 5;                 // appareils connectés en même temps par personne
// Adresse publique de l'application (déploiement utilisé par l'application installée)
var ADRESSE_APP = 'https://script.google.com/macros/s/AKfycbyNXdW6FmBmK3yr0oQWpCBfAk-rrKkz0bv8WBuYwyqLxZ48hFlXCiCqFenPh23TQhwQ/exec';
var MSG_TEL = 'Indiquez un numéro camerounais : 9 chiffres commençant par 6 (le +237 est facultatif).';

/* =====================================================================
 * Page web
 * ===================================================================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Discipolat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    // Permet d'afficher la page dans l'application installée (PWA)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/*
 * Confidentialité : aucune fonction publique ne renvoie la liste des disciples.
 * Un disciple se connecte avec son numéro de téléphone et son code.
 */

function nomAffiche_(d) {
  return (String(d.Prenom || '') + ' ' + String(d.Nom || '')).trim();
}

/**
 * Clé de comparaison d'un numéro : ses 9 derniers chiffres.
 * « 6 71 23 45 67 », « +237 6 71 23 45 67 » et « 00237671234567 » donnent la même clé.
 */
function cleTelephone_(telephone) {
  return String(telephone || '').replace(/\D/g, '').slice(-9);
}

/** Numéro camerounais normalisé (« 671234567 »), ou '' s'il n'est pas valide. */
function telephoneCamerounais_(telephone) {
  var c = String(telephone || '').replace(/\D/g, '');
  if (c.length === 14 && c.indexOf('00237') === 0) c = c.slice(5);
  else if (c.length === 12 && c.indexOf('237') === 0) c = c.slice(3);
  return /^6[0-9]{8}$/.test(c) ? c : '';
}

/** « 671234567 » -> « 6 71 23 45 67 » */
function formaterTelephone_(c) {
  return c.charAt(0) + ' ' + c.slice(1, 3) + ' ' + c.slice(3, 5) + ' ' + c.slice(5, 7) + ' ' + c.slice(7, 9);
}

/* =====================================================================
 * Inscription libre -> statut Candidat
 * ===================================================================== */

function inscrire(prenom, nom, telephone, pin) {
  prenom = String(prenom || '').trim();
  nom = String(nom || '').trim();
  var tel = telephoneCamerounais_(telephone);
  if (prenom.length < 2) throw new Error('Indiquez votre prénom.');
  if (nom.length < 2) throw new Error('Indiquez votre nom.');
  if (!tel) throw new Error(MSG_TEL);
  telephone = formaterTelephone_(tel);
  if (!/^[0-9]{4}$/.test(String(pin))) throw new Error('Le code doit contenir 4 chiffres.');

  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var disciples = lire_(ONGLETS.DISCIPLES);
    var cle = cleTelephone_(telephone);
    var doublon = disciples.filter(function(d){
      return cleTelephone_(d.Telephone) === cle && d.Statut !== STATUTS.NON_RETENU;
    })[0];
    if (doublon) {
      throw new Error(doublon.Statut === STATUTS.CANDIDAT
        ? 'Une demande existe déjà avec ce numéro. Elle attend la validation du superviseur.'
        : 'Ce numéro a déjà un compte. Connectez-vous avec votre numéro et votre code.');
    }

    var base = slugifier_(prenom + '-' + nom);
    var id = base, n = 2;
    var ids = disciples.map(function(d){ return String(d.Id); });
    while (ids.indexOf(id) !== -1 || id === 'admin') { id = base + '-' + n; n++; }

    var salt = Utilities.getUuid();
    var jeton = nouveauJeton_('d', id);
    ajouterLigne_(ONGLETS.DISCIPLES, {
      Id: id, Prenom: prenom, Nom: nom, Telephone: "'" + telephone,
      Statut: STATUTS.CANDIDAT, DateInscription: maintenant_(), DateDernierStatut: maintenant_(),
      PinHash: hacherPin_(pin, salt), PinSalt: salt, Jeton: jeton
    });
    journaliserStatut_(id, prenom, '', STATUTS.CANDIDAT, 'Disciple', 'Inscription');
    return { status: 'pending', token: jeton, slug: id, name: prenom + ' ' + nom, role: 'disciple', statut: STATUTS.CANDIDAT };
  } finally {
    verrou.releaseLock();
  }
}

/* =====================================================================
 * Connexion (le nom de fonction est gardé pour l'écran actuel)
 * ===================================================================== */

/** Connexion du superviseur uniquement (le nom est gardé pour l'écran). */
function loginOrRegister(slug, pin, espace) {
  pin = String(pin || '');
  if (String(slug) !== 'admin') throw new Error('Connectez-vous avec votre numéro de téléphone.');
  // Sans l'adresse réservée, la tentative est refusée sans être comptée : personne ne peut bloquer l'espace.
  var cleEspace = String(lireReglage_('CleSuperviseur', '') || '');
  if (!cleEspace || String(espace || '') !== cleEspace) throw new Error('Espace réservé au superviseur.');
  if (!/^[0-9]{4}$/.test(pin)) throw new Error('Le code doit contenir 4 chiffres.');
  verifierBlocage_('admin');
  return connexionSuperviseur_(pin);
}

/**
 * Connexion d'un disciple : numéro de téléphone + code.
 * Le message d'erreur est le même que le numéro soit inconnu ou le code faux,
 * pour ne pas révéler qui est inscrit.
 */
function connexionTelephone(telephone, pin) {
  var tel = telephoneCamerounais_(telephone);
  pin = String(pin || '');
  if (!tel) throw new Error(MSG_TEL);
  var cle = cleTelephone_(tel);
  if (!/^[0-9]{4}$/.test(pin)) throw new Error('Le code doit contenir 4 chiffres.');
  var cleBlocage = 'tel_' + cle;
  verifierBlocage_(cleBlocage);

  var trouves = lire_(ONGLETS.DISCIPLES).filter(function(d){ return cleTelephone_(d.Telephone) === cle; });
  // Si le numéro existe plusieurs fois (ex. une ancienne demande non retenue), on prend la plus récente active
  var d = trouves.filter(function(x){ return x.Statut !== STATUTS.NON_RETENU; }).pop() || trouves.pop();
  if (!d || !d.PinHash || !verifierPin_(pin, d.PinSalt, d.PinHash)) {
    // Un compte sans code (réinitialisé avec l'ancienne version) ne s'ouvre plus avec n'importe quel code :
    // le superviseur le réinitialise à nouveau pour obtenir un code provisoire.
    enregistrerEchec_(cleBlocage);
    return { status: 'wrong_pin' };
  }
  effacerEchecs_(cleBlocage);
  return ouvrirSession_(d, 'ok');
}

function ouvrirSession_(d, statusConnexion) {
  var jeton = nouveauJeton_('d', d.Id);
  ajouterJeton_(ONGLETS.DISCIPLES, d._ligne, 'Jeton', d.Jeton, jeton);
  var res = { token: jeton, slug: String(d.Id), name: nomAffiche_(d), role: 'disciple', statut: d.Statut };
  if (d.Statut === STATUTS.CANDIDAT) res.status = 'pending';
  else if (d.Statut === STATUTS.NON_RETENU) res.status = 'not_retained';
  else if (d.Statut === STATUTS.RETIRE) res.status = 'withdrawn';
  else res.status = statusConnexion;
  return res;
}

function connexionSuperviseur_(pin) {
  var hash = String(lireReglage_('AdminPinHash', '') || '');
  var salt = String(lireReglage_('AdminPinSalt', '') || '');
  var statusConnexion = 'ok';
  if (!hash) {
    salt = Utilities.getUuid();
    ecrireReglage_('AdminPinSalt', salt);
    ecrireReglage_('AdminPinHash', hacherPin_(pin, salt));
    statusConnexion = 'created';
  } else if (!verifierPin_(pin, salt, hash)) {
    enregistrerEchec_('admin');
    return { status: 'wrong_pin' };
  }
  effacerEchecs_('admin');
  var jeton = nouveauJeton_('a', 'admin');
  var anciens = String(lireReglage_('AdminJeton', '') || '');
  ecrireReglage_('AdminJeton', fusionnerJetons_(anciens, jeton));
  return { status: statusConnexion, token: jeton, slug: 'admin', name: 'Superviseur', role: 'admin' };
}

/** Pour l'écran « en attente » : relit le statut sans redemander le code. */
function getMonStatut(token) {
  var d = sessionDisciple_(token, true);
  return { statut: d.Statut, name: nomAffiche_(d) };
}

/* =====================================================================
 * Validation des inscriptions (superviseur)
 * ===================================================================== */

function getInscriptionsEnAttente(token) {
  sessionAdmin_(token);
  return lire_(ONGLETS.DISCIPLES)
    .filter(function(d){ return d.Statut === STATUTS.CANDIDAT; })
    .map(function(d){
      return { id: String(d.Id), name: nomAffiche_(d), telephone: String(d.Telephone), date: fmtDate_(d.DateInscription) };
    });
}

/**
 * decision = 'accepter' -> Période d'essai, ou 'refuser' -> Non retenu.
 * L'essai couvre les N semaines complètes qui suivent la validation
 * (N = SemainesEssai). FinEssai = lundi où le bilan d'essai est proposé.
 */
function validerInscription(token, id, decision, motif) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  if (d.Statut !== STATUTS.CANDIDAT) throw new Error('Cette demande a déjà été traitée (statut : ' + d.Statut + ').');
  if (decision === 'accepter') {
    var fin = finEssaiDepuis_(semaineId_(0));
    changerStatut_(d, STATUTS.ESSAI, 'Superviseur', motif || 'Inscription validée, début de la période d\'essai');
    majLigne_(ONGLETS.DISCIPLES, d._ligne, { DateValidation: maintenant_(), FinEssai: "'" + fin });
    return { id: String(d.Id), name: nomAffiche_(d), statut: STATUTS.ESSAI, finEssai: fin };
  }
  changerStatut_(d, STATUTS.NON_RETENU, 'Superviseur', motif || 'Inscription non retenue');
  return { id: String(d.Id), name: nomAffiche_(d), statut: STATUTS.NON_RETENU };
}

/** Lundi qui suit les N semaines d'essai complètes après la semaine `semaineDepart`. */
function finEssaiDepuis_(semaineDepart) {
  return decalerSemaine_(semaineDepart, 1 + reglages_().semainesEssai);
}

/** Les semaines d'essai d'un disciple (identifiants des lundis), d'après FinEssai. */
function semainesEssai_(d) {
  var fin = texteSemaine_(d.FinEssai);
  if (!fin) return [];
  var n = reglages_().semainesEssai, out = [];
  for (var k = n; k >= 1; k--) out.push(decalerSemaine_(fin, -k));
  return out;
}

/* =====================================================================
 * Statuts : un seul point d'entrée, toujours journalisé
 * ===================================================================== */

function changerStatut_(d, nouveau, origine, motif) {
  var ancien = String(d.Statut || '');
  if (ancien === nouveau) return false;
  majLigne_(ONGLETS.DISCIPLES, d._ligne, { Statut: nouveau, DateDernierStatut: maintenant_() });
  journaliserStatut_(d.Id, d.Prenom, ancien, nouveau, origine, motif || '');
  d.Statut = nouveau;
  return true;
}

function journaliserStatut_(id, prenom, ancien, nouveau, origine, motif) {
  ajouterLigne_(ONGLETS.HISTORIQUE, {
    Date: maintenant_(), DiscipleId: id, Prenom: prenom,
    AncienStatut: ancien, NouveauStatut: nouveau, Origine: origine, Motif: motif
  });
}

/* =====================================================================
 * Réinitialisation du code (superviseur)
 * ===================================================================== */

/** Code provisoire à 4 chiffres, tiré au hasard. */
function codeProvisoire_() {
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 10000;
  return ('000' + n).slice(-4);
}

/**
 * Crée un code provisoire et déconnecte tous les appareils du disciple.
 * Le code est renvoyé au superviseur, qui le transmet au disciple.
 */
function resetPin(token, id) {
  sessionAdmin_(token);
  var d = trouverDisciple_(id);
  if (!d) throw new Error('Disciple introuvable.');
  var code = codeProvisoire_();
  var salt = Utilities.getUuid();
  majLigne_(ONGLETS.DISCIPLES, d._ligne, { PinHash: hacherPin_(code, salt), PinSalt: salt, Jeton: '' });
  // Le blocage après des codes faux est enregistré sous le numéro de téléphone
  effacerEchecs_('tel_' + cleTelephone_(d.Telephone));
  return { name: nomAffiche_(d), code: code };
}

/**
 * À lancer UNE fois depuis l'éditeur : crée (si besoin) la clé de l'espace superviseur
 * et affiche dans le journal d'exécution l'adresse réservée au superviseur.
 * La relancer affiche la même adresse ; pour en changer, videz la ligne CleSuperviseur
 * de l'onglet Reglages puis relancez.
 */
function adresseSuperviseur() {
  reserveProprietaire_();
  var cle = String(lireReglage_('CleSuperviseur', '') || '');
  if (!cle) {
    cle = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    ecrireReglage_('CleSuperviseur', cle);
  }
  Logger.log('Adresse de l\'espace superviseur (à garder pour vous) :\n' + ADRESSE_APP + '?espace=' + cle);
}

/** À lancer depuis l'éditeur si l'espace superviseur est bloqué après trop de codes faux. */
function debloquerSuperviseur() {
  reserveProprietaire_();
  effacerEchecs_('admin');
  Logger.log('Espace superviseur débloqué.');
}

/* =====================================================================
 * Sessions
 * ===================================================================== */

function trouverDisciple_(id) {
  var lignes = lire_(ONGLETS.DISCIPLES);
  for (var i = 0; i < lignes.length; i++) if (String(lignes[i].Id) === String(id)) return lignes[i];
  return null;
}

/**
 * Retourne le disciple lié au jeton.
 * accepterTousStatuts = false : seuls les statuts suivis (essai, actif, observation, critique)
 * peuvent remplir leur suivi.
 */
function sessionDisciple_(token, accepterTousStatuts) {
  var parts = String(token || '').split(':');
  if (parts[0] !== 'd' || parts.length < 3) throw new Error('Session expirée. Déconnectez-vous puis reconnectez-vous.');
  var d = trouverDisciple_(parts[1]);
  if (!d || String(d.Jeton || '').split(',').indexOf(String(token)) === -1) {
    throw new Error('Session expirée. Déconnectez-vous puis reconnectez-vous.');
  }
  if (!accepterTousStatuts && STATUTS_SUIVIS.indexOf(d.Statut) === -1) {
    throw new Error('Votre compte n\'est pas actif (statut : ' + d.Statut + ').');
  }
  return d;
}

function sessionAdmin_(token) {
  var jetons = String(lireReglage_('AdminJeton', '') || '').split(',');
  if (String(token || '').indexOf('a:') !== 0 || jetons.indexOf(String(token)) === -1) {
    throw new Error('Accès réservé au superviseur. Reconnectez-vous.');
  }
  return true;
}

function nouveauJeton_(prefixe, id) { return prefixe + ':' + id + ':' + Utilities.getUuid(); }

function fusionnerJetons_(anciens, nouveau) {
  var liste = String(anciens || '').split(',').filter(String);
  liste.push(nouveau);
  return liste.slice(-MAX_JETONS).join(',');
}

function ajouterJeton_(onglet, ligne, colonne, anciens, nouveau) {
  var champs = {};
  champs[colonne] = fusionnerJetons_(anciens, nouveau);
  majLigne_(onglet, ligne, champs);
}

/* =====================================================================
 * Protection contre les essais de code répétés
 *  - 5 codes faux  : blocage de 10 minutes ;
 *  - 15 codes faux : blocage de 6 heures (compté sur les 6 dernières heures).
 * Un appareil déjà connecté reste connecté pendant un blocage.
 * ===================================================================== */

function verifierBlocage_(slug) {
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('echecs6h_' + slug) || 0) >= MAX_ESSAIS_LONG) {
    throw new Error(slug === 'admin'
      ? 'Trop de codes faux : l\'espace superviseur est bloqué pendant 6 heures.'
      : 'Trop de codes faux : ce compte est bloqué pendant 6 heures. Le superviseur peut le débloquer en réinitialisant votre code.');
  }
  if (Number(cache.get('echecs_' + slug) || 0) >= MAX_ESSAIS) throw new Error('Trop d\'essais. Réessayez dans 10 minutes.');
}

function enregistrerEchec_(slug) {
  var cache = CacheService.getScriptCache();
  cache.put('echecs_' + slug, String(Number(cache.get('echecs_' + slug) || 0) + 1), BLOCAGE_SECONDES);
  cache.put('echecs6h_' + slug, String(Number(cache.get('echecs6h_' + slug) || 0) + 1), BLOCAGE_LONG_SECONDES);
}

function effacerEchecs_(slug) {
  CacheService.getScriptCache().removeAll(['echecs_' + slug, 'echecs6h_' + slug]);
}
