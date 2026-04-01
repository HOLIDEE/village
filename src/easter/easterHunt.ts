/// <reference types="@workadventure/iframe-api-typings" />

import {
    TOTAL_EGGS,
    EGGS_VISUAL_LAYER,
    EGG_FOUND_MESSAGES,
    CLUE_TIMEOUT,
    CLUES,
    TOTAL_TRAPS,
    TRAP_DURATION,
    TOTAL_TELEPORTS,
    TELEPORT_START_X,
    TELEPORT_START_Y,
} from "./constants";

console.info("Easter: module loaded");

// Noms des zones d'œufs : easterEggs1, easterEggs2, ...
const easterEggAreas: string[] = [];
for (let i = 1; i <= TOTAL_EGGS; i++) {
    easterEggAreas.push(`easterEggs${i}`);
}

// Noms des pièges : easterTrap1, easterTrap2, ...
const easterTrapAreas: string[] = [];
for (let i = 1; i <= TOTAL_TRAPS; i++) {
    easterTrapAreas.push(`easterTrap${i}`);
}

// Noms des zones de téléportation : easterTeleport1, easterTeleport2, ...
const easterTeleportAreas: string[] = [];
for (let i = 1; i <= TOTAL_TELEPORTS; i++) {
    easterTeleportAreas.push(`easterTeleport${i}`);
}

// Progression du joueur
interface EasterProgress {
    [key: string]: boolean;
}

function buildDefaultProgress(): EasterProgress {
    const progress: EasterProgress = {};
    for (let i = 1; i <= TOTAL_EGGS; i++) {
        progress[`easterEggs${i}`] = false;
    }
    return progress;
}

let timeoutClue: ReturnType<typeof setTimeout> | undefined;
let timeoutClueRegularly: ReturnType<typeof setInterval> | undefined;
let huntStarted = false;
let huntPaused = false; // true quand l'admin a désactivé la chasse
let isSick = false; // true quand le joueur est "malade" (piège)

// Positions des tuiles visuelles sur EasterEggVisuals (chargées depuis le TMJ)
let eggVisualTiles: { x: number; y: number }[] = [];

async function loadEggVisualTilePositions() {
    try {
        const mapUrl = WA.room.mapURL;
        const resp = await fetch(mapUrl);
        const map = await resp.json();
        const layer = map.layers?.find((l: any) => l.name === EGGS_VISUAL_LAYER && l.type === "tilelayer");
        if (!layer?.data) {
            // Chercher dans les groupes de calques
            for (const group of map.layers ?? []) {
                if (group.type === "group" && group.layers) {
                    const sub = group.layers.find((l: any) => l.name === EGGS_VISUAL_LAYER && l.type === "tilelayer");
                    if (sub?.data) {
                        const width = sub.width || map.width;
                        for (let i = 0; i < sub.data.length; i++) {
                            if (sub.data[i] !== 0) {
                                eggVisualTiles.push({ x: i % width, y: Math.floor(i / width) });
                            }
                        }
                        console.info("Easter: loaded", eggVisualTiles.length, "visual tile positions (from group)");
                        return;
                    }
                }
            }
            console.warn("Easter: EasterEggVisuals layer not found in TMJ");
            return;
        }
        const width = layer.width || map.width;
        for (let i = 0; i < layer.data.length; i++) {
            if (layer.data[i] !== 0) {
                eggVisualTiles.push({ x: i % width, y: Math.floor(i / width) });
            }
        }
        console.info("Easter: loaded", eggVisualTiles.length, "visual tile positions");
    } catch (e) {
        console.warn("Easter: loadEggVisualTilePositions failed", e);
    }
}

function getFoundCount(progress: EasterProgress): number {
    return Object.values(progress).filter(Boolean).length;
}

function getRandomMessage(): string {
    return EGG_FOUND_MESSAGES[Math.floor(Math.random() * EGG_FOUND_MESSAGES.length)];
}

// Supprimer la zone de détection d'un œuf (local au joueur)
async function deleteArea(areaName: string) {
    try {
        await WA.room.area.delete(areaName);
    } catch (e) {
        console.warn("Easter: deleteArea error", areaName, e);
    }
}

// Effacer la tuile visuelle d'un œuf quand le joueur marche dessus
async function hideEggVisualAtPlayer(areaName: string) {
    try {
        const pos = await WA.player.getPosition();
        const playerTX = Math.floor(pos.x / 32);
        const playerTY = Math.floor(pos.y / 32);

        // Trouver la tuile la plus proche du joueur
        let closest: { x: number; y: number } | null = null;
        let minDist = Infinity;
        for (const t of eggVisualTiles) {
            const dx = t.x - playerTX;
            const dy = t.y - playerTY;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                closest = t;
            }
        }

        if (closest && minDist <= 9) { // dans un rayon de ~3 tuiles
            WA.room.setTiles([{ x: closest.x, y: closest.y, tile: null, layer: EGGS_VISUAL_LAYER }]);
            // Retirer de la liste pour ne pas la re-matcher
            eggVisualTiles = eggVisualTiles.filter(t => t !== closest);
            // Sauvegarder la position pour le resume
            const stored = (WA.player.state.easterEggTilePositions as Record<string, { x: number; y: number }>) ?? {};
            stored[areaName] = { x: closest.x, y: closest.y };
            WA.player.state.easterEggTilePositions = { ...stored };
            console.info("Easter: cleared visual tile for", areaName, "at", closest.x, closest.y);
        } else {
            console.warn("Easter: no visual tile found near player for", areaName, "dist=", minDist);
        }
    } catch (e) {
        console.warn("Easter: hideEggVisualAtPlayer error", areaName, e);
    }
}

// Restaurer les tuiles effacées au resume (œufs déjà trouvés)
function hideFoundEggVisuals() {
    try {
        const stored = (WA.player.state.easterEggTilePositions as Record<string, { x: number; y: number }>) ?? {};
        const tilesToClear: { x: number; y: number; tile: null; layer: string }[] = [];
        for (const [_name, pos] of Object.entries(stored)) {
            tilesToClear.push({ x: pos.x, y: pos.y, tile: null, layer: EGGS_VISUAL_LAYER });
            // Aussi retirer de eggVisualTiles pour ne pas les re-matcher
            eggVisualTiles = eggVisualTiles.filter(t => t.x !== pos.x || t.y !== pos.y);
        }
        if (tilesToClear.length > 0) {
            WA.room.setTiles(tilesToClear);
            console.info("Easter: restored", tilesToClear.length, "cleared tiles on resume");
        }
    } catch (e) {
        console.warn("Easter: hideFoundEggVisuals error", e);
    }
}

function hideFoundEggs(progress: EasterProgress) {
    for (const [areaName, found] of Object.entries(progress)) {
        if (found) deleteArea(areaName);
    }
    hideFoundEggVisuals();
}

// Cacher les pièges déjà déclenchés
function hideTriggeredTraps() {
    try {
        const triggered = (WA.player.state.easterTrapsTriggered as string[]) ?? [];
        for (const trapName of triggered) {
            deleteArea(trapName);
        }
        // Aussi effacer les tuiles visuelles des pièges
        const stored = (WA.player.state.easterEggTilePositions as Record<string, { x: number; y: number }>) ?? {};
        const tilesToClear: { x: number; y: number; tile: null; layer: string }[] = [];
        for (const trapName of triggered) {
            if (stored[trapName]) {
                tilesToClear.push({ x: stored[trapName].x, y: stored[trapName].y, tile: null, layer: EGGS_VISUAL_LAYER });
            }
        }
        if (tilesToClear.length > 0) {
            WA.room.setTiles(tilesToClear);
        }
    } catch (_e) { /* */ }
}

// Rendre le joueur "malade" pendant TRAP_DURATION secondes
function triggerTrap(trapName: string) {
    if (isSick) return; // déjà malade, on n'empile pas
    isSick = true;
    console.info("Easter: trap triggered!", trapName);

    // Sauvegarder le piège comme déclenché
    try {
        const triggered = (WA.player.state.easterTrapsTriggered as string[]) ?? [];
        if (!triggered.includes(trapName)) {
            triggered.push(trapName);
            WA.player.state.easterTrapsTriggered = [...triggered];
        }
    } catch (_e) { /* */ }

    // Supprimer visuellement le piège
    deleteArea(trapName);
    hideEggVisualAtPlayer(trapName);

    // Bloquer le joueur
    try { WA.controls.disablePlayerControls(); } catch (_e) { /* */ }

    // Contour vert poison
    try { WA.player.setOutlineColor(0, 200, 0); } catch (_e) { /* */ }

    WA.ui.banner.openBanner({
        id: "easter-trap",
        text: `🤢 Beurk ! Un chocolat périmé ! Tu es malade pendant ${TRAP_DURATION} secondes...`,
        bgColor: "#4a148c",
        textColor: "#ffffff",
        closable: false,
        timeToClose: TRAP_DURATION * 1000,
    });

    setTimeout(() => {
        isSick = false;
        try { WA.controls.restorePlayerControls(); } catch (_e) { /* */ }
        try { WA.player.removeOutlineColor(); } catch (_e) { /* */ }
        WA.ui.banner.openBanner({
            id: "easter-trap",
            text: "😮‍💨 Ouf, ça va mieux ! Continue la chasse ! 🐰",
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 4000,
        });
    }, TRAP_DURATION * 1000);
}

// Setup des pièges
function setupTrapListeners() {
    for (const trapName of easterTrapAreas) {
        const triggered = (WA.player.state.easterTrapsTriggered as string[]) ?? [];
        if (triggered.includes(trapName)) continue;

        WA.room.area.onEnter(trapName).subscribe(() => {
            if (huntPaused || isSick) return;
            const alreadyTriggered = (WA.player.state.easterTrapsTriggered as string[]) ?? [];
            if (alreadyTriggered.includes(trapName)) return;
            triggerTrap(trapName);
        });
    }
}

// Zones de téléportation anti-triche (labyrinthe)
function setupTeleportTraps() {
    for (const areaName of easterTeleportAreas) {
        WA.room.area.onEnter(areaName).subscribe(() => {
            if (huntPaused || isSick) return;
            console.info("Easter: teleport trap triggered!", areaName);
            WA.player.moveTo(TELEPORT_START_X, TELEPORT_START_Y, 1000);
        });
    }
}



// Sons
let eggSound: any;
let victorySound: any;

function loadSounds(root: string) {
    try {
        eggSound = WA.sound.loadSound(`${root}/easter/sounds/egg-found.wav`);
        victorySound = WA.sound.loadSound(`${root}/easter/sounds/victory.wav`);
    } catch (e) {
        console.warn("Easter: sounds load failed", e);
    }
}

function playEggSound() {
    try { eggSound?.play({ volume: 0.6 }); } catch (_e) { /* */ }
}

function playVictorySound() {
    try { victorySound?.play({ volume: 0.8 }); } catch (_e) { /* */ }
}

// =============================================
// SCORE PUBLIC : chaque joueur publie son score
// dans WA.player.state ET dans le classement partagé
// =============================================
function updatePublicScore(count: number) {
    try {
        WA.player.state.easterScore = count;
        WA.player.state.easterPlayerName = WA.player.name || "Joueur";
    } catch (_e) { /* */ }
    updateSharedLeaderboard(count);
}

// Classement partagé via WA.state (variable de salle)
function updateSharedLeaderboard(count: number) {
    try {
        const playerName = WA.player.name || "Joueur";
        const raw = (WA.state as any).easterLeaderboard as string || "{}";
        let lb: Record<string, { score: number; ts: number }> = {};
        try { lb = JSON.parse(raw); } catch (_e) { lb = {}; }
        lb[playerName] = { score: count, ts: Date.now() };
        (WA.state as any).easterLeaderboard = JSON.stringify(lb);
        console.info("Easter: shared leaderboard updated", playerName, count);
    } catch (e) {
        console.warn("Easter: updateSharedLeaderboard failed", e);
    }
}

function updateSharedLeaderboardWithTime(count: number, elapsedSeconds: number) {
    try {
        const playerName = WA.player.name || "Joueur";
        const raw = (WA.state as any).easterLeaderboard as string || "{}";
        let lb: Record<string, { score: number; ts: number; time?: number }> = {};
        try { lb = JSON.parse(raw); } catch (_e) { lb = {}; }
        lb[playerName] = { score: count, ts: Date.now(), time: elapsedSeconds };
        (WA.state as any).easterLeaderboard = JSON.stringify(lb);
    } catch (e) {
        console.warn("Easter: updateSharedLeaderboardWithTime failed", e);
    }
}

// =============================================
// RÉINITIALISATION : accessible à TOUS les joueurs
// =============================================
function resetMyProgress() {
    WA.player.state.easterProgress = null;
    WA.player.state.easterHuntStarted = false;
    WA.player.state.easterCompleted = false;
    WA.player.state.easterScore = 0;
    WA.player.state.easterPlayerName = "";
    WA.player.state.easterHuntDisabled = false;
    WA.player.state.easterTimerStart = null;
    WA.player.state.easterTimerEnd = null;
    WA.player.state.easterSeenIntro = false;
    WA.player.state.easterEggTilePositions = null;
    // Retirer du classement partagé
    try {
        const playerName = WA.player.name || "Joueur";
        const raw = (WA.state as any).easterLeaderboard as string || "{}";
        let lb: Record<string, unknown> = {};
        try { lb = JSON.parse(raw); } catch (_e) { lb = {}; }
        delete lb[playerName];
        (WA.state as any).easterLeaderboard = JSON.stringify(lb);
    } catch (_e) { /* */ }
    console.info("Easter: progress reset");
}

// =============================================
// CHRONOMÈTRE
// =============================================
let timerStartedAt = 0; // timestamp ms du début du chrono

function getElapsedSeconds(): number {
    if (!timerStartedAt) return 0;
    return Math.floor((Date.now() - timerStartedAt) / 1000);
}

function formatTimer(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    return `${m}m ${String(s).padStart(2, "0")}s`;
}

function startTimer() {
    // Si déjà un chrono sauvegardé, reprendre
    const saved = WA.player.state.easterTimerStart as number | undefined;
    if (saved && saved > 0) {
        timerStartedAt = saved;
    } else {
        timerStartedAt = Date.now();
        try { WA.player.state.easterTimerStart = timerStartedAt; } catch (_e) { /* */ }
    }
}

// =============================================
// INITIALISATION PRINCIPALE
// =============================================
WA.onInit().then(async () => {
    const mapUrl = WA.room.mapURL;
    console.info("Easter: WA.onInit OK, map =", mapUrl);

    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"));

    // Charger les sons
    loadSounds(root);

    // Charger les positions des tuiles visuelles des œufs
    await loadEggVisualTilePositions();

    // Activer le tracking des joueurs (pour le leaderboard)
    try {
        WA.players.configureTracking({ players: true }).then(() => {
            console.info("Easter: player tracking OK");
        }).catch((e: unknown) => console.warn("Easter: configureTracking failed", e));
    } catch (_e) { /* */ }

    // Récupérer la progression
    let progress: EasterProgress;
    try {
        progress = (WA.player.state.easterProgress as EasterProgress) ?? buildDefaultProgress();
    } catch (_e) {
        progress = buildDefaultProgress();
    }

    const count = getFoundCount(progress);
    console.info("Easter: progress", count, "/", TOTAL_EGGS);
    updatePublicScore(count);

    // Cacher les œufs par défaut (ils n'apparaissent qu'au lancement)
    WA.room.hideLayer(EGGS_VISUAL_LAYER);

    // Vérifier si la chasse est ouverte par l'admin
    try {
        const huntActive = (WA.state as any).easterHuntActive;
        if (huntActive === false) {
            huntPaused = true;
            console.info("Easter: hunt is DISABLED by admin");
        }
    } catch (_e) { /* */ }

    // Écouter activation/désactivation en temps réel
    try {
        WA.state.onVariableChange("easterHuntActive").subscribe((value: unknown) => {
            if (value === false) {
                huntPaused = true;
                console.info("Easter: hunt DISABLED by admin (live)");
                WA.room.hideLayer(EGGS_VISUAL_LAYER);
                WA.ui.banner.openBanner({
                    id: "easter-banner",
                    text: "⛔ La chasse aux œufs a été désactivée par un administrateur.",
                    bgColor: "#e53935",
                    textColor: "#ffffff",
                    closable: true,
                    timeToClose: 15000,
                });
            } else {
                huntPaused = false;
                console.info("Easter: hunt ENABLED by admin (live)");
                if (huntStarted) {
                    // Chasse déjà active dans cette session
                    WA.room.showLayer(EGGS_VISUAL_LAYER);
                    hideFoundEggVisuals();
                } else if (WA.player.state.easterHuntStarted === true) {
                    // Le joueur avait commencé avant un rechargement, reprendre
                    huntStarted = true;
                    startTimer();
                    WA.room.showLayer(EGGS_VISUAL_LAYER);
                    const resumeProgress = (WA.player.state.easterProgress as EasterProgress) ?? progress;
                    hideFoundEggs(resumeProgress);
                    hideTriggeredTraps();
                    setupEggListeners(resumeProgress, root);
                    setupTrapListeners();
                    setupTeleportTraps();
                    startClues(resumeProgress);
                    setupLeaderboard(root);
                    const elapsed = getElapsedSeconds();
                    const cnt = getFoundCount(resumeProgress);
                    WA.ui.banner.openBanner({
                        id: "easter-banner",
                        text: `🥚 Chasse reprise : ${cnt}/${TOTAL_EGGS} œufs (⏱️ ${formatTimer(elapsed)})`,
                        bgColor: "#FF9800",
                        textColor: "#ffffff",
                        closable: true,
                        timeToClose: 8000,
                    });
                    return; // ne pas afficher le 2e banner
                }
                WA.ui.banner.openBanner({
                    id: "easter-banner",
                    text: "✅ La chasse aux œufs est de nouveau active ! 🐰",
                    bgColor: "#4CAF50",
                    textColor: "#ffffff",
                    closable: true,
                    timeToClose: 8000,
                });
            }
        });
    } catch (_e) { /* */ }

    // Vérifier si un reset global a eu lieu depuis la dernière visite
    try {
        const serverVersion = (WA.state as any).easterResetVersion ?? 0;
        const localVersion = WA.player.state.easterResetVersion ?? 0;
        if (typeof serverVersion === "number" && serverVersion > (localVersion as number)) {
            console.info("Easter: global reset detected, clearing local progress");
            resetMyProgress();
            WA.player.state.easterResetVersion = serverVersion;
            progress = buildDefaultProgress();
        }
    } catch (_e) { /* */ }

    // Écouter un reset global en temps réel
    try {
        WA.state.onVariableChange("easterResetVersion").subscribe((_value: unknown) => {
            console.info("Easter: global reset received live!");
            resetMyProgress();
            WA.player.state.easterResetVersion = _value;
            huntStarted = false;
            WA.room.hideLayer(EGGS_VISUAL_LAYER);
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "🔄 La chasse aux œufs a été réinitialisée ! Recharge la page (F5) pour repartir de zéro.",
                bgColor: "#2196F3",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 30000,
            });
        });
    } catch (_e) { /* */ }

    // Vérifier l'état du jeu
    let isCompleted = false;
    let wasStarted = false;
    try {
        isCompleted = WA.player.state.easterCompleted === true;
        wasStarted = WA.player.state.easterHuntStarted === true;
    } catch (_e) { /* */ }

    if (isCompleted && !huntPaused) {
        console.info("Easter: already completed");
        startTimer(); // reprendre le chrono pour affichage
        const elapsed = getElapsedSeconds();
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🎉 Chasse terminée ! ${count}/${TOTAL_EGGS} œufs en ${formatTimer(elapsed)} !`,
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    if (wasStarted && !huntPaused) {
        console.info("Easter: resuming hunt");
        huntStarted = true;
        startTimer();
        WA.room.showLayer(EGGS_VISUAL_LAYER);
        hideFoundEggs(progress);
        hideTriggeredTraps();
        const elapsed = getElapsedSeconds();
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🥚 Chasse en cours : ${count}/${TOTAL_EGGS} œufs (⏱️ ${formatTimer(elapsed)})`,
            bgColor: "#FF9800",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 5000,
        });
        setupEggListeners(progress, root);
        setupTrapListeners();
        setupTeleportTraps();
        startClues(progress);
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    // Première visite ou joueur qui a vu les instructions mais pas encore lancé
    const hasSeenIntro = WA.player.state.easterSeenIntro === true;

    if (!hasSeenIntro && !huntPaused) {
        // Popup informative avec "D'accord"
        console.info("Easter: first visit, showing intro");
        try {
            WA.ui.modal.openModal({
                title: "Chasse aux Œufs de Pâques",
                src: `${root}/easter/instructions.html`,
                allow: "microphone; camera",
                allowApi: true,
                position: "center",
            }, () => {
                WA.player.state.easterSeenIntro = true;
            });
        } catch (e) {
            console.error("Easter: openModal failed", e);
            WA.player.state.easterSeenIntro = true;
        }
    }

    // Bouton menu TOUJOURS visible, quelle que soit l'état de la chasse
    try {
        WA.ui.actionBar.addButton({
            id: "easter-start-btn",
            label: "🥚 Chasse aux œufs",
            callback: () => {
                if (huntStarted) {
                    showProgress(progress, root);
                    return;
                }
                if (huntPaused) {
                    WA.ui.banner.openBanner({
                        id: "easter-banner",
                        text: "⛔ La chasse n'est pas encore ouverte. Patience ! 🐰",
                        bgColor: "#e53935",
                        textColor: "#ffffff",
                        closable: true,
                        timeToClose: 8000,
                    });
                    return;
                }
                // Ouvrir la popup "C'est parti"
                WA.ui.modal.openModal({
                    title: "Lancer la chasse",
                    src: `${root}/easter/launch.html`,
                    allow: "microphone; camera",
                    allowApi: true,
                    position: "center",
                }, () => {
                    if (!huntStarted && WA.player.state.easterLaunchConfirmed === true) {
                        WA.player.state.easterLaunchConfirmed = false;
                        startHunt(progress, root);
                    }
                });
            },
        });
    } catch (e) {
        console.warn("Easter: actionBar button failed", e);
    }

    setupAdminButton(root);

}).catch((e: unknown) => console.error("Easter: WA.onInit FAILED", e));


// =============================================
// FONCTIONS DU JEU
// =============================================

function startHunt(progress: EasterProgress, root: string) {
    if (huntStarted) return;
    if (huntPaused) {
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: "⛔ La chasse aux œufs n'est pas encore ouverte. Patience ! 🐰",
            bgColor: "#e53935",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        return;
    }
    huntStarted = true;
    console.info("Easter: hunt started!");

    try { WA.player.state.easterHuntStarted = true; } catch (_e) { /* */ }

    // Démarrer le chronomètre
    startTimer();

    // Afficher les œufs
    WA.room.showLayer(EGGS_VISUAL_LAYER);

    // Masquer les œufs déjà trouvés (en cas de reprise après pause admin)
    hideFoundEggs(progress);
    hideTriggeredTraps();

    setupLeaderboard(root);

    const currentCount = getFoundCount(progress);
    WA.ui.banner.openBanner({
        id: "easter-banner",
        text: currentCount > 0
            ? `🐰 Chasse reprise ! ${currentCount}/${TOTAL_EGGS} déjà trouvés. ⏱️ Chrono lancé !`
            : `🐰 C'est parti ! Trouve les ${TOTAL_EGGS} œufs cachés ! ⏱️ Chrono lancé !`,
        bgColor: "#FF9800",
        textColor: "#ffffff",
        closable: true,
        timeToClose: 8000,
    });

    setupEggListeners(progress, root);
    setupTrapListeners();
    setupTeleportTraps();
    startClues(progress);
}

function setupEggListeners(progress: EasterProgress, root: string) {
    for (const areaName of easterEggAreas) {
        if (progress[areaName]) continue;

        WA.room.area.onEnter(areaName).subscribe(() => {
            // Bloquer si la chasse est désactivée
            if (huntPaused) {
                WA.ui.banner.openBanner({
                    id: "easter-paused",
                    text: "⛔ La chasse est désactivée pour le moment.",
                    bgColor: "#e53935",
                    textColor: "#ffffff",
                    closable: true,
                    timeToClose: 5000,
                });
                return;
            }
            const currentProgress =
                (WA.player.state.easterProgress as EasterProgress) ?? progress;
            if (currentProgress[areaName]) return;

            console.info("Easter: found", areaName);
            currentProgress[areaName] = true;
            progress = currentProgress;
            WA.player.state.easterProgress = { ...currentProgress };

            playEggSound();
            deleteArea(areaName);
            hideEggVisualAtPlayer(areaName);

            const count = getFoundCount(currentProgress);
            updatePublicScore(count);

            WA.ui.banner.openBanner({
                id: "easter-found",
                text: `${getRandomMessage()} (${count}/${TOTAL_EGGS})`,
                bgColor: "#8BC34A",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 4000,
            });

            if (count >= TOTAL_EGGS) {
                try { WA.player.state.easterCompleted = true; } catch (_e) { /* */ }
                const elapsed = getElapsedSeconds();
                try { WA.player.state.easterTimerEnd = elapsed; } catch (_e) { /* */ }
                updateSharedLeaderboardWithTime(count, elapsed);
                clearClues();
                setTimeout(() => {
                    playVictorySound();
                    WA.ui.banner.closeBanner();
                    WA.ui.modal.openModal({
                        title: "Félicitations !",
                        src: `${root}/easter/congratulations.html`,
                        allow: "microphone; camera",
                        allowApi: true,
                        position: "center",
                    });
                }, 2000);
            }
        });
    }
}

function startClues(progress: EasterProgress) {
    clearClues();
    timeoutClueRegularly = setInterval(() => {
        const count = getFoundCount(progress);
        if (count >= TOTAL_EGGS) {
            clearClues();
            return;
        }
        const clueIndex = Math.min(
            Math.floor(count / (TOTAL_EGGS / CLUES.length)),
            CLUES.length - 1
        );
        WA.ui.banner.openBanner({
            id: "easter-clue",
            text: CLUES[clueIndex],
            bgColor: "#9C27B0",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 8000,
        });
    }, CLUE_TIMEOUT);
}

function clearClues() {
    if (timeoutClue) clearTimeout(timeoutClue);
    if (timeoutClueRegularly) clearInterval(timeoutClueRegularly);
}

function showProgress(_progress: EasterProgress, root: string) {
    WA.ui.modal.openModal({
        title: "Progression",
        src: `${root}/easter/progress.html`,
        allow: "microphone; camera",
        allowApi: true,
        position: "center",
    });
}

function setupLeaderboard(root: string) {
    try {
        WA.ui.actionBar.addButton({
            id: "easter-leaderboard-btn",
            label: "🏆 Classement",
            callback: () => {
                WA.ui.modal.openModal({
                    title: "Classement",
                    src: `${root}/easter/leaderboard.html`,
                    allow: "microphone; camera",
                    allowApi: true,
                    position: "right",
                });
            },
        });
    } catch (e) {
        console.warn("Easter: leaderboard setup failed", e);
    }
}

// =============================================
// MENU ADMIN
// =============================================
function setupAdminButton(root: string) {
    try {
        const tags = WA.player.tags;
        console.info("Easter: player tags =", JSON.stringify(tags));
        const isAdmin = tags.some((t: string) => t.toLowerCase() === "admin" || t.toLowerCase() === "team");
        if (!isAdmin) return;
        console.info("Easter: admin detected");
        WA.ui.actionBar.addButton({
            id: "easter-admin-btn",
            label: "⚙️ Admin Pâques",
            callback: () => {
                WA.ui.modal.openModal({
                    title: "Administration - Chasse aux Œufs",
                    src: `${root}/easter/admin.html`,
                    allow: "microphone; camera",
                    allowApi: true,
                    position: "right",
                });
            },
        });
    } catch (e) {
        console.warn("Easter: admin button failed", e);
    }
}
