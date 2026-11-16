// Communication avec le serveur (Google Apps Script).
// - L'adresse du serveur vient de js/config.js, ou d'un lien « …/pharmacie/?serveur=ADRESSE » (gardée sur le téléphone).
// - Les saisies (recettes, versements, demandes…) passent par une file d'envoi : si internet coupe,
//   elles restent sur le téléphone et partent dès que la connexion revient.
var API = (function () {
  var CLE = { serveur: 'pharmacie_serveur', jeton: 'pharmacie_jeton', donnees: 'pharmacie_donnees', envois: 'pharmacie_envois' };

  function lireLocal(cle, defaut) {
    try { var v = localStorage.getItem(cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
  }
  function ecrireLocal(cle, v) {
    try { if (v == null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {}
  }

  (function lienServeur() {
    var m = /[?&]serveur=([^&#]+)/.exec(location.search);
    if (m) {
      ecrireLocal(CLE.serveur, decodeURIComponent(m[1]));
      history.replaceState(null, '', location.pathname);
    }
  })();

  function serveur() { return lireLocal(CLE.serveur, '') || window.PHARMACIE_SERVEUR || ''; }

  function ErreurServeur(message) { this.message = message; this.serveur = true; }
  ErreurServeur.prototype = Object.create(Error.prototype);

  // Envoi direct (connexion, gestion du personnel…) : échoue s'il n'y a pas internet.
  function appel(action, params) {
    var corps = Object.assign({}, params || {}, { action: action, jeton: lireLocal(CLE.jeton, '') });
    // Pas d'en-tête Content-Type : Apps Script accepte alors la requête sans vérification préalable (CORS).
    return fetch(serveur(), { method: 'POST', body: JSON.stringify(corps), redirect: 'follow' })
      .then(function (r) {
        if (!r.ok) throw new Error('Le serveur ne répond pas (' + r.status + ').');
        return r.json();
      })
      .then(function (rep) {
        if (!rep.ok) {
          if (rep.erreur === 'SESSION') { ecrireLocal(CLE.jeton, null); document.dispatchEvent(new Event('session-expiree')); }
          throw new ErreurServeur(rep.erreur === 'SESSION' ? 'Veuillez vous reconnecter.' : rep.erreur);
        }
        return rep;
      });
  }

  /* ---- file d'envoi ---- */
  var enCours = false;
  function envois() { return lireLocal(CLE.envois, []); }

  function mettreEnFile(action, params) {
    var file = envois();
    file.push({ action: action, params: params, le: new Date().toISOString() });
    ecrireLocal(CLE.envois, file);
    return vider();
  }

  // Envoie les saisies en attente, dans l'ordre. Résout avec { envoyes, erreurs:[…], restants }.
  function vider() {
    if (enCours) return Promise.resolve({ envoyes: 0, erreurs: [], restants: envois().length });
    enCours = true;
    var bilan = { envoyes: 0, erreurs: [], restants: 0 };
    function suivant() {
      var file = envois();
      if (!file.length) return Promise.resolve();
      var item = file[0];
      return appel(item.action, item.params).then(function () {
        bilan.envoyes++;
        ecrireLocal(CLE.envois, envois().slice(1));
        return suivant();
      }, function (err) {
        if (err && err.serveur) {
          // Refusé par le serveur : on le retire de la file et on prévient.
          bilan.erreurs.push(err.message);
          ecrireLocal(CLE.envois, envois().slice(1));
          return suivant();
        }
        // Pas de réseau : on garde tout pour plus tard.
      });
    }
    return suivant().then(function () {
      enCours = false;
      bilan.restants = envois().length;
      return bilan;
    });
  }

  return {
    serveur: serveur,
    changerServeur: function (u) { ecrireLocal(CLE.serveur, u || null); },
    jeton: function () { return lireLocal(CLE.jeton, ''); },
    garderJeton: function (j) { ecrireLocal(CLE.jeton, j || null); },
    appel: appel,
    mettreEnFile: mettreEnFile,
    vider: vider,
    envois: envois,
    donneesLocales: function () { return lireLocal(CLE.donnees, null); },
    garderDonnees: function (d) { ecrireLocal(CLE.donnees, d); },
    oublier: function () { ecrireLocal(CLE.jeton, null); ecrireLocal(CLE.donnees, null); ecrireLocal(CLE.envois, null); }
  };
})();
