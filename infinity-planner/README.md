# Infinity Planner — cahier des charges

Document de référence partagé entre Mireille (porteuse du projet), son fils (développeur) et Claude.
On le met à jour à chaque décision. Les points **À DÉCIDER** sont en fin de document.

## 1. Le produit

L'agenda papier/PDF « Infinity » (≈ 200 clients, dont ~175 femmes) devient une application mobile
**payante**, publiée d'abord sur le **Google Play Store** (iOS ensuite si possible).

- Deux habillages, comme l'agenda papier : **rose** (le plus vendu, par défaut) et **bleu**.
- Langue : français.
- Ton : organisation personnelle et professionnelle, avec une touche de foi optionnelle (verset/pensée du jour).

Maquette cliquable (V1) : `maquette/index.html`, publiée ici : https://claude.ai/artifact/3LXKtNYZLmNQXDCGsZGh4c

## 2. Les écrans (reprennent les 3 pages du PDF)

| Écran | Dans le PDF | Contenu proposé dans l'appli |
|---|---|---|
| **Mois** | « Objectifs du mois » (tableau 2 col. × 5 lignes) | 5 objectifs : *Objectif* · *Première action* · *Fait ✓*, barre de progression, calendrier du mois (point = jour rempli) |
| **Semaine** | « Vue hebdomadaire » (4 col. × 7 lignes) | Une carte par jour : *Priorité* · *Rendez-vous* · *Note*, lien vers le jour |
| **Jour** | « Agenda du jour » (2 col. × 5 lignes) | Lignes *Heure* · *Activité* · *Fait ✓* (ajout de lignes illimité), + *Pensée/verset du jour* et *Merci pour…* (ajouts, à valider) |

Les en-têtes de colonnes n'étaient pas lisibles dans le PDF : ceux ci-dessus sont une proposition.

## 3. Choix technique recommandé

| Besoin | Proposition | Pourquoi |
|---|---|---|
| Appli Android (+ iOS plus tard) | **React Native + Expo**, TypeScript | Un seul code pour Android et iOS, builds Play Store via EAS, proche du web (les maquettes HTML se transposent vite) |
| Données hors ligne | SQLite local (`expo-sqlite`) | L'agenda doit marcher sans réseau |
| Comptes + synchronisation | **Supabase** (Auth + Postgres + Row Level Security) | Changer de téléphone sans perdre son agenda ; le compte Supabase de Mireille existe déjà |
| Paiement | **Google Play Billing** via **RevenueCat** (ou `react-native-iap`) | Obligatoire pour vendre du contenu numérique dans une appli Play Store ; RevenueCat gère aussi l'App Store plus tard |
| Notifications | `expo-notifications` | Rappels de rendez-vous / revue du soir |

Flutter est une alternative équivalente si le développeur la préfère : la décision lui revient.

### Modèle de données (première ébauche)

```
profiles      (id = auth.uid, prenom, skin 'rose'|'bleu', created_at)
month_goals   (id, user_id, month 'YYYY-MM', position 0-4, objective, first_action, done)
week_entries  (id, user_id, date, priority, appointment, note)
day_slots     (id, user_id, date, position, time, activity, done)
day_notes     (user_id, date, verse, gratitude)
```
Toutes les tables : RLS `user_id = auth.uid()`, champs `updated_at` pour la synchro (dernier écrit gagne).

## 4. Publication Play Store — liste de contrôle

- [ ] Compte développeur Google Play (frais uniques ~25 $) — **au nom de qui ?** (perso ou société)
- [ ] Nom de l'appli, icône, captures d'écran, texte de présentation
- [ ] Politique de confidentialité (page web publique) + formulaire « Sécurité des données »
- [ ] Nouveau compte personnel : test fermé avec ~12 testeurs pendant 14 jours avant la production (vérifier la règle en vigueur au moment de publier) — les clientes actuelles sont des testeuses idéales
- [ ] Produits/abonnements créés dans la Play Console
- [ ] Commission Google : 15 % sur le premier million de $ de revenus annuels (programme à activer)

## 5. Organisation du travail à deux

- Dépôt : `mireillembonda-coder/discipolat`, dossier `infinity-planner/`.
- Une branche par fonctionnalité, fusion par *pull request* relue par l'autre.
- Ce README fait foi : toute décision y est notée.

## 6. À DÉCIDER

1. Valider les colonnes des 3 écrans (et garder ou non verset + gratitude).
2. Modèle de vente : achat unique / abonnement mensuel / annuel / essai gratuit ? Que contient la version gratuite ?
3. Prix.
4. Choix final de la technologie (développeur).
5. Compte Play Console : personne physique ou société ?
