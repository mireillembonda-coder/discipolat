# Pharmacie Jireh : gestion de caisse et du personnel

Une application installable sur téléphone, comme Discipolat. Les données sont rangées dans un **Google Sheet**
qui appartient au gérant (consultable et imprimable à tout moment).

Adresse (après mise en ligne) : **https://discipolat-psi.vercel.app/pharmacie/**

## Qui peut faire quoi

| Rôle | Ce qu'il peut faire |
|---|---|
| **Gérant(e)** | Tout : bilan du mois, validation des demandes, équipe et codes, fournisseurs, journal d'activité, correction de n'importe quelle saisie |
| **Caissière principale** | Caisses du matin et du soir, **sorties** (fournisseurs, ENEO, CAMWATER, loyer…) et **entrées**, fournisseurs, résumé du jour |
| **Caissière** | Caisses du matin et du soir, **sorties** et **entrées**, résumé du jour (comme la principale, sauf la gestion de la liste des fournisseurs) |
| **Employé(e)** | Demandes de permission, congé, absence maladie, remplacement, échange de poste |

Tout le monde fait ses propres demandes et voit les absences prévues de l'équipe.
Le gérant peut changer le rôle de n'importe qui (ex. donner le rôle « Gérant(e) » à un adjoint).

10 profils sont créés au départ : Gérant(e), Caissière principale, Caissière, Employé 4 à Employé 10.
Le gérant les renomme dans **Plus › Équipe et accès** (et peut en ajouter).

## Les codes

- Chacun se connecte en touchant son nom, puis son **code à 4 chiffres**.
- Code de départ : **0000**. À la première connexion, l'application oblige à choisir un code personnel.
- **Le gérant doit se connecter en premier** pour choisir son propre code.
- Code oublié : le gérant le remet à 0000 (Plus › Équipe › le profil › Réinitialiser).
- 5 codes faux de suite : le profil est bloqué 5 minutes.
- Les codes ne sont jamais enregistrés en clair.

## Règles de saisie

- **Caisse** : date, caisse du matin ou du soir, puis :
  - **Espèces comptées dans le tiroir, fond de caisse compris** : l'application retire le **fond de caisse**
    (réglé par la gérante dans Plus › Fond de caisse, modifiable sur une caisse). Le fond reste dans le tiroir :
    il n'est ni compté dans les ventes, ni versé, ni dans aucun compte ;
  - les **sorties payées avec l'argent de la caisse** (enregistrées dans « Sorties », compte Caisse, matin ou soir)
    sont **ajoutées automatiquement** aux ventes de cette caisse, même si on les saisit après : la caisse ne paraît pas en manque ;
  - Orange Money, MTN MoMo, chèques, crédit clients ;
  - **chiffre du logiciel / ticket Z** et **tickets annulés** (ticket émis mais client parti sans payer) :
    attendu = logiciel − tickets annulés ; l'écart (manque / excédent) est calculé tout seul.
  - Le montant **à verser à la caissière principale** = les espèces du tiroir.
- Une caissière peut corriger ou supprimer **sa propre** saisie **le jour même**. Après, seul le gérant peut.
- On ne peut pas saisir une date future, ni (sauf le gérant) une date de plus de 2 jours.
- **Sorties** : catégorie, fournisseur (les 2 principaux en tête de liste), montant, mode de paiement, N° de facture / BL.
  « Versement en banque » est une sortie de caisse mais pas une dépense : le bilan le sépare.
- **Solde espèces du jour** = espèces des caisses + entrées en espèces − sorties payées en espèces.
- Tout est noté dans le **journal d'activité** (qui a saisi, modifié ou supprimé quoi, et quand).

## Comptes : où est l'argent (onglet « Comptes »)

Six comptes, avec leur solde calculé en permanence :
**Caisse (tiroir)** · **Caissière principale** · **Orange Money** · **MTN MoMo** · **Espèces chez la gérante** · **Banque**.

- Une caisse saisie alimente : les espèces → Caisse (tiroir), Orange Money → Orange Money, MTN → MTN MoMo, chèques → Banque.
  Le crédit client n'entre dans aucun compte (pas encore payé).
- Chaque **sortie** indique d'où part l'argent : une caissière paie depuis la caisse (petit fournisseur en espèces…) ;
  la principale aussi depuis sa caisse, Orange Money, MTN ou la **banque** (chèque / virement : Ubipharm, Laborex, gardien,
  comptable, impôts, gros salaires).
- **Versement caissière → caissière principale** : la caissière déclare le montant, la principale **confirme ce qu'elle a reçu**
  (l'écart éventuel est noté).
- **Retrait Orange Money / MTN** (déstockage) par la principale, avec les frais (comptés comme dépense).
- **Versement à la gérante** : la principale envoie, **la gérante confirme** la réception.
- **Dépôt en banque / retrait à la banque** : la gérante.
- **Contrôler** (sur chaque compte) : on compte l'argent réel ou on lit le solde Orange Money → l'écart s'affiche et est gardé.
- **Rapprochement bancaire** (gérante) : cocher ce qui est passé sur le relevé ; l'application calcule ce que le relevé
  devrait afficher (solde − chèques pas encore passés + …) et l'écart.
- **Soldes de départ** (gérante) : l'argent présent dans chaque compte au 1er décembre.

Qui voit quoi : la caissière voit la Caisse ; la principale voit Caisse, sa caisse, Orange Money et MTN ;
la gérante voit tout, dont la banque.

## Demandes

1. L'employé choisit le type, les dates, le moment (journée, matin, soir, garde de nuit, quelques heures),
   le remplaçant éventuel et le motif.
2. S'il a choisi un remplaçant, **le remplaçant accepte d'abord** (il voit la demande sur son accueil).
3. Le gérant **accepte ou refuse** (avec un commentaire s'il veut).
4. Une fois acceptée, l'absence apparaît pour toute l'équipe dans « Absences prévues ».

## Fournisseurs

Plus › Fournisseurs › **Coller une liste** : collez les ~20 noms d'un coup (un par ligne), puis touchez les 2
fournisseurs principaux pour cocher « Fournisseur principal ». On peut aussi en ajouter un au moment d'une sortie.

---

## Installation du serveur (une seule fois, environ 10 minutes)

1. Sur le compte Google de la pharmacie, créez un **Google Sheet** vide nommé « Pharmacie Jireh — Gestion ».
2. Dans ce Sheet : menu **Extensions › Apps Script**.
3. Dans l'éditeur :
   - remplacez tout le contenu de `Code.gs` par le contenu de [`apps-script/Serveur.gs`](apps-script/Serveur.gs) ;
   - bouton **+** › Script, nommez-le `Logique`, et collez-y le contenu de [`apps-script/Logique.gs`](apps-script/Logique.gs) ;
   - (facultatif) Paramètres du projet › Fuseau horaire : **(GMT+01:00) Douala**.
4. En haut, choisissez la fonction **installer** puis **Exécuter**. Acceptez les autorisations
   (« Paramètres avancés › Accéder au projet »). Les onglets et les 10 profils apparaissent dans le Sheet.
5. **Déployer › Nouveau déploiement** › type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Copiez l'adresse qui finit par **/exec** et envoyez-la : elle va dans [`config.js`](config.js).

Tant que `config.js` est vide, l'application tourne en **mode essai** : bandeau orange, données gardées
seulement dans le téléphone. Pratique pour découvrir, mais rien n'est partagé entre les employés.

Pour essayer une adresse de serveur sur un téléphone sans toucher `config.js` :
`…/pharmacie/?serveur=ADRESSE_EXEC` (mémorisé sur ce téléphone).

### Mettre à jour le serveur plus tard

Recollez les fichiers, puis **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version › Déployer**
(l'adresse /exec reste la même).

## Pour le développeur

- `logique.js` : toutes les règles (droits, calculs, validations). Sert au serveur **et** au mode essai.
  `apps-script/Logique.gs` doit en rester une **copie exacte** (`cp logique.js apps-script/Logique.gs`).
- `apps-script/Serveur.gs` : lecture/écriture du Google Sheet (un onglet par table), verrou d'écriture, `doPost`.
- `app.js` / `app.css` / `index.html` : l'interface.
- Les listes (catégories de sorties, modes de paiement, types de demande…) sont en haut de `logique.js`.
