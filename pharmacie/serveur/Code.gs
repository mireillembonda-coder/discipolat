/**
 * Pharmacie — serveur (Google Apps Script lié à un Google Sheets).
 *
 * Installation : voir pharmacie/README.md, partie « Installer le serveur ».
 * Toutes les données sont dans les onglets du Google Sheets :
 *   Personnel, Caisse, Demandes, Presences, Journal (tout ce qui a été fait, par qui), Sessions, Parametres.
 *
 * L'application (pharmacie/index.html) envoie des requêtes POST au format JSON :
 *   { action: "…", jeton: "…", …paramètres }
 * et reçoit { ok: true, … } ou { ok: false, erreur: "message lisible" }.
 */

var FEUILLES = {
  Personnel: ['id', 'nom', 'poste', 'role', 'telephone', 'pin', 'actif', 'cree_le'],
  Caisse: ['id', 'date', 'type', 'montant', 'caissiere_id', 'destinataire_id', 'categorie', 'description',
           'fournisseur', 'mode', 'statut', 'montant_recu', 'saisi_par', 'saisi_le', 'confirme_par',
           'confirme_le', 'note'],
  Demandes: ['id', 'personne_id', 'type', 'date_debut', 'date_fin', 'heure_debut', 'heure_fin', 'motif',
             'statut', 'saisi_par', 'saisi_le', 'decide_par', 'decide_le', 'reponse'],
  Presences: ['id', 'date', 'personne_id', 'type', 'heure_arrivee', 'minutes', 'justifie', 'motif',
              'statut', 'saisi_par', 'saisi_le', 'note'],
  Journal: ['quand', 'qui', 'action', 'details'],
  Sessions: ['jeton', 'personne_id', 'cree_le'],
  Parametres: ['cle', 'valeur']
};

var NOMBRES = { montant: true, montant_recu: true, minutes: true };
var HEURES = { heure_debut: true, heure_fin: true, heure_arrivee: true };

var ROLES = ['proprietaire', 'principale', 'caissiere', 'employe'];
var TYPES_CAISSE = ['recette', 'versement_principale', 'versement_patronne', 'depense', 'achat', 'sortie', 'apport'];
var DUREE_SESSION_JOURS = 120;

/* ------------------------------------------------------------------ entrée */

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return repondre({ ok: false, erreur: 'Requête illisible.' });
  }
  try {
    return repondre(traiter(req));
  } catch (err) {
    return repondre({ ok: false, erreur: err && err.lisible ? err.message : 'Erreur du serveur : ' + err });
  }
}

function doGet() {
  return repondre({ ok: true, message: 'Serveur de la pharmacie en marche.' });
}

function repondre(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function erreur(message) {
  var e = new Error(message);
  e.lisible = true;
  return e;
}

var ACTIONS_PUBLIQUES = { etat: true, installer: true, connexion: true };
var ACTIONS_ECRITURE = {
  installer: true, connexion: true, deconnexion: true, caisse_ajouter: true, caisse_confirmer: true,
  annuler: true, demande_ajouter: true, demande_decider: true, presence_ajouter: true,
  personnel_enregistrer: true, pin_changer: true, parametres: true
};

function traiter(req) {
  var action = String(req.action || '');
  if (!ACTIONS[action]) throw erreur('Action inconnue : ' + action);
  var moi = null;
  if (!ACTIONS_PUBLIQUES[action]) moi = utilisateur(req.jeton);
  if (!ACTIONS_ECRITURE[action]) return ACTIONS[action](req, moi);
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    return ACTIONS[action](req, moi);
  } finally {
    verrou.releaseLock();
  }
}

/* --------------------------------------------------------------- actions */

var ACTIONS = {

  etat: function () {
    var personnes = lire('Personnel').filter(function (p) { return est(p.actif); });
    return {
      ok: true,
      installe: personnes.length > 0,
      pharmacie: parametre('pharmacie') || 'Pharmacie',
      personnel: personnes.map(function (p) { return { id: p.id, nom: p.nom, poste: p.poste }; })
    };
  },

  installer: function (req) {
    preparerFeuilles();
    if (lire('Personnel').length) throw erreur('La pharmacie est déjà installée. Connectez-vous.');
    var nom = texte(req.nom, 'votre nom');
    verifierPin(req.pin);
    var p = {
      id: nouvelId(), nom: nom, poste: 'Propriétaire', role: 'proprietaire', telephone: '',
      pin: hacher(req.pin), actif: 'oui', cree_le: maintenant()
    };
    ajouter('Personnel', p);
    ecrireParametre('pharmacie', String(req.pharmacie || 'Pharmacie').trim() || 'Pharmacie');
    journal(nom, 'installation', 'Création du compte propriétaire');
    return { ok: true, jeton: ouvrirSession(p.id) };
  },

  connexion: function (req) {
    var p = trouver('Personnel', req.personne_id);
    if (!p || !est(p.actif)) throw erreur('Personne inconnue.');
    var cache = CacheService.getScriptCache();
    var cle = 'essais_' + p.id;
    var essais = Number(cache.get(cle) || 0);
    if (essais >= 5) throw erreur('Trop d\'essais. Réessayez dans 15 minutes ou demandez un nouveau code à la propriétaire.');
    if (hacher(req.pin) !== p.pin) {
      cache.put(cle, String(essais + 1), 900);
      throw erreur('Code incorrect.');
    }
    cache.remove(cle);
    journal(p.nom, 'connexion', '');
    return { ok: true, jeton: ouvrirSession(p.id) };
  },

  deconnexion: function (req) {
    supprimerLigne('Sessions', req.jeton);
    return { ok: true };
  },

  donnees: function (req, moi) {
    var r = moi.role;
    var voitTout = r === 'proprietaire';
    var gereCaisse = r === 'proprietaire' || r === 'principale';
    var personnel = lire('Personnel').map(function (p) {
      return { id: p.id, nom: p.nom, poste: p.poste, role: p.role, telephone: p.telephone, actif: est(p.actif) };
    });
    // La propriétaire et la caissière principale voient toutes les caisses ;
    // une caissière ne voit que la sienne ; les autres employés n'ont pas accès à la caisse.
    var caisse = [];
    if (r !== 'employe') {
      caisse = lire('Caisse').filter(function (c) {
        return gereCaisse || c.caissiere_id === moi.id || c.destinataire_id === moi.id;
      });
    }
    var demandes = lire('Demandes').filter(function (d) { return gereCaisse || d.personne_id === moi.id; });
    var presences = lire('Presences').filter(function (x) { return gereCaisse || x.personne_id === moi.id; });
    return {
      ok: true,
      moi: { id: moi.id, nom: moi.nom, poste: moi.poste, role: moi.role },
      pharmacie: parametre('pharmacie') || 'Pharmacie',
      lien_tableur: voitTout ? SpreadsheetApp.getActive().getUrl() : '',
      personnel: personnel,
      caisse: caisse,
      demandes: demandes,
      presences: presences
    };
  },

  caisse_ajouter: function (req, moi) {
    var e = req.element || {};
    if (e.id && trouver('Caisse', e.id)) return { ok: true, deja: true };
    var type = String(e.type || '');
    if (TYPES_CAISSE.indexOf(type) < 0) throw erreur('Type d\'opération inconnu.');
    if (moi.role === 'employe') throw erreur('Vous n\'avez pas accès à la caisse.');
    var montant = Math.round(Number(e.montant));
    if (!(montant > 0)) throw erreur('Le montant doit être supérieur à 0.');
    var date = dateValide(e.date);

    // À qui appartient la caisse concernée.
    var caissiere = moi.id;
    if (e.caissiere_id && e.caissiere_id !== moi.id) {
      if (moi.role !== 'proprietaire' && moi.role !== 'principale') {
        throw erreur('Vous ne pouvez saisir que pour votre propre caisse.');
      }
      caissiere = e.caissiere_id;
    }
    var personneCaisse = trouver('Personnel', caissiere);
    if (!personneCaisse) throw erreur('Caissière inconnue.');

    var statut = 'enregistre';
    var destinataire = '';
    if (type === 'versement_principale') {
      destinataire = String(e.destinataire_id || '');
      var dest = trouver('Personnel', destinataire);
      if (!dest || dest.role !== 'principale') throw erreur('Choisissez la caissière principale qui reçoit l\'argent.');
      if (destinataire === caissiere) throw erreur('La caissière principale ne se verse pas à elle-même.');
      statut = 'en_attente';
    }
    if (type === 'versement_patronne') {
      if (personneCaisse.role !== 'principale') throw erreur('Seule la caissière principale reverse l\'argent à la propriétaire.');
      var patronne = lire('Personnel').filter(function (p) { return p.role === 'proprietaire' && est(p.actif); })[0];
      if (!patronne) throw erreur('Aucune propriétaire enregistrée.');
      if (caissiere === patronne.id) throw erreur('La propriétaire ne se verse pas à elle-même.');
      destinataire = patronne.id;
      statut = 'en_attente';
    }
    if ((type === 'depense' || type === 'achat' || type === 'sortie') && !String(e.description || '').trim()) {
      throw erreur('Indiquez ce qui a été payé (description).');
    }

    var ligne = {
      id: e.id || nouvelId(), date: date, type: type, montant: montant, caissiere_id: caissiere,
      destinataire_id: destinataire, categorie: String(e.categorie || ''), description: String(e.description || '').trim(),
      fournisseur: String(e.fournisseur || '').trim(), mode: String(e.mode || 'especes'), statut: statut,
      montant_recu: '', saisi_par: moi.id, saisi_le: maintenant(), confirme_par: '', confirme_le: '', note: ''
    };
    ajouter('Caisse', ligne);
    journal(moi.nom, 'caisse : ' + type, montantTexte(montant) + ' — caisse de ' + personneCaisse.nom +
      (ligne.description ? ' — ' + ligne.description : ''));
    return { ok: true, element: ligne };
  },

  caisse_confirmer: function (req, moi) {
    var c = trouver('Caisse', req.id);
    if (!c) throw erreur('Versement introuvable.');
    if (c.destinataire_id !== moi.id) throw erreur('Seule la personne qui reçoit l\'argent peut confirmer.');
    if (c.statut !== 'en_attente' && c.statut !== 'conteste') throw erreur('Ce versement est déjà traité.');
    var decision = req.decision === 'conteste' ? 'conteste' : 'confirme';
    var recu = req.montant_recu === '' || req.montant_recu == null ? Number(c.montant) : Math.round(Number(req.montant_recu));
    if (!(recu >= 0)) throw erreur('Montant reçu invalide.');
    modifier('Caisse', c.id, {
      statut: decision, montant_recu: recu, confirme_par: moi.id, confirme_le: maintenant(),
      note: String(req.note || '').trim()
    });
    var ecart = recu - Number(c.montant);
    journal(moi.nom, decision === 'confirme' ? 'versement reçu' : 'versement contesté',
      'Annoncé ' + montantTexte(c.montant) + ', reçu ' + montantTexte(recu) + (ecart ? ' (écart ' + montantTexte(ecart) + ')' : ''));
    return { ok: true };
  },

  annuler: function (req, moi) {
    var feuille = { caisse: 'Caisse', demande: 'Demandes', presence: 'Presences' }[req.quoi];
    if (!feuille) throw erreur('Élément inconnu.');
    var x = trouver(feuille, req.id);
    if (!x) throw erreur('Élément introuvable.');
    if (x.statut === 'annule') return { ok: true };
    var motif = String(req.motif || '').trim();
    if (!motif) throw erreur('Indiquez pourquoi vous annulez.');
    var proprietaire = moi.role === 'proprietaire';
    if (!proprietaire) {
      if (x.saisi_par !== moi.id) throw erreur('Seule la propriétaire peut annuler ce que d\'autres ont saisi.');
      if (feuille === 'Caisse' && x.statut === 'confirme') throw erreur('Ce versement est déjà confirmé : demandez à la propriétaire.');
      if (feuille === 'Demandes' && x.statut !== 'en_attente') throw erreur('Cette demande a déjà reçu une réponse : demandez à la propriétaire.');
    }
    var champ = feuille === 'Demandes' ? 'reponse' : 'note';
    var maj = { statut: 'annule' };
    maj[champ] = 'Annulé par ' + moi.nom + ' : ' + motif;
    modifier(feuille, x.id, maj);
    journal(moi.nom, 'annulation (' + req.quoi + ')', motif + ' — ' + JSON.stringify(x));
    return { ok: true };
  },

  demande_ajouter: function (req, moi) {
    var e = req.element || {};
    if (e.id && trouver('Demandes', e.id)) return { ok: true, deja: true };
    var type = e.type === 'permission' ? 'permission' : 'conge';
    var pour = moi.id;
    if (e.personne_id && e.personne_id !== moi.id) {
      if (moi.role !== 'proprietaire') throw erreur('Chacun fait ses propres demandes.');
      pour = e.personne_id;
    }
    var personne = trouver('Personnel', pour);
    if (!personne) throw erreur('Personne inconnue.');
    var debut = dateValide(e.date_debut);
    var fin = type === 'conge' ? dateValide(e.date_fin || e.date_debut) : debut;
    if (fin < debut) throw erreur('La date de fin est avant la date de début.');
    var ligne = {
      id: e.id || nouvelId(), personne_id: pour, type: type, date_debut: debut, date_fin: fin,
      heure_debut: heureValide(e.heure_debut), heure_fin: heureValide(e.heure_fin),
      motif: String(e.motif || '').trim(), statut: 'en_attente', saisi_par: moi.id, saisi_le: maintenant(),
      decide_par: '', decide_le: '', reponse: ''
    };
    ajouter('Demandes', ligne);
    journal(moi.nom, 'demande de ' + (type === 'conge' ? 'congé' : 'permission'),
      personne.nom + ' : ' + debut + (fin !== debut ? ' → ' + fin : '') + (ligne.motif ? ' — ' + ligne.motif : ''));
    return { ok: true, element: ligne };
  },

  demande_decider: function (req, moi) {
    if (moi.role !== 'proprietaire') throw erreur('Seule la propriétaire répond aux demandes.');
    var d = trouver('Demandes', req.id);
    if (!d) throw erreur('Demande introuvable.');
    var decision = req.decision === 'refusee' ? 'refusee' : 'accordee';
    modifier('Demandes', d.id, {
      statut: decision, decide_par: moi.id, decide_le: maintenant(), reponse: String(req.reponse || '').trim()
    });
    var p = trouver('Personnel', d.personne_id);
    journal(moi.nom, 'demande ' + decision, (p ? p.nom : '') + ' : ' + d.type + ' du ' + d.date_debut);
    return { ok: true };
  },

  presence_ajouter: function (req, moi) {
    if (moi.role !== 'proprietaire' && moi.role !== 'principale') {
      throw erreur('Seules la propriétaire et la caissière principale notent les retards et absences.');
    }
    var e = req.element || {};
    if (e.id && trouver('Presences', e.id)) return { ok: true, deja: true };
    var p = trouver('Personnel', e.personne_id);
    if (!p) throw erreur('Choisissez la personne.');
    var type = e.type === 'absence' ? 'absence' : 'retard';
    var ligne = {
      id: e.id || nouvelId(), date: dateValide(e.date), personne_id: p.id, type: type,
      heure_arrivee: type === 'retard' ? heureValide(e.heure_arrivee) : '',
      minutes: type === 'retard' ? Math.max(0, Math.round(Number(e.minutes) || 0)) : '',
      justifie: e.justifie === 'oui' ? 'oui' : 'non', motif: String(e.motif || '').trim(),
      statut: 'enregistre', saisi_par: moi.id, saisi_le: maintenant(), note: ''
    };
    ajouter('Presences', ligne);
    journal(moi.nom, type, p.nom + ' le ' + ligne.date + (type === 'retard' ? ' (' + ligne.minutes + ' min)' : '') +
      (ligne.justifie === 'oui' ? ' — justifié' : ' — non justifié'));
    return { ok: true, element: ligne };
  },

  personnel_enregistrer: function (req, moi) {
    if (moi.role !== 'proprietaire') throw erreur('Seule la propriétaire gère le personnel.');
    var e = req.element || {};
    var nom = texte(e.nom, 'le nom');
    var role = ROLES.indexOf(e.role) >= 0 ? e.role : 'employe';
    var existant = e.id ? trouver('Personnel', e.id) : null;
    if (existant) {
      if (existant.id === moi.id && (role !== 'proprietaire' || e.actif === false)) {
        throw erreur('Vous ne pouvez pas retirer votre propre accès de propriétaire.');
      }
      var maj = { nom: nom, poste: String(e.poste || ''), role: role, telephone: String(e.telephone || ''), actif: e.actif === false ? 'non' : 'oui' };
      if (e.pin) { verifierPin(e.pin); maj.pin = hacher(e.pin); }
      modifier('Personnel', existant.id, maj);
      if (maj.actif === 'non' || e.pin) fermerSessions(existant.id);
      journal(moi.nom, 'fiche modifiée', nom + (e.pin ? ' (nouveau code)' : '') + (maj.actif === 'non' ? ' (accès retiré)' : ''));
      return { ok: true };
    }
    verifierPin(e.pin);
    var p = {
      id: nouvelId(), nom: nom, poste: String(e.poste || ''), role: role, telephone: String(e.telephone || ''),
      pin: hacher(e.pin), actif: 'oui', cree_le: maintenant()
    };
    ajouter('Personnel', p);
    journal(moi.nom, 'employé ajouté', nom + ' (' + role + ')');
    return { ok: true };
  },

  pin_changer: function (req, moi) {
    if (hacher(req.ancien) !== moi.pin) throw erreur('L\'ancien code est incorrect.');
    verifierPin(req.nouveau);
    modifier('Personnel', moi.id, { pin: hacher(req.nouveau) });
    journal(moi.nom, 'code changé', '');
    return { ok: true };
  },

  parametres: function (req, moi) {
    if (moi.role !== 'proprietaire') throw erreur('Réservé à la propriétaire.');
    if (req.pharmacie != null) ecrireParametre('pharmacie', String(req.pharmacie).trim() || 'Pharmacie');
    return { ok: true };
  }
};

/* ------------------------------------------------------- sessions, codes */

function utilisateur(jeton) {
  if (!jeton) throw erreur('SESSION');
  var s = trouver('Sessions', jeton, 'jeton');
  if (!s) throw erreur('SESSION');
  var age = (new Date() - new Date(s.cree_le)) / 86400000;
  var p = trouver('Personnel', s.personne_id);
  if (!p || !est(p.actif) || age > DUREE_SESSION_JOURS) throw erreur('SESSION');
  return p;
}

function ouvrirSession(personneId) {
  var jeton = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  ajouter('Sessions', { jeton: jeton, personne_id: personneId, cree_le: maintenant() });
  return jeton;
}

function fermerSessions(personneId) {
  var f = feuille('Sessions');
  var valeurs = f.getDataRange().getValues();
  for (var i = valeurs.length - 1; i >= 1; i--) {
    if (String(valeurs[i][1]) === personneId) f.deleteRow(i + 1);
  }
}

function verifierPin(pin) {
  if (!/^\d{4,6}$/.test(String(pin || ''))) throw erreur('Le code doit avoir 4 à 6 chiffres.');
}

function hacher(pin) {
  var props = PropertiesService.getScriptProperties();
  var sel = props.getProperty('sel');
  if (!sel) { sel = Utilities.getUuid(); props.setProperty('sel', sel); }
  var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sel + ':' + String(pin || ''), Utilities.Charset.UTF_8);
  return octets.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* ----------------------------------------------------------- le tableur */

function preparerFeuilles() {
  Object.keys(FEUILLES).forEach(function (nom) { feuille(nom); });
}

function feuille(nom) {
  var ss = SpreadsheetApp.getActive();
  var f = ss.getSheetByName(nom);
  if (!f) {
    f = ss.insertSheet(nom);
    var cols = FEUILLES[nom];
    f.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    f.setFrozenRows(1);
  }
  return f;
}

function lire(nom) {
  var cols = FEUILLES[nom];
  var valeurs = feuille(nom).getDataRange().getValues();
  var tz = Session.getScriptTimeZone();
  var res = [];
  for (var i = 1; i < valeurs.length; i++) {
    var ligne = valeurs[i];
    if (ligne[0] === '' || ligne[0] == null) continue;
    var o = {};
    for (var j = 0; j < cols.length; j++) {
      var v = ligne[j];
      var c = cols[j];
      if (v instanceof Date) {
        if (HEURES[c]) v = Utilities.formatDate(v, tz, 'HH:mm');
        else if (/_le$/.test(c) || c === 'quand') v = v.toISOString();
        else v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      } else if (NOMBRES[c]) {
        v = v === '' || v == null ? '' : Number(v);
      } else {
        v = v == null ? '' : String(v);
      }
      o[c] = v;
    }
    res.push(o);
  }
  return res;
}

function versLigne(nom, o) {
  return FEUILLES[nom].map(function (c) {
    var v = o[c];
    if (v == null) return '';
    if (NOMBRES[c]) return v === '' ? '' : Number(v);
    v = String(v);
    // Empêche le tableur de transformer dates, heures et numéros en autre chose.
    return /^[\d\s\-:+.\/]+$/.test(v) ? "'" + v : v;
  });
}

function ajouter(nom, o) {
  feuille(nom).appendRow(versLigne(nom, o));
}

function trouver(nom, id, colonne) {
  if (!id) return null;
  var tout = lire(nom);
  var c = colonne || 'id';
  for (var i = 0; i < tout.length; i++) if (tout[i][c] === String(id)) return tout[i];
  return null;
}

function numeroLigne(nom, id) {
  var col = feuille(nom).getRange(1, 1, Math.max(1, feuille(nom).getLastRow()), 1).getValues();
  for (var i = 1; i < col.length; i++) if (String(col[i][0]) === String(id)) return i + 1;
  return -1;
}

function modifier(nom, id, changements) {
  var n = numeroLigne(nom, id);
  if (n < 0) throw erreur('Élément introuvable.');
  var actuel = trouver(nom, id);
  Object.keys(changements).forEach(function (k) { actuel[k] = changements[k]; });
  var cols = FEUILLES[nom];
  feuille(nom).getRange(n, 1, 1, cols.length).setValues([versLigne(nom, actuel)]);
}

function supprimerLigne(nom, id) {
  var n = numeroLigne(nom, id);
  if (n > 0) feuille(nom).deleteRow(n);
}

function parametre(cle) {
  var p = trouver('Parametres', cle, 'cle');
  return p ? p.valeur : '';
}

function ecrireParametre(cle, valeur) {
  var n = numeroLigne('Parametres', cle);
  if (n > 0) feuille('Parametres').getRange(n, 2).setValue(valeur);
  else ajouter('Parametres', { cle: cle, valeur: valeur });
}

function journal(qui, action, details) {
  ajouter('Journal', { quand: maintenant(), qui: qui, action: action, details: details });
}

/* ---------------------------------------------------------------- outils */

function nouvelId() { return Utilities.getUuid(); }
function maintenant() { return new Date().toISOString(); }
function est(v) { return v === true || v === 'oui'; }

function texte(v, quoi) {
  var t = String(v || '').trim();
  if (!t) throw erreur('Indiquez ' + quoi + '.');
  return t;
}

function dateValide(v) {
  var t = String(v || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw erreur('Date invalide.');
  return t;
}

function heureValide(v) {
  var t = String(v || '');
  return /^\d{2}:\d{2}$/.test(t) ? t : '';
}

function montantTexte(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}
