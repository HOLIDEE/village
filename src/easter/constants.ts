// ====================================================
// CONFIGURATION DE LA CHASSE AUX ŒUFS DE PÂQUES
// Modifie les valeurs ci-dessous pour personnaliser !
// ====================================================

// Nombre total d'œufs cachés sur la carte
// IMPORTANT : Ce nombre doit correspondre au nombre de zones
// "easterEgg1", "easterEgg2", etc. créées dans Tiled
export const TOTAL_EGGS = 30;

// Nombre de pièges (œufs cassés)
// Doit correspondre aux zones "easterTrap1", "easterTrap2"... dans Tiled
export const TOTAL_TRAPS = 7;

// Durée de la maladie en secondes
export const TRAP_DURATION = 15;

// Nom du calque d'objets (détection script : onEnter quand on marche dessus)
export const EGGS_LAYER = "EasterEggs";
// Nom du calque de tuiles (images visibles des œufs)
export const EGGS_VISUAL_LAYER = "EasterEggVisuals";

// Messages affichés quand le joueur trouve un œuf
export const EGG_FOUND_MESSAGES = [
    "Bravo ! Un œuf de plus dans ton panier ! 🥚",
    "Bien joué ! Tu as l'œil ! 🐣",
    "Excellent ! Continue comme ça ! 🐰",
    "Super trouvaille ! 🌷",
    "Magnifique ! Tu es un vrai chasseur d'œufs ! 🎉",
    "Incroyable ! Encore un de trouvé ! 🥚",
    "Quel flair ! Tu te rapproches du but ! 🐣",
    "Fantastique ! Les lapins sont impressionnés ! 🐰",
    "Génial ! Ton panier se remplit ! 🌸",
    "Wahou ! Presque tous trouvés ! 🎊",
];

// Message de bienvenue dans la popup d'instructions
export const WELCOME_TITLE = "🐰 Chasse aux Œufs de Pâques ! 🥚";
export const WELCOME_MESSAGE = "Des œufs sont cachés partout sur la carte ! Explore chaque recoin pour les retrouver. Marche dessus pour les collecter. Bonne chasse !";

// Message de victoire
export const VICTORY_TITLE = "🎉 Félicitations ! 🎉";
export const VICTORY_MESSAGE = "Tu as trouvé tous les œufs de Pâques ! Tu es le champion de la chasse aux œufs !";

// Zones de téléportation anti-triche dans le labyrinthe
// Nombre de zones "easterTeleport1", "easterTeleport2"... dans Tiled
export const TOTAL_TELEPORTS = 2; // ← Change ce nombre quand tu ajoutes des zones dans Tiled
// Coordonnées du point de départ (en pixels Tiled)
export const TELEPORT_START_X = 2722;
export const TELEPORT_START_Y = 2782;

// Délai entre les indices (en millisecondes) - 4 minutes
export const CLUE_TIMEOUT = 240000;

// Indices optionnels (affichés périodiquement, ordre aléatoire non répétitif)
export const CLUES = [
    "🌳 Indice : As-tu regardé dans les arbres et buissons ?",
    "💧 Indice : Certains œufs aiment se cacher près de l'eau...",
    "🏠 Indice : N'oublie pas d'explorer l'intérieur des bâtiments !",
    "🗺️ Indice : Les coins et recoins de la carte réservent des surprises !",
    "🔍 Indice : Les derniers œufs sont souvent les mieux cachés...",
    "🐰 Indice : Le lapin de Pâques a une préférence pour les endroits fleuris !",
    "🌸 Indice : Regarde bien autour des zones décorées !",
    "🏡 Indice : Certains œufs se cachent sous les toits et dans les recoins des maisons.",
    "🌿 Indice : La végétation est une excellente cachette pour les œufs !",
    "🎪 Indice : As-tu pensé à explorer la place centrale ?",
    "🛤️ Indice : Longe bien les chemins, des œufs sur chaque bordure !",
    "🌄 Indice : Les zones en hauteur cachent parfois de belles surprises !",
    "🎨 Indice : Cherche près des décorations colorées !",
    "🧱 Indice : Les murs et les clôtures sont de bons endroits pour chercher !",
    "🌻 Indice : Les jardins regorgent peut-être d'œufs bien dissimulés !",
    "🎯 Indice : Tu as fait tout le tour de la carte ? Alors recommence, tu en as sûrement raté !",
    "🦔 Indice : Même les petits coins sombres peuvent cacher un œuf !",
    "🚪 Indice : As-tu vérifié derrière chaque porte et entrée ?",
    "🌙 Indice : Certains emplacements sont difficiles à voir au premier coup d'œil !",
    "🏆 Indice : Les chasseurs persévérants finissent toujours par trouver tous les œufs !",
    "🎶 Indice : Explore sans te presser, les œufs ne courent pas... enfin normalement !",
    "🐣 Indice : Un poussin vient d'éclore près d'un œuf non trouvé, cherche bien !",
    "🌈 Indice : Suis les couleurs de la carte, elles te mèneront peut-être aux œufs !",
    "🏕️ Indice : Les zones moins fréquentées sont idéales pour cacher des œufs !",
    "🎁 Indice : Traite chaque zone comme un cadeau à ouvrir, explore tout !",
];
