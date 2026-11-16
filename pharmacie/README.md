# Pharmacie : gestion du personnel et des caisses

Application installable sur téléphone (comme Infinity Planner et le Skin Analyzer), reliée à un
**Google Sheets** qui garde toutes les données. Chaque employé a son accès (son nom et un code de 4 à 6 chiffres).

## Ce que fait l'application (version 0.1)

### Les caisses (montants en FCFA)
- **Recette du jour** : chaque caissière note ce qu'elle a encaissé.
- **Versement à la caissière principale** : la caissière l'annonce, puis la caissière principale **confirme** quand
  elle a compté l'argent. Si le montant reçu est différent, elle saisit le vrai montant et **l'écart** est enregistré.
  Elle peut aussi **contester** (argent pas reçu).
- **Versement à la propriétaire** : la caissière principale reverse, puis la propriétaire confirme de la même façon.
- **Dépenses** (avec catégorie), **achats** (fournisseur), **sorties d'argent** et **entrées d'argent** (fond de caisse).
  On précise comment c'est payé : seules les dépenses payées en espèces sortent de la caisse.
- Calculs automatiques :
  - **reste à verser** pour chaque caissière (recettes − dépenses en espèces − argent remis) ;
  - **argent en main** pour la caissière principale ;
  - **argent reçu** par la propriétaire (semaine, mois) et **ce qui est en route** (annoncé, pas encore confirmé) ;
  - **bilan** par période (aujourd'hui, semaine, mois, mois dernier, tout), par caisse et par type ;
  - **liste des écarts** sur les versements.
- Téléchargement des opérations en fichier tableur (CSV, ouvrable dans Excel).

### Le personnel
- Fiche de chaque employé (nom, rôle, poste, téléphone) et code de connexion donné par la propriétaire.
- **Demandes de congé** (du… au…) et **de permission** (une date, avec ou sans heures) faites par l'employé lui-même ;
  la propriétaire **accorde ou refuse** avec un message. Elle est prévenue si quelqu'un d'autre est déjà absent ces jours-là.
- **Retards** (heure d'arrivée, minutes) et **absences**, justifiés ou non, notés par la propriétaire ou la caissière principale.
- Totaux par personne : retards et absences du mois, jours de congé et permissions de l'année.
- « L'équipe aujourd'hui » : qui est en congé, en permission, absent ou en retard.

### Qui voit quoi
| Rôle | Peut faire |
|---|---|
| **Propriétaire** | Tout : toutes les caisses, confirme les versements de la caissière principale, répond aux demandes, gère le personnel et les codes, peut tout annuler. |
| **Caissière principale** | Toutes les caisses, confirme les versements des caissières, reverse à la propriétaire, note dépenses/achats, retards et absences. Voit les demandes de tout le monde (sans pouvoir y répondre). Fait ses propres demandes. |
| **Caissière** | Sa caisse seulement (recette, versements, dépenses). Ses demandes et son dossier. |
| **Employé(e)** | Ses demandes de congé/permission et son dossier (retards, absences). |

### Traçabilité
- **Rien n'est effacé** : une erreur s'**annule** avec un motif obligatoire ; l'élément reste visible, barré.
- Chaque saisie garde **qui** l'a faite et **quand** ; chaque confirmation garde qui a confirmé et quand.
- L'onglet **Journal** du Google Sheets liste toutes les actions (connexions, saisies, confirmations, annulations…).
- Sans internet, les saisies restent sur le téléphone (« ⏳ à envoyer ») et partent toutes seules au retour du réseau.

## Installer le serveur (à faire une seule fois, par la propriétaire, ~10 minutes)

1. Sur ordinateur, créer un **nouveau Google Sheets** (par ex. « Pharmacie — données »).
2. Menu **Extensions → Apps Script**. Effacer le contenu de `Code.gs`, puis y coller tout le fichier
   [`serveur/Code.gs`](serveur/Code.gs). Enregistrer (icône disquette).
3. Bouton **Déployer → Nouveau déploiement**. Roue dentée → **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   Cliquer **Déployer**, autoriser l'accès à votre compte Google (« Paramètres avancés → Accéder au projet »).
4. Copier l'**URL de l'application Web** (elle se termine par `/exec`).
5. Ouvrir l'application de la pharmacie sur le téléphone, coller cette adresse quand elle la demande,
   puis **créer le compte de la propriétaire** (nom de la pharmacie, votre nom, votre code).
   → Pour que les employés n'aient rien à coller, envoyer l'URL à Claude : elle sera inscrite dans `js/config.js`.
6. Onglet **Personnel → + Ajouter** : ajouter les 7 employés, avec leur rôle et un code pour chacun.
7. Onglet **Plus → Envoyer l'application aux employés** : chacun ouvre le lien, ajoute l'icône à l'écran
   d'accueil, choisit son nom et tape son code.

Après une modification de `Code.gs` : **Déployer → Gérer les déploiements → crayon → Version : Nouvelle version → Déployer**
(l'adresse reste la même).

Sécurité : les codes ne sont pas stockés en clair (empreinte SHA-256 salée) ; 5 codes faux bloquent la personne
15 minutes ; la propriétaire peut retirer l'accès d'un employé qui part (ses sessions sont fermées).
Le Google Sheets reste privé : seule la propriétaire l'ouvre, les employés passent par l'application.

## Fichiers
- `index.html`, `css/app.css`, `js/app.js` (écrans), `js/api.js` (serveur + file d'envoi hors ligne),
  `js/config.js` (adresse du serveur), `sw.js` (ouverture hors ligne), `manifest.webmanifest`, `icons/`.
- `serveur/Code.gs` : le serveur Apps Script (onglets Personnel, Caisse, Demandes, Presences, Journal, Sessions, Parametres).
- `outils/serveur-local.js` : pour tester sans Google (`node pharmacie/outils/serveur-local.js`, puis
  ouvrir `http://localhost:8080/?serveur=/api`).

## À décider / idées pour la suite
- Salaires, avances sur salaire et retenues pour retards/absences.
- Nombre de jours de congé par an et solde restant.
- Photo du reçu pour les dépenses et achats.
- Heure d'arrivée prévue pour calculer les minutes de retard automatiquement.
- Recette séparée espèces / mobile money.
