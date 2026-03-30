/// <reference types="@workadventure/iframe-api-typings" />

import {
    TOTAL_EGGS,
    EGGS_LAYER,
    EGG_FOUND_MESSAGES,
    CLUE_TIMEOUT,
    CLUES,
    EGG_TILE_POSITIONS,
} from "./constants";

console.info("Easter: module loaded");

// Noms des zones d'œufs : easterEgg1, easterEgg2, ...
const easterEggAreas: string[] = [];
for (let i = 1; i <= TOTAL_EGGS; i++) {
    easterEggAreas.push(`easterEgg${i}`);
}

// Progression du joueur
interface EasterProgress {
    [key: string]: boolean;
}

function buildDefaultProgress(): EasterProgress {
    const progress: EasterProgress = {};
    for (let i = 1; i <= TOTAL_EGGS; i++) {
        progress[`easterEgg${i}`] = false;
    }
    return progress;
}

let timeoutClue: ReturnType<typeof setTimeout> | undefined;
let timeoutClueRegularly: ReturnType<typeof setInterval> | undefined;
let huntStarted = false;

function getFoundCount(progress: EasterProgress): number {
    return Object.values(progress).filter(Boolean).length;
}

function getRandomMessage(): string {
    return EGG_FOUND_MESSAGES[Math.floor(Math.random() * EGG_FOUND_MESSAGES.length)];
}

// Cache la tuile d'un œuf trouvé (la remplace par du vide)
function hideEggTile(areaName: string) {
    const pos = EGG_TILE_POSITIONS[areaName];
    if (!pos) return;
    try {
        WA.room.setTiles([{ x: pos.x, y: pos.y, tile: null, layer: EGGS_LAYER }]);
    } catch (e) {
        console.warn("Easter: hideEggTile error", e);
    }
}

// Cache tous les œufs déjà trouvés par le joueur
function hideFoundEggs(progress: EasterProgress) {
    for (const [areaName, found] of Object.entries(progress)) {
        if (found) hideEggTile(areaName);
    }
}

// Sons (chargement différé, non bloquant)
let eggSound: any;
let victorySound: any;

function loadSounds(root: string) {
    try {
        eggSound = WA.sound.loadSound(`${root}/easter/sounds/egg-found.wav`);
        victorySound = WA.sound.loadSound(`${root}/easter/sounds/victory.wav`);
        console.info("Easter: sounds loaded");
    } catch (e) {
        console.warn("Easter: sounds load failed", e);
    }
}

function playEggSound() {
    try { eggSound?.play({ volume: 0.6 }); } catch (_e) { /* ignore */ }
}

function playVictorySound() {
    try { victorySound?.play({ volume: 0.8 }); } catch (_e) { /* ignore */ }
}

function updatePublicScore(count: number) {
    try { WA.player.state.easterScore = count; } catch (_e) { /* ignore */ }
}

// Met à jour le classement partagé (persisté dans WA.state, visible par tous)
function updateSharedLeaderboard(playerName: string, score: number) {
    try {
        const raw = WA.state.easterLeaderboard as string;
        let lb: { [name: string]: { score: number; date: string } } = {};
        try { lb = JSON.parse(raw || "{}"); } catch (_e) { lb = {}; }
        lb[playerName] = { score, date: new Date().toISOString() };
        WA.state.easterLeaderboard = JSON.stringify(lb);
        console.info("Easter: leaderboard updated for", playerName, "=>", score);
    } catch (e) {
        console.warn("Easter: leaderboard update failed", e);
    }
}

// =============================================
// INITIALISATION PRINCIPALE
// =============================================
WA.onInit().then(() => {
    const mapUrl = WA.room.mapURL;
    console.info("Easter: WA.onInit OK, map =", mapUrl);

    // ÉTAPE 1 : Cacher les œufs IMMÉDIATEMENT (le layer est visible:true dans Tiled)
    try {
        WA.room.hideLayer(EGGS_LAYER);
        console.info("Easter: layer hidden");
    } catch (e) {
        console.warn("Easter: hideLayer failed", e);
    }

    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"));
    console.info("Easter: root =", root);

    // ÉTAPE 2 : Charger sons (non bloquant)
    loadSounds(root);

    // ÉTAPE 3 : Récupérer la progression
    let progress: EasterProgress;
    try {
        progress = (WA.player.state.easterProgress as EasterProgress) ?? buildDefaultProgress();
    } catch (_e) {
        progress = buildDefaultProgress();
    }
    const count = getFoundCount(progress);
    console.info("Easter: progress", count, "/", TOTAL_EGGS);

    updatePublicScore(count);

    // ÉTAPE 4 : Vérifier l'état du jeu
    let isCompleted = false;
    let wasStarted = false;
    try {
        isCompleted = WA.player.state.easterCompleted === true;
        wasStarted = WA.player.state.easterHuntStarted === true;
    } catch (_e) { /* ignore */ }

    // Récupérer le nom du joueur pour le leaderboard
    let playerName = "Joueur";
    try { playerName = WA.player.name || "Joueur"; } catch (_e) { /* */ }

    if (isCompleted) {
        console.info("Easter: already completed");
        WA.room.showLayer(EGGS_LAYER);
        hideFoundEggs(progress);
        updateSharedLeaderboard(playerName, count);
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🎉 Chasse terminée ! Tu as trouvé ${count}/${TOTAL_EGGS} œufs !`,
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        setupLeaderboard(root);
        setupAdminButton(root, progress);
        return;
    }

    if (wasStarted) {
        console.info("Easter: resuming hunt");
        huntStarted = true;
        WA.room.showLayer(EGGS_LAYER);
        hideFoundEggs(progress);
        updateSharedLeaderboard(playerName, count);
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🥚 Chasse en cours : ${count}/${TOTAL_EGGS} œufs trouvés`,
            bgColor: "#FF9800",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 5000,
        });
        setupEggListeners(progress, root);
        startClues(progress);
        setupLeaderboard(root);
        setupAdminButton(root, progress);
        return;
    }

    // ÉTAPE 5 : Première visite → popup instructions
    console.info("Easter: first visit, opening instructions");
    try {
        WA.ui.modal.openModal({
            title: "Chasse aux Œufs de Pâques",
            src: `${root}/easter/instructions.html`,
            allow: "microphone; camera",
            allowApi: true,
            position: "center",
        }, () => {
            console.info("Easter: instructions modal closed");
            if (!huntStarted) {
                startHunt(progress, root);
            }
        });
    } catch (e) {
        console.error("Easter: openModal failed", e);
        // Fallback : démarrer directement la chasse
        startHunt(progress, root);
    }

    // Bouton de secours texte (plus fiable qu'une icône)
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

    setupAdminButton(root, progress);

}).catch((e: unknown) => console.error("Easter: WA.onInit FAILED", e));


// =============================================
// FONCTIONS DU JEU
// =============================================

function startHunt(progress: EasterProgress, root: string) {
    if (huntStarted) return;
    huntStarted = true;
    console.info("Easter: hunt started!");

    try { WA.player.state.easterHuntStarted = true; } catch (_e) { /* */ }

    WA.room.showLayer(EGGS_LAYER);
    hideFoundEggs(progress);
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
    startClues(progress);
}

function setupEggListeners(progress: EasterProgress, root: string) {
    let pName = "Joueur";
    try { pName = WA.player.name || "Joueur"; } catch (_e) { /* */ }

    for (const areaName of easterEggAreas) {
        if (progress[areaName]) continue;

        WA.room.area.onEnter(areaName).subscribe(() => {
            const currentProgress =
                (WA.player.state.easterProgress as EasterProgress) ?? progress;
            if (currentProgress[areaName]) return;

            console.info("Easter: found", areaName);
            currentProgress[areaName] = true;
            progress = currentProgress;
            WA.player.state.easterProgress = { ...currentProgress };

            playEggSound();
            hideEggTile(areaName);

            const count = getFoundCount(currentProgress);
            updatePublicScore(count);
            updateSharedLeaderboard(pName, count);

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
        WA.room.area.onEnter("leaderboard").subscribe(() => {
            console.info("Easter: entered leaderboard zone");
            WA.ui.modal.openModal({
                title: "Classement",
                src: `${root}/easter/leaderboard.html`,
                allow: "microphone; camera",
                allowApi: true,
                position: "right",
            });
        });
        WA.room.area.onLeave("leaderboard").subscribe(() => {
            WA.ui.modal.closeModal();
        });
    } catch (e) {
        console.warn("Easter: leaderboard setup failed", e);
    }
}

// =============================================
// MENU ADMIN (visible uniquement pour les admins)
// =============================================
function setupAdminButton(root: string, _progress: EasterProgress) {
    try {
        const tags = WA.player.tags;
        console.info("Easter: player tags =", JSON.stringify(tags));
        const isAdmin = tags.some((t: string) => t.toLowerCase() === "admin" || t.toLowerCase() === "team");
        if (!isAdmin) {
            console.info("Easter: not admin/team, skipping admin button");
            return;
        }
        console.info("Easter: admin detected, adding admin button");
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
        console.warn("Easter: admin button setup failed", e);
    }
}
