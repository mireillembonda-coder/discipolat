# PharmaPilot AI

> Votre pharmacie. Vos données. De meilleures décisions.

Logiciel de business intelligence et de pilotage pour pharmaciens titulaires. Il **complète** le logiciel de gestion d'officine (LGO) existant sans le remplacer : analyse des ventes, optimisation des stocks, propositions de commandes, aide à la décision.

**État : fondations de l'interface (étape 1).** Aucun faux service de production n'est implémenté. Ce qui n'est pas branché est signalé dans l'interface par le badge **« À connecter »**.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Shadcn UI (Radix) · Recharts · Supabase · i18next · police Inter

## Démarrer

```bash
cd pharmapilot
npm install
cp .env.example .env        # optionnel : renseigner Supabase
npm run dev                 # http://localhost:5173
npm run build               # vérification des types + build de production
```

Sans variables Supabase, l'application fonctionne en **mode démonstration** uniquement ; connexion et inscription affichent un avertissement.

### Supabase

Projet **pharmapilot** (région Paris, eu-west-3), déjà configuré dans `.env.production` (URL + clé publiable, conçue pour être publique ; la sécurité repose sur les politiques RLS). Ne jamais y mettre la clé secrète.

Migrations appliquées :
1. `20261124000000_init.sql` — profils, organisations, adhésions, officines, journal d'imports, politiques RLS, trigger d'inscription.
2. `20261124000100_harden.sql` — fonctions sensibles déplacées dans un schéma privé `app_private`, politiques réservées aux utilisateurs connectés, index.

Vérifié : contrôle de sécurité Supabase sans avertissement ; un utilisateur ne voit que sa propre officine ; un visiteur non connecté ne voit rien.

À régler dans le tableau de bord Supabase (Authentication → URL Configuration) : **Site URL** = adresse publique de l'application, sinon le lien de confirmation d'e-mail renvoie vers `localhost`.

### Déploiement

`vercel.json` gère les routes de l'application monopage. Sur Vercel, définir le dossier racine du projet sur `pharmapilot`.

## Routes

| Route | Contenu |
|---|---|
| `/login`, `/signup` | Connexion, inscription (Supabase Auth) |
| `/demo/*` | Mode démonstration : données fictives, sans compte |
| `/app/*` | Espace réel : authentification obligatoire |

Pages des deux espaces : `overview`, `sales`, `stock`, `orders`, `alerts`, `reports`, `assistant`, `import`, `users`, `settings`, `subscription`.

## Séparation démonstration / données réelles

- Deux implémentations distinctes du contrat `DataSource` (`src/data/types.ts`) :
  - `src/data/demo/demoSource.ts` : données **fictives** générées en mémoire, de façon déterministe ; jamais écrites en base. Identifiants préfixés `demo-`, officines suffixées « (démo) », grossistes « (fictif) », e-mails en `.invalid`.
  - `src/data/supabase/liveSource.ts` : Supabase. Les méthodes non branchées lèvent `NotConnectedError` → l'interface affiche « À connecter », **jamais** de données inventées.
- Préfixes de route distincts (`/demo` et `/app`), fournisseur de contexte remonté à chaque changement de mode, clé de stockage local distincte pour l'officine sélectionnée, filtre de garde sur `isDemo`.
- En démo : bandeau permanent, badge « Données fictives » sur chaque page, imports et enregistrements désactivés.

## Ce qui est opérationnel

- Interface complète, responsive (ordinateur, tablette, smartphone), navigation et sélecteur d'officine (prêt pour le multi-officines).
- Mode démonstration sur toutes les pages.
- Authentification Supabase (connexion, inscription, déconnexion, session) et liste des officines de l'utilisateur — dès que Supabase est configuré.
- Internationalisation : français (langue principale) ; anglais partiel avec repli automatique sur le français. Devise par défaut XAF (`Intl.NumberFormat`).
- Aperçu local d'un fichier CSV dans la page d'importation (lu dans le navigateur, rien n'est envoyé).

## Reste à connecter

La liste de référence est `src/config/features.ts` (affichée aussi dans **Paramètres → État des intégrations**).

| Module | Reste à faire |
|---|---|
| Vue d'ensemble / Ventes | Tables ventes alimentées par l'import, agrégats quotidiens, marges, comparaison N-1 |
| Stocks | État du stock à date, couverture, péremptions par lot |
| Commandes | Moteur de propositions, catalogue grossistes, transmission au LGO / grossiste |
| Alertes | Règles d'alertes, notifications e-mail / push |
| Rapports | Génération PDF / Excel, archivage, envoi programmé |
| Assistant IA | Fonction serveur (Edge Function) appelant le modèle, accès contrôlé aux données, historique |
| Importation | Stockage (Supabase Storage), mappage des colonnes par LGO, traitement, lecture Excel |
| Utilisateurs | Lecture des membres, invitations, gestion des rôles |
| Paramètres | Enregistrement des paramètres et seuils par officine |
| Abonnement | Grille tarifaire définitive (actuelle : indicative), paiement (carte, mobile money), facturation |
| Auth | Mot de passe oublié, ajout d'officine depuis l'interface |
| Design | Mode sombre (couleurs de graphiques à valider sur fond sombre) |
