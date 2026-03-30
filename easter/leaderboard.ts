/// <reference types="@workadventure/iframe-api-typings" />

const TOTAL_EGGS = 4;

interface PlayerScore {
    name: string;
    score: number;
}

const rankIcons = ["🥇", "🥈", "🥉"];

function getRankClass(index: number): string {
    if (index === 0) return "gold";
    if (index === 1) return "silver";
    if (index === 2) return "bronze";
    return "";
}

function renderLeaderboard(players: PlayerScore[]) {
    const list = document.getElementById("leaderboard");
    if (!list) return;

    if (players.length === 0) {
        list.innerHTML = '<li class="empty-state">Personne n\'a encore trouvé d\'œuf... 🐣</li>';
        return;
    }

    // Trier par score décroissant
    players.sort((a, b) => b.score - a.score);

    list.innerHTML = players
        .map((p, i) => {
            const rank = rankIcons[i] ?? `${i + 1}.`;
            const cls = getRankClass(i);
            return `<li class="${cls}">
                <span class="rank">${rank}</span>
                <span class="player-name">${escapeHtml(p.name)}</span>
                <span class="score">${p.score}/${TOTAL_EGGS} 🥚</span>
            </li>`;
        })
        .join("");
}

function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function loadScores() {
    try {
        const players = await WA.players.list();
        const scores: PlayerScore[] = [];

        // Score du joueur actuel
        const myScore = (WA.player.state.easterScore as number) ?? 0;
        const myName = await WA.player.name;
        if (myScore > 0) {
            scores.push({ name: myName + " (toi)", score: myScore });
        }

        // Scores des autres joueurs
        for (const player of players) {
            const playerScore = (player.state.easterScore as number) ?? 0;
            if (playerScore > 0) {
                scores.push({ name: player.name, score: playerScore });
            }
        }

        renderLeaderboard(scores);
    } catch (e) {
        console.error("Erreur chargement leaderboard", e);
        const list = document.getElementById("leaderboard");
        if (list) {
            list.innerHTML = '<li class="empty-state">Impossible de charger le classement 😕</li>';
        }
    }
}

WA.onInit().then(() => {
    loadScores();

    const btn = document.getElementById("refreshBtn");
    if (btn) {
        btn.addEventListener("click", () => loadScores());
    }
}).catch((e: unknown) => console.error(e));
