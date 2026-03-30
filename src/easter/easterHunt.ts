/// <reference types="@workadventure/iframe-api-typings" />

import {
    TOTAL_EGGS,
    EGGS_LAYER,
    EGG_FOUND_MESSAGES,
    CLUE_TIMEOUT,
    CLUES,
} from "./constants";

console.info('"Easter Egg Hunt" script started successfully');

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

WA.onInit().then(() => {
    const mapUrl = WA.room.mapURL;
    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"));

    // Récupérer ou initialiser la progression
    let progress: EasterProgress =
        (WA.player.state.easterProgress as EasterProgress) ?? buildDefaultProgress();
    const isCompleted = WA.player.state.easterCompleted === true;

    // Si le jeu est déjà terminé
    if (isCompleted) {
        WA.room.showLayer(EGGS_LAYER);
        const count = getFoundCount(progress);
        WA.ui.banner.openBanner({
            id: "easter-banner",
            text: `🎉 Chasse terminée ! Tu as trouvé ${count}/${TOTAL_EGGS} œufs !`,
            bgColor: "#4CAF50",
            textColor: "#ffffff",
            closable: true,
            timeToClose: 10000,
        });
        return;
    }

    // Si le joueur avait déjà commencé
    if (WA.player.state.easterHuntStarted === true) {
        huntStarted = true;
        WA.room.showLayer(EGGS_LAYER);
        const count = getFoundCount(progress);
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
        return;
    }

    // Première visite : afficher les instructions
    WA.ui.modal.openModal({
        title: "Chasse aux Œufs de Pâques",
        src: `${root}/easter/instructions.html`,
        allow: "microphone; camera",
        allowApi: true,
        position: "center",
    }, () => {
        // Callback quand le modal se ferme => lancer la chasse
        if (!huntStarted) {
            startHunt(progress, root);
        }
    });

    // Utiliser un bouton dans la barre d'action pour démarrer
    WA.ui.actionBar.addButton({
        id: "easter-start-btn",
        type: "action",
        imageSrc: `${root}/easter/images/egg-icon.png`,
        toolTip: "Lancer la chasse aux œufs !",
        callback: () => {
            if (!huntStarted) {
                startHunt(progress, root);
            } else {
                showProgress(progress, root);
            }
        },
    });

}).catch((e: unknown) => console.error(e));



function startHunt(progress: EasterProgress, root: string) {
    huntStarted = true;
    WA.player.state.easterHuntStarted = true;

    // Faire apparaître les œufs
    WA.room.showLayer(EGGS_LAYER);

    // Bannière de démarrage
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
    for (const areaName of easterEggAreas) {
        // Ne pas écouter les œufs déjà trouvés
        if (progress[areaName]) continue;

        WA.room.area.onEnter(areaName).subscribe(() => {
            // Vérifier si déjà trouvé (double protection)
            const currentProgress =
                (WA.player.state.easterProgress as EasterProgress) ?? progress;
            if (currentProgress[areaName]) return;

            // Marquer comme trouvé
            currentProgress[areaName] = true;
            progress = currentProgress;
            WA.player.state.easterProgress = { ...currentProgress };

            const count = getFoundCount(currentProgress);

            // Notification
            WA.ui.banner.openBanner({
                id: "easter-found",
                text: `${getRandomMessage()} (${count}/${TOTAL_EGGS})`,
                bgColor: "#8BC34A",
                textColor: "#ffffff",
                closable: true,
                timeToClose: 4000,
            });

            // Vérifier si tous les œufs sont trouvés
            if (count >= TOTAL_EGGS) {
                WA.player.state.easterCompleted = true;
                clearClues();

                // Petite pause puis afficher les félicitations
                setTimeout(() => {
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
        // Choisir un indice basé sur la progression
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
