// ====================================================
// CONFIGURATION DE LA CHASSE AUX ŒUFS DE PÂQUES
// Modifie les valeurs ci-dessous pour personnaliser !
// ====================================================

// Nombre total d'œufs cachés sur la carte
// IMPORTANT : Ce nombre doit correspondre au nombre de zones
// "easterEgg1", "easterEgg2", etc. créées dans Tiled
export const TOTAL_EGGS = 24;

// Nombre de pièges (œufs cassés)
// Doit correspondre aux zones "easterTrap1", "easterTrap2"... dans Tiled
export const TOTAL_TRAPS = 2;

// Durée de la maladie en secondes
export const TRAP_DURATION = 15;

// Nom du layer Tiled qui contient les images d'œufs (calque d'objets, initialement caché)
export const EGGS_LAYER = "EasterEggs";

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

// Délai entre les indices (en millisecondes) - 60 secondes
export const CLUE_TIMEOUT = 60000;

// Indices optionnels (affichés périodiquement)
export const CLUES = [
    "Indice : As-tu regardé près des arbres ? 🌳",
    "Indice : Certains œufs aiment se cacher près de l'eau... 💧",
    "Indice : N'oublie pas d'explorer les bâtiments ! 🏠",
    "Indice : Regarde bien dans les coins de la carte ! 🗺️",
    "Indice : Les derniers œufs sont souvent les mieux cachés ! 🔍",
];
