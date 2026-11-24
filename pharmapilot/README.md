# PharmaPilot AI

**Votre pharmacie. Vos données. De meilleures décisions.**

Logiciel de business intelligence et de pilotage pour pharmaciens titulaires. Il **complète** le logiciel de
gestion d'officine (LGO) existant, sans le remplacer : analyse des ventes, optimisation des stocks,
propositions de commande et aide à la décision.

> Étape 1 — fondations de l'interface. Aucun faux service de production n'est implémenté :
> ce qui n'est pas branché est signalé dans l'interface par un badge **« À connecter »**
> et listé dans *Paramètres → Intégrations*.

## Démarrer

```bash
cd pharmapilot
npm install
cp .env.example .env.local   # facultatif : renseigner Supabase pour la connexion réelle
npm run dev
```

Sans variables Supabase, la page de connexion l'indique et seul le **mode démonstration** est accessible.

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript + build de production (`dist/`, chemins relatifs) |
| `npm run preview` | prévisualiser le build |

## Pile technique

React 18 · TypeScript · Vite · Tailwind CSS · composants shadcn/ui (Radix) · Recharts · Supabase · i18next · Inter.

## Organisation

```
src/
  components/ui/        composants shadcn/ui
  components/layout/    barre latérale, en-tête, sélecteur de pharmacie, menu utilisateur
  components/common/    KPI, états (chargement / à connecter / vide), badges
  components/charts/    graphiques Recharts (palette validée)
  contexts/             Auth (Supabase), Workspace (mode + pharmacie), Preferences (langue, devise)
  data/
    repository.ts       contrat d'accès aux données + NotConnectedError
    rules.ts            seuils métier partagés (stock bas, surstock, couverture cible)
    demo/               ⚠️ données FICTIVES générées en mémoire (mode démonstration)
    live/               accès Supabase (données réelles)
  i18n/                 français (principal) + anglais partiel
  lib/integrations.ts   registre de ce qui est opérationnel / partiel / à connecter
  pages/                une page par entrée de navigation + connexion / inscription
supabase/migrations/    schéma initial multi-officines avec RLS
```

## Démonstration vs données réelles

- **Deux dépôts distincts** : `demoRepository` (en mémoire) et `liveRepository` (Supabase). Le mode actif
  détermine le dépôt ; ils ne sont jamais combinés.
- Les identifiants démo sont préfixés `demo-` et le dépôt démo refuse tout autre identifiant.
- Le mode démo est explicite (bouton « Explorer la démonstration »), mémorisé pour l'onglet uniquement, et
  signalé par un bandeau permanent et un badge « Données fictives » sur chaque bloc concerné.
- Se connecter avec un vrai compte quitte automatiquement la démonstration.
- L'importation de fichiers est désactivée en démo.
- La pharmacie sélectionnée est mémorisée séparément pour chaque mode.

## État des fonctionnalités

| Fonctionnalité | État |
|---|---|
| Connexion / inscription (Supabase Auth) | ✅ réel |
| Mot de passe oublié | à connecter |
| Liste des pharmacies du compte (RLS) | ✅ réel — création (onboarding) à connecter |
| Sélecteur multi-officines | ✅ interface prête |
| Aperçu local des fichiers CSV | ✅ réel (aucun envoi) — import vers Supabase à connecter |
| Import Excel, connecteurs LGO | à connecter |
| Analyses ventes / stocks, alertes, propositions de commande (données réelles) | à connecter (calculs disponibles en démo) |
| Envoi des commandes aux fournisseurs | à connecter |
| Rapports PDF / Excel | à connecter |
| Assistant IA | à connecter (aucun appel à un modèle) |
| Invitations et rôles | à connecter |
| Notifications (e-mail, WhatsApp) | à connecter |
| Abonnement et facturation (dont mobile money) | à connecter — tarifs à définir |

## Internationalisation

Français par défaut (`src/i18n/locales/fr.ts`), anglais partiel avec repli automatique sur le français.
Devise par défaut **XAF** (affichée « FCFA », sans décimales). Langue et devise se changent dans
*Paramètres* et sont formatées via `Intl`.

## Base de données

`supabase/migrations/20261124000000_init_schema.sql` crée profils, pharmacies, membres (rôles par pharmacie),
produits, lignes de vente, niveaux de stock et suivi des imports, avec RLS cloisonnant chaque pharmacie.
À appliquer avec `supabase db push` sur votre projet.
