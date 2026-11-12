// Contenu fixe de l'Infinity Planner (textes repris du planner papier).
window.IP = window.IP || {};

IP.DOMAINES = [
  { k: 'spi', t: 'Ma Vie Spirituelle', d: 'Ma relation avec Dieu, mon engagement au sein de la communauté religieuse' },
  { k: 'qdv', t: 'Ma Qualité de Vie', d: 'Mon bien-être et état physique, moral, émotionnel et mon intégration sociale' },
  { k: 'fam', t: 'Mes Relations Familiales', d: 'Mes interactions avec ma famille proche et élargie' },
  { k: 'amo', t: 'Ma Vie Amoureuse', d: 'Mon équilibre émotionnel et mes interactions avec mon partenaire' },
  { k: 'pro', t: 'Mon Épanouissement Professionnel', d: 'Mon développement de carrière et ma satisfaction au travail' },
  { k: 'dev', t: 'Mon Développement Personnel', d: "L'acquisition de nouvelles connaissances, le développement de compétences et l'expression de mes talents" },
  { k: 'fin', t: 'Mes Finances', d: "Ma gestion financière et mes relations avec l'argent" },
  { k: 'prj', t: 'Mes Projets Personnels', d: "Mes initiatives d'entrepreneuriat, mes voyages, mes acquisitions et mes événements spéciaux" }
];

IP.PARCOURS = [
  { k: 'spi', t: 'Spirituel' }, { k: 'dev', t: 'Développement personnel' }, { k: 'rel', t: 'Relations' },
  { k: 'car', t: 'Carrière / Entreprise' }, { k: 'fin', t: 'Finances' }, { k: 'san', t: 'Santé' }
];

// Les questions les plus importantes de la vie (étape 2).
// ⚠️ Le texte de la question 7 n'a pas encore été recopié depuis le planner.
IP.QUESTIONS = [
  "Que voudrais-je vivre dans la vie si le temps et l'argent n'étaient pas un problème ?",
  "Qu'est-ce que je veux apporter à ce monde ?",
  "Qui suis-je ? Pourquoi suis-je ici ?",
  "Où vais-je ? Comment veux-je qu'on se souvienne de moi quand je ne serai plus là ?",
  "Si j'atteignais tous les objectifs de ma vie, que ressentirais-je ? Comment puis-je ressentir cela en cours de route ?",
  "Qu'est-ce qui est le plus important dans ma vie ? Qu'est-ce qui me valorise le plus ? Qu'est-ce qui me passionne le plus ?",
  "Question 7 (texte à recopier depuis le planner)",
  "À quoi ressemble une vie réussie pour moi ?",
  "Qu'est-ce que les autres admirent le plus chez moi ? Quel cadeau unique je veux partager avec le monde ? Quelles sont mes 5 valeurs principales ? Si ce n'est pas le cas, demandez maintenant à cinq personnes qui vous connaissent bien.",
  "Quelles sont mes 10 plus grandes réalisations dans la vie ?"
];

// L'itinéraire d'utilisation : les 8 étapes de la boucle.
IP.ETAPES = [
  { n: 1, t: 'Mon bilan de l\'année', s: 'Reconnaître ses succès et erreurs' },
  { n: 2, t: 'Conscience et découverte de soi', s: 'Comprendre ses valeurs et se redéfinir' },
  { n: 3, t: 'Énoncez votre mission et votre vision', s: 'Reprendre le contrôle de ses aspirations' },
  { n: 4, t: 'Fixez-vous de grands objectifs', s: 'Programmez votre esprit pour réussir' },
  { n: 5, t: 'Tableau de vision et déclaration de vie', s: "Fixez des priorités, créez l'harmonie à tous les niveaux" },
  { n: 6, t: 'Élaborez une stratégie claire', s: 'Laissez tomber votre ancienne histoire et créez-en une nouvelle' },
  { n: 7, t: "Passer à l'action", s: 'Visualisation quotidienne, bonnes habitudes, plan hebdomadaire' },
  { n: 8, t: 'Récompensez et célébrez-vous', s: 'Sentez-vous bien et manifestez rapidement' }
];

IP.POURQUOI = [
  ['Libération du passé', "L'Infinity Planner vous permet de vous détacher des limitations passées. En vous concentrant sur vos objectifs pour cette année, vous ouvrez la voie à de nouvelles opportunités."],
  ['Vision à long terme', 'Avec des sections dédiées aux objectifs, cet agenda vous aide à définir une vision claire pour l\'année. Engagez-vous dans des efforts significatifs qui résonnent avec vos aspirations personnelles.'],
  ['Flexibilité et tactique', "L'Infinity Planner offre un cadre flexible pour la gestion de vos tâches. Adaptez votre planification mensuelle et hebdomadaire selon vos priorités, tout en gardant une vue d'ensemble sur vos objectifs à long terme."],
  ['Gestion du temps efficace', 'En évaluant le temps dont vous disposez chaque jour et chaque semaine, vous pouvez planifier des événements et des activités qui vous rapprochent de vos objectifs.'],
  ['Visualisation du succès', 'Cet agenda vous encourage à visualiser vos principaux objectifs. En mémorisant vos aspirations, vous renforcez votre motivation et augmentez vos chances de réussite tout au long de l\'année.']
];

IP.HABITUDES = [['priere', 'Prière'], ['meditation', 'Méditation'], ['exercice', 'Exercice'], ['gratitude', 'Gratitude']];
IP.CARNET = [['idees', 'Idées'], ['gratitude', 'Gratitude'], ['victoires', 'Victoires'], ['notes', 'Notes'], ['organigramme', 'Organigramme du projet'], ['rappels', 'Rappels']];
IP.TRACKER = [['fin', 'Finances'], ['sante', 'Santé'], ['social', 'Social'], ['dev', 'Dev perso']];

IP.QUESTIONS_MOIS = [
  "Quelles sont les plus grandes perspectives que j'ai acquises au cours du mois dernier ?",
  "Comment me sens-je par rapport à mes progrès ce mois-ci ? Comment suis-je resté(e) dans le flux, en appréciant le voyage, quel qu'en soit le résultat ?",
  'Quels obstacles ou peurs ai-je rencontrés en moi-même ?',
  "Qu'ai-je appris en observant ma vibration émotionnelle au quotidien ? Quelle était l'émotion négative la plus courante ? Comment ai-je accepté, lâché prise et monté sur l'échelle émotionnelle ?",
  "Ai-je pleinement apprécié ce que je faisais ce mois-ci ? Étais-je vraiment « ici » ou simplement présent(e) ? Comment puis-je être plus présent(e) ?"
];

// Citations du planner (une par semaine, une par mois).
IP.CITATIONS = [
  ['La discipline est le pont entre les objectifs et les résultats.', 'Jim Rohn'],
  ["Grandir, c'est accepter une responsabilité plus grande que celle d'hier.", 'Paul Mbonda'],
  ["J'attire à moi ce à quoi je porte mon attention, mon énergie et ma concentration, que ce soit positif ou négatif.", 'Michael Losier'],
  ['Si quelque chose est suffisamment important, vous devez le faire même si les chances ne sont pas en votre faveur.', 'Elon Musk'],
  ["On ne mesure pas la réussite à ce qu'on a accompli, mais aux obstacles qu'on a surmontés.", 'Booker T. Washington'],
  ['Nous sommes tous responsables de toutes nos expériences.', 'Louise Hay'],
  ["Le bonheur n'est pas une destination. C'est un mode de vie.", 'Burton Hills'],
  ["Tout ce que vous créez dans votre vie, vous devez d'abord le créer dans votre imagination.", 'Tycho Photiou'],
  ["Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", 'Sénèque'],
  ["Nos plus grandes faiblesses résident dans l'abandon. La façon la plus sûre de réussir est toujours d'essayer une fois de plus.", 'Thomas Edison'],
  ["Soyez reconnaissant pour ce que vous avez, vous finirez par en avoir plus. Si vous vous concentrez sur ce que vous n'avez pas, vous n'en aurez jamais assez.", 'Oprah Winfrey'],
  ["Les personnes qui ont des objectifs clairs et écrits accomplissent bien plus en moins de temps que celles qui n'en ont pas ne pourraient jamais l'imaginer.", 'Brian Tracy'],
  ["On ne peut pas revenir en arrière et changer le début, mais on peut commencer là où on est et changer la fin.", 'C.S. Lewis'],
  ['Vous êtes la seule personne qui crée votre réalité.', 'Rhonda Byrne'],
  ["Faire de son mieux n'est pas suffisant. Il faut savoir quoi faire, puis faire de son mieux.", 'W. Edwards Deming'],
  ["L'homme, seul, a le pouvoir de transformer ses pensées en réalité physique ; l'homme, seul, peut rêver et réaliser ses rêves.", 'Napoleon Hill'],
  ['Des questions de qualité créent une vie de qualité. Les personnes qui réussissent posent de meilleures questions et, par conséquent, obtiennent de meilleures réponses.', 'Tony Robbins'],
  ["Tout le monde visualise, qu'il le sache ou non. La visualisation est le grand secret de la réussite.", 'Geneviève Behrend'],
  ['La volonté de gagner ne signifie rien sans la volonté de se préparer.', 'Juma Ikangaa'],
  ["Je peux accepter l'échec, tout le monde échoue à quelque chose. Mais je ne peux pas accepter de ne pas essayer.", 'Michael Jordan'],
  ["J'ai décidé d'être heureux, car c'est bon pour ma santé.", 'Voltaire'],
  ["Une pensée positive est 100 fois plus puissante qu'une pensée négative.", 'Rhonda Byrne']
];
IP.CITATIONS_MOIS = [
  ["Une vie productive commence par des priorités clairement posées, avant que la journée ne s'impose à vous.", 'Juliana Ondo'],
  ["L'efficacité, c'est faire les choses correctement ; l'efficience, c'est faire les bonnes choses.", 'Peter Drucker'],
  ['La chose la plus importante est de garder la chose la plus importante comme la chose la plus importante.', 'Stephen R. Covey'],
  ["Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", 'Winston Churchill'],
  ["Vous n'avez pas besoin de voir tout l'escalier, commencez juste par la première marche.", 'Martin Luther King Jr.'],
  ['Chérissez vos visions et vos rêves, car ils sont les enfants de votre âme, les plans de vos plus grandes réussites.', 'Napoleon Hill']
];
IP.CITATION_BILAN = ['Plus vous louez et célébrez votre vie, plus il y a de choses à célébrer dans la vie.', 'Oprah Winfrey'];
