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

// Données visuelles des œufs : index de tuile dans Easter.png et positions (en pixels)
// x/y = coin haut-gauche (y Tiled converti : y_tiled - 32)
export const EGG_VISUALS: Record<string, { tileIndex: number; x: number; y: number }> = {
    easterEggs1:  { tileIndex: 0,   x: 704,    y: 2962   },
    easterEggs2:  { tileIndex: 1,   x: 1005,   y: 2962   },
    easterEggs3:  { tileIndex: 2,   x: 1127.7, y: 3024.6 },
    easterEggs4:  { tileIndex: 3,   x: 1436.7, y: 3182   },
    easterEggs5:  { tileIndex: 4,   x: 1814.7, y: 3266.7 },
    easterEggs6:  { tileIndex: 5,   x: 2399.3, y: 2887.3 },
    easterEggs7:  { tileIndex: 6,   x: 2613.3, y: 3328   },
    easterEggs8:  { tileIndex: 7,   x: 3046.7, y: 3178.7 },
    easterEggs9:  { tileIndex: 156, x: 3118,   y: 3377.3 },
    easterEggs10: { tileIndex: 8,   x: 3478.7, y: 3012.7 },
    easterEggs11: { tileIndex: 62,  x: 3748,   y: 3342.7 },
    easterEggs12: { tileIndex: 63,  x: 4066.7, y: 3466.7 },
    easterEggs13: { tileIndex: 64,  x: 4715.3, y: 3148.7 },
    easterEggs14: { tileIndex: 65,  x: 5247.3, y: 3439.3 },
    easterEggs15: { tileIndex: 66,  x: 5746.7, y: 3179.3 },
    easterEggs16: { tileIndex: 68,  x: 5594.7, y: 3331.3 },
    easterEggs17: { tileIndex: 69,  x: 5219.3, y: 3136.7 },
    easterEggs18: { tileIndex: 68,  x: 6267.3, y: 3029.3 },
    easterEggs19: { tileIndex: 69,  x: 5719.3, y: 3499.3 },
    easterEggs20: { tileIndex: 70,  x: 667.3,  y: 2753.3 },
    easterEggs21: { tileIndex: 71,  x: 289.3,  y: 2307.3 },
    easterEggs22: { tileIndex: 155, x: 1028,   y: 2268.7 },
    easterEggs23: { tileIndex: 73,  x: 1366.7, y: 2474   },
    easterEggs24: { tileIndex: 0,   x: 2195.3, y: 2332   },
};

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
