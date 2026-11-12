# Infinity Planner — cahier des charges

Document de référence partagé entre Mireille (porteuse du projet), son fils (développeur) et Claude.
On le met à jour à chaque décision. Les points **À DÉCIDER** sont en fin de document.

## 1. Le produit

L'agenda papier/PDF « Infinity » (≈ 200 clients, dont ~175 femmes) devient une application mobile
**payante**, publiée d'abord sur le **Google Play Store** (iOS ensuite si possible).

- Deux habillages, comme l'agenda papier : **rose** (le plus vendu, par défaut) et **bleu**.
- Langue : français.
- Ton : organisation personnelle et professionnelle, avec une touche de foi optionnelle (verset/pensée du jour).

## État actuel — version 0.2 (application web installable)

Méthode de travail : Mireille et Claude construisent l'application **en application web installable (PWA)**,
comme le Skin Analyzer ; le développeur relit ensuite et prépare la publication Play Store
(une PWA se publie via une *Trusted Web Activity*, par ex. avec Bubblewrap ou PWABuilder).

La v0.2 reprend la structure du **vrai planner** (INFINITY Planner 2027, Part 1 et Part 2) :

- **Parcours** (la boucle ∞ et ses 8 étapes, avec checklist de progression) :
  1. Bilan de l'année (8 domaines de vie + réalisations, défis, leçons, gratitude, à améliorer)
  2. Conscience et découverte de soi (10 questions, minuteur 90 s)
  3. Mission et vision (déclaration de vie, déclaration de mission, « Je suis si reconnaissant(e) que… »)
  4. Grands objectifs (Mon parcours ; fixation par domaine ; notation **Cœur · Levier · Échéance** /30 ;
     top 5 automatique ; liste « À éviter à tout prix » ; récompenses ; affirmations ; distractions)
  5. Vision board (photos + citations, stockées dans IndexedDB) + relecture de la déclaration de vie
  6. Stratégie (compétences, habitudes, entourage, partenaires de responsabilité)
  7. Passer à l'action (liens vers mois / semaine / jour)
  8. Récompensez et célébrez-vous (récompenses + réalisations de l'année rassemblées)
- **Mois** : objectifs (intention de bien-être, compétences/habitudes, 3 objectifs avec pourquoi /
  récompense / 4 tâches, actions) · calendrier + Idées/Gratitude/Victoires/Notes/Organigramme/Rappels ·
  « Évaluez votre mois » (10 réalisations, tracker 0-10, 5 grandes questions…) · finances perso et pro.
- **Semaine** : citation, top priorité, objectifs, **grille 7 jours × 6h-22h en colonnes verticales**
  (option horizontales), tâches principales, créateur d'habitudes (prière, méditation, exercice, gratitude).
- **Jour** : verset du jour (LSG 1910) ou pensée, top priorité de la semaine, heures 6h-22h, merci, notes.
- **Commande vocale** (bouton micro, `js/voice.js`, Web Speech API `fr-FR`, nécessite internet) :
  dictée dans la case active, ou ajout rapide « demain à 15 h dentiste » rangé au bon jour / à la bonne heure
  (sans heure → notes du jour), avec « Annuler ». Sans support navigateur : conseil d'utiliser le micro du clavier.
- Réglages : prénom, rose/bleu, verset, colonnes, monnaie, « Cet agenda appartient à », sauvegarde
  (JSON avec les photos), effacement.

Fichiers : `index.html`, `css/app.css`, `js/` (`data.js` textes du planner, `store.js` données,
`ui.js` outils, `parcours.js` les 8 étapes, `agenda.js` mois/semaine/jour, `app.js` navigation),
`sw.js` (hors ligne), `vendor/fonts/` (Spectral, Great Vibes, Nunito Sans — licence OFL).
Données : `localStorage` clé `infinity-planner-v1` (format v2, migration automatique depuis la v0.1).

**Textes encore à recopier depuis le planner** : question 7 de l'étape 2, étape 3 de l'énoncé de
mission, la page sur la signification de la boucle, les pages 20 et 226-230, le libellé exact de la
dernière ligne du bilan (« …ioration pour l'année »).

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

1. ~~Colonnes validées, verset gardé.~~
2. Modèle de vente : achat unique / abonnement mensuel / annuel / essai gratuit ? Que contient la version gratuite ?
3. Prix.
4. Choix final de la technologie (développeur).
5. Compte Play Console : personne physique ou société ?
