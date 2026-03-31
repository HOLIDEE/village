/// <reference types="@workadventure/iframe-api-typings" />

import {
    TOTAL_EGGS,
    EGGS_LAYER,
    EGG_FOUND_MESSAGES,
    CLUE_TIMEOUT,
    CLUES,
    TOTAL_TRAPS,
    TRAP_DURATION,
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

function getFoundCount(progress: EasterProgress): number {
    return Object.values(progress).filter(Boolean).length;
}

function getRandomMessage(): string {
    return EGG_FOUND_MESSAGES[Math.floor(Math.random() * EGG_FOUND_MESSAGES.length)];
}

// Supprimer un œuf individuellement (local au joueur)
async function hideEggObject(areaName: string) {
    try {
        await WA.room.area.delete(areaName);
    } catch (e) {
        console.warn("Easter: hideEggObject error", areaName, e);
    }
}

function hideFoundEggs(progress: EasterProgress) {
    for (const [areaName, found] of Object.entries(progress)) {
        if (found) hideEggObject(areaName);
    }
}

// Cacher les pièges déjà déclenchés
function hideTriggeredTraps() {
    try {
        const triggered = (WA.player.state.easterTrapsTriggered as string[]) ?? [];
        for (const trapName of triggered) {
            hideEggObject(trapName);
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
    hideEggObject(trapName);

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
// INITIALISATION PRINCIPALE
// =============================================
WA.onInit().then(() => {
    const mapUrl = WA.room.mapURL;
    console.info("Easter: WA.onInit OK, map =", mapUrl);

    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"));

    // Charger les sons
    loadSounds(root);

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

    // Vérifier si la chasse est désactivée par l'admin
    try {
        const huntActive = (WA.state as any).easterHuntActive;
        if (huntActive === false) {
            huntPaused = true;
            console.info("Easter: hunt is DISABLED by admin");
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "⛔ La chasse aux œufs est actuellement désactivée.",
                bgColor: "#e53935",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 15000,
            });
        }
    } catch (_e) { /* */ }

    // Écouter activation/désactivation en temps réel
    try {
        WA.state.onVariableChange("easterHuntActive").subscribe((value: unknown) => {
            if (value === false) {
                huntPaused = true;
                console.info("Easter: hunt DISABLED by admin (live)");
                WA.room.hideLayer(EGGS_LAYER);
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
                // Ré-afficher les œufs pour les joueurs en cours de chasse
                if (huntStarted || WA.player.state.easterCompleted === true) {
                    WA.room.showLayer(EGGS_LAYER);
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
            WA.player.state.easterProgress = null;
            WA.player.state.easterHuntStarted = false;
            WA.player.state.easterCompleted = false;
            WA.player.state.easterScore = 0;
            WA.player.state.easterPlayerName = "";
            WA.player.state.easterResetVersion = serverVersion;
            WA.player.state.easterTrapsTriggered = [];
            progress = buildDefaultProgress();
        }
    } catch (_e) { /* */ }

    // Écouter un reset global en temps réel
    try {
        WA.state.onVariableChange("easterResetVersion").subscribe((_value: unknown) => {
            console.info("Easter: global reset received live!");
            WA.player.state.easterProgress = null;
            WA.player.state.easterHuntStarted = false;
            WA.player.state.easterCompleted = false;
            WA.player.state.easterScore = 0;
            WA.player.state.easterPlayerName = "";
            WA.player.state.easterResetVersion = _value;
            WA.player.state.easterTrapsTriggered = [];
            huntStarted = false;
            WA.room.hideLayer(EGGS_LAYER);
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

    if (isCompleted) {
        console.info("Easter: already completed");
        if (huntPaused) {
            WA.room.hideLayer(EGGS_LAYER);
        }
        hideFoundEggs(progress);
        hideTriggeredTraps();
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🎉 Chasse terminée ! Tu as trouvé ${count}/${TOTAL_EGGS} œufs !`,
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        // Bouton pour recommencer la chasse (VISIBLE PAR TOUS ceux qui ont fini)
        addRestartButton();
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    if (wasStarted) {
        console.info("Easter: resuming hunt");
        huntStarted = true;
        if (huntPaused) {
            WA.room.hideLayer(EGGS_LAYER);
        }
        hideFoundEggs(progress);
        hideTriggeredTraps();
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🥚 Chasse en cours : ${count}/${TOTAL_EGGS} œufs trouvés`,
            bgColor: "#FF9800",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 5000,
        });
        setupEggListeners(progress, root);
        setupTrapListeners();
        startClues(progress);
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    // Première visite → popup instructions
    console.info("Easter: first visit");
    try {
        WA.ui.modal.openModal({
            title: "Chasse aux Œufs de Pâques",
            src: `${root}/easter/instructions.html`,
            allow: "microphone; camera",
            allowApi: true,
            position: "center",
        }, () => {
            if (!huntStarted) {
                startHunt(progress, root);
            }
        });
    } catch (e) {
        console.error("Easter: openModal failed", e);
        startHunt(progress, root);
    }

    try {
        WA.ui.actionBar.addButton({
            id: "easter-start-btn",
            label: "🥚 Chasse aux œufs",
            callback: () => {
                if (!huntStarted) {
                    WA.ui.modal.closeModal();
                    startHunt(progress, root);
                } else {
                    showProgress(progress, root);
                }
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

function addRestartButton() {
    try {
        WA.ui.actionBar.addButton({
            id: "easter-restart-btn",
            label: "🔄 Recommencer la chasse",
            callback: () => {
                resetMyProgress();
                WA.ui.banner.openBanner({
                    id: "easter-banner",
                    text: "🔄 Progression effacée ! Recharge la page (F5) pour recommencer.",
                    bgColor: "#2196F3",
                    textColor: "#ffffff",
                    closable: true,
                    timeToClose: 30000,
                });
            },
        });
    } catch (e) {
        console.warn("Easter: restart button failed", e);
    }
}

function startHunt(progress: EasterProgress, root: string) {
    if (huntStarted) return;
    // Bloquer le démarrage si la chasse est désactivée
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

    setupLeaderboard(root);

    WA.ui.banner.openBanner({
        id: "easter-banner",
        text: `🐰 La chasse est lancée ! Trouve les ${TOTAL_EGGS} œufs cachés ! 🥚`,
        bgColor: "#FF9800",
        textColor: "#ffffff",
        closable: true,
        timeToClose: 8000,
    });

    setupEggListeners(progress, root);
    setupTrapListeners();
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
            hideEggObject(areaName);

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
                clearClues();
                addRestartButton();
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
