/// <reference types="@workadventure/iframe-api-typings" />

const TOTAL_EGGS = 4;

WA.onInit().then(() => {
    const progress = WA.player.state.easterProgress as Record<string, boolean> | undefined;
    
    let foundCount = 0;
    if (progress) {
        foundCount = Object.values(progress).filter(Boolean).length;
    }

    const percent = Math.round((foundCount / TOTAL_EGGS) * 100);

    // Mettre à jour la barre de progression
    const progressBar = document.getElementById("progressBar");
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
    }

    // Mettre à jour le texte
    const progressText = document.getElementById("progressText");
    if (progressText) {
        if (foundCount >= TOTAL_EGGS) {
            progressText.textContent = `🎉 Bravo ! Tu as trouvé les ${TOTAL_EGGS} œufs !`;
        } else {
            progressText.textContent = `🥚 ${foundCount} œuf${foundCount > 1 ? 's' : ''} trouvé${foundCount > 1 ? 's' : ''} sur ${TOTAL_EGGS}`;
        }
    }

    // Dessiner la grille d'œufs
    const eggGrid = document.getElementById("eggGrid");
    if (eggGrid) {
        for (let i = 1; i <= TOTAL_EGGS; i++) {
            const div = document.createElement("div");
            const isFound = progress ? progress[`easterEgg${i}`] === true : false;
            div.className = `egg-item ${isFound ? "egg-found" : "egg-missing"}`;
            div.textContent = isFound ? "🥚" : "❓";
            div.title = `Œuf #${i} - ${isFound ? "Trouvé !" : "Pas encore trouvé"}`;
            eggGrid.appendChild(div);
        }
    }

    // Bouton fermer
    document.getElementById("closeButton")?.addEventListener("click", () => {
        WA.ui.modal.closeModal();
    });
}).catch((e) => console.error(e));
