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

// =============================================
// CLASSEMENT EN MÉMOIRE (basé sur WA.players)
// Le score de chaque joueur est dans WA.player.state.easterScore
// On écoute les changements de tous les joueurs via WA.players
// =============================================
const inMemoryLeaderboard: Record<string, { score: number; date: string }> = {};

function updatePublicScore(count: number) {
    try {
        WA.player.state.easterScore = count;
        // Aussi stocker le nom pour que les autres puissent le lire
        WA.player.state.easterPlayerName = WA.player.name || "Joueur";
    } catch (_e) { /* ignore */ }
}

function addToLeaderboard(name: string, score: number) {
    if (score <= 0) return;
    inMemoryLeaderboard[name] = { score, date: new Date().toISOString() };
    console.info("Easter: leaderboard entry", name, "=", score, "| total:", Object.keys(inMemoryLeaderboard).length);
}

function syncLeaderboardCache() {
    WA.player.state.leaderboardCache = JSON.stringify(inMemoryLeaderboard);
}

function updateSharedLeaderboard(playerName: string, score: number) {
    addToLeaderboard(playerName, score);
    syncLeaderboardCache();
}

// Scanne les joueurs connectés proches pour remplir le leaderboard
function scanConnectedPlayers() {
    try {
        for (const p of WA.players.list()) {
            const score = p.state.easterScore;
            const name = String(p.state.easterPlayerName || p.name || "Joueur");
            if (typeof score === "number" && score > 0) {
                addToLeaderboard(name, score);
            }
        }
        syncLeaderboardCache();
    } catch (e) {
        console.warn("Easter: scanConnectedPlayers failed", e);
    }
}

// Écoute en temps réel les scores de TOUS les joueurs dans la room
function setupPlayersListener() {
    try {
        // Écoute les changements de score en temps réel (tous les joueurs de la room)
        WA.players.onVariableChange("easterScore").subscribe((event: { player: any; value: unknown }) => {
            const score = typeof event.value === "number" ? event.value : 0;
            const name = String(event.player.state?.easterPlayerName || event.player.name || "Joueur");
            console.info("Easter: player score changed", name, "=", score);
            if (score > 0) {
                addToLeaderboard(name, score);
            } else if (score === 0) {
                // Score remis à 0 = reset
                delete inMemoryLeaderboard[name];
            }
            syncLeaderboardCache();
        });
        console.info("Easter: WA.players.onVariableChange subscribed");
    } catch (e) {
        console.warn("Easter: WA.players.onVariableChange failed", e);
    }

    try {
        // Quand un joueur entre dans la zone visible, lire son score
        WA.players.onPlayerEnters.subscribe((player: any) => {
            const score = player.state?.easterScore;
            const name = String(player.state?.easterPlayerName || player.name || "Joueur");
            if (typeof score === "number" && score > 0) {
                addToLeaderboard(name, score);
                syncLeaderboardCache();
            }
        });
    } catch (e) {
        console.warn("Easter: onPlayerEnters failed", e);
    }
}

// =============================================
// COMMANDES ADMIN (via WA.players)
// L'admin écrit dans WA.player.state.easterAdminAction
// Les autres scripts le détectent via WA.players.onVariableChange
// =============================================
let lastAdminAction = "";

function setupAdminListener() {
    try {
        WA.players.onVariableChange("easterAdminAction").subscribe((event: { player: any; value: unknown }) => {
            const cmd = String(event.value || "");
            if (!cmd || cmd === lastAdminAction) return;
            lastAdminAction = cmd;
            const action = cmd.split(":")[0];
            console.info("Easter: received admin command from", event.player.name, ":", action);
            handleRemoteAdminCommand(action);
        });
        console.info("Easter: admin listener subscribed");
    } catch (e) {
        console.warn("Easter: admin listener failed", e);
    }
}

function handleRemoteAdminCommand(action: string) {
    switch (action) {
        case "resetLeaderboard":
            // Vider le classement local
            for (const key of Object.keys(inMemoryLeaderboard)) {
                delete inMemoryLeaderboard[key];
            }
            syncLeaderboardCache();
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "📉 Le classement a été vidé par l'administrateur.",
                bgColor: "#FF9800",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 8000,
            });
            break;
        case "deactivateHunt":
            huntStarted = false;
            clearClues();
            try { WA.room.hideLayer(EGGS_LAYER); } catch (_e) { /* */ }
            WA.player.state.easterHuntDisabled = true;
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "🚫 La chasse aux œufs a été désactivée par l'administrateur.",
                bgColor: "#757575",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 15000,
            });
            break;
        case "activateHunt":
            WA.player.state.easterHuntDisabled = false;
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "✅ La chasse aux œufs est de nouveau active ! Rechargez la page pour participer.",
                bgColor: "#4CAF50",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 15000,
            });
            break;
        case "resetAll":
            // Vider le classement
            for (const key of Object.keys(inMemoryLeaderboard)) {
                delete inMemoryLeaderboard[key];
            }
            syncLeaderboardCache();
            // Réinitialiser la progression locale
            WA.player.state.easterProgress = null;
            WA.player.state.easterHuntStarted = false;
            WA.player.state.easterCompleted = false;
            WA.player.state.easterScore = 0;
            WA.player.state.easterHuntDisabled = false;
            huntStarted = false;
            clearClues();
            WA.ui.banner.openBanner({
                id: "easter-banner",
                text: "💣 Tout a été réinitialisé ! Rechargez la page pour recommencer.",
                bgColor: "#FF5722",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 15000,
            });
            break;
    }
}

// Polling pour recevoir les commandes depuis l'iframe admin locale
let adminPollInterval: ReturnType<typeof setInterval> | undefined;
let lastLocalAdminCommand = "";

function handleLocalAdminCommand(cmd: string) {
    if (!cmd) return;
    const action = cmd.split(":")[0];
    console.info("Easter: local admin command:", action);

    // Écrire dans notre propre player state pour que les autres scripts le voient
    WA.player.state.easterAdminAction = cmd;

    // Aussi exécuter localement
    handleRemoteAdminCommand(action);
}

function startAdminCommandPolling() {
    if (adminPollInterval) return;
    lastLocalAdminCommand = String(WA.player.state.adminCommand || "");
    adminPollInterval = setInterval(() => {
        const cmd = String(WA.player.state.adminCommand || "");
        if (cmd && cmd !== lastLocalAdminCommand) {
            lastLocalAdminCommand = cmd;
            handleLocalAdminCommand(cmd);
        }
    }, 500);
}

function stopAdminCommandPolling() {
    if (adminPollInterval) {
        clearInterval(adminPollInterval);
        adminPollInterval = undefined;
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

    // ÉTAPE 3 : Activer le suivi des joueurs + écoute temps réel
    try {
        WA.players.configureTracking({ players: true }).then(() => {
            console.info("Easter: player tracking enabled");
            scanConnectedPlayers();
        }).catch((e: unknown) => console.warn("Easter: configureTracking failed", e));
    } catch (_e) { /* */ }

    setupPlayersListener();
    setupAdminListener();

    // Vérifier si la chasse est désactivée pour ce joueur
    if (WA.player.state.easterHuntDisabled === true) {
        console.info("Easter: hunt is disabled for this player");
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: "🚫 La chasse aux œufs est actuellement désactivée.",
            bgColor: "#757575",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    // ÉTAPE 4 : Récupérer la progression
    let progress: EasterProgress;
    try {
        progress = (WA.player.state.easterProgress as EasterProgress) ?? buildDefaultProgress();
    } catch (_e) {
        progress = buildDefaultProgress();
    }

    const count = getFoundCount(progress);
    console.info("Easter: progress", count, "/", TOTAL_EGGS);

    updatePublicScore(count);

    // Ajouter notre propre score au leaderboard en mémoire
    let playerName = "Joueur";
    try { playerName = WA.player.name || "Joueur"; } catch (_e) { /* */ }
    if (count > 0) {
        addToLeaderboard(playerName, count);
        syncLeaderboardCache();
    }

    // ÉTAPE 5 : Vérifier l'état du jeu
    let isCompleted = false;
    let wasStarted = false;
    try {
        isCompleted = WA.player.state.easterCompleted === true;
        wasStarted = WA.player.state.easterHuntStarted === true;
    } catch (_e) { /* ignore */ }

    if (isCompleted) {
        console.info("Easter: already completed");
        WA.room.showLayer(EGGS_LAYER);
        hideFoundEggs(progress);
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🎉 Chasse terminée ! Tu as trouvé ${count}/${TOTAL_EGGS} œufs !`,
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        setupLeaderboard(root);
        setupAdminButton(root);
        return;
    }

    if (wasStarted) {
        console.info("Easter: resuming hunt");
        huntStarted = true;
        WA.room.showLayer(EGGS_LAYER);
        hideFoundEggs(progress);
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
        setupAdminButton(root);
        return;
    }

    // ÉTAPE 6 : Première visite → popup instructions
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
        startHunt(progress, root);
    }

    // Bouton de secours texte
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
            // Rescanner les joueurs connectés avant d'ouvrir le modal
            scanConnectedPlayers();
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
function setupAdminButton(root: string) {
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
                // Préparer les infos pour le panel admin
                scanConnectedPlayers();
                WA.player.state.adminHuntActive = WA.player.state.easterHuntDisabled !== true;
                startAdminCommandPolling();
                WA.ui.modal.openModal({
                    title: "Administration - Chasse aux Œufs",
                    src: `${root}/easter/admin.html`,
                    allow: "microphone; camera",
                    allowApi: true,
                    position: "right",
                }, () => {
                    stopAdminCommandPolling();
                });
            },
        });
    } catch (e) {
        console.warn("Easter: admin button setup failed", e);
    }
}
