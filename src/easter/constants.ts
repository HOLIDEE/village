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

// Nom du calque de tiles contenant les visuels des œufs
export const EGG_VISUALS_LAYER = "EasterEggVisuals";

// Positions des œufs en coordonnées de grille (tiles) pour setTiles()
export const EGG_TILE_POSITIONS: Record<string, { tileX: number; tileY: number }> = {
    easterEggs1:  { tileX: 22,  tileY: 92  },
    easterEggs2:  { tileX: 31,  tileY: 92  },
    easterEggs3:  { tileX: 35,  tileY: 94  },
    easterEggs4:  { tileX: 44,  tileY: 99  },
    easterEggs5:  { tileX: 56,  tileY: 102 },
    easterEggs6:  { tileX: 74,  tileY: 90  },
    easterEggs7:  { tileX: 81,  tileY: 104 },
    easterEggs8:  { tileX: 95,  tileY: 99  },
    easterEggs9:  { tileX: 97,  tileY: 105 },
    easterEggs10: { tileX: 108, tileY: 94  },
    easterEggs11: { tileX: 117, tileY: 104 },
    easterEggs12: { tileX: 127, tileY: 108 },
    easterEggs13: { tileX: 147, tileY: 98  },
    easterEggs14: { tileX: 163, tileY: 107 },
    easterEggs15: { tileX: 179, tileY: 99  },
    easterEggs16: { tileX: 174, tileY: 104 },
    easterEggs17: { tileX: 163, tileY: 98  },
    easterEggs18: { tileX: 195, tileY: 94  },
    easterEggs19: { tileX: 178, tileY: 109 },
    easterEggs20: { tileX: 20,  tileY: 86  },
    easterEggs21: { tileX: 9,   tileY: 72  },
    easterEggs22: { tileX: 32,  tileY: 70  },
    easterEggs23: { tileX: 42,  tileY: 77  },
    easterEggs24: { tileX: 68,  tileY: 72  },
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
