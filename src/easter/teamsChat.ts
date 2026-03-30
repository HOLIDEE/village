/// <reference types="@workadventure/iframe-api-typings" />

/**
 * Bouton "💬 Teams" pour les membres de l'équipe.
 * Ouvre un panneau latéral Teams dans WorkAdventure.
 * Le panneau charge notre page teams-panel.html qui :
 *   - Tente d'afficher Teams directement (iframe)
 *   - Si bloqué par Microsoft → affiche un lanceur avec popup dédiée
 */

export {};

let teamsCoWebsite: { close(): Promise<void> } | null = null;
let teamsOpen = false;

WA.onInit().then(() => {
    if (!WA.player.tags.includes("team")) {
        console.info("Teams: user is not team member, skipping");
        return;
    }

    console.info("Teams: adding Teams button for team member");

    const mapUrl = WA.room.mapURL;
    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"));

    WA.ui.actionBar.addButton({
        id: "teams-chat-btn",
        label: "💬 Teams",
        callback: () => {
            toggleTeams(root);
        },
    });
});

async function toggleTeams(root: string) {
    if (teamsOpen && teamsCoWebsite) {
        try {
            await teamsCoWebsite.close();
        } catch (_e) { /* */ }
        teamsCoWebsite = null;
        teamsOpen = false;
        console.info("Teams: panel closed");
        return;
    }

    try {
        teamsCoWebsite = await WA.nav.openCoWebSite(
            `${root}/easter/teams-panel.html`,
            false,
            "microphone; camera; display-capture",
            40,
            0,
            true,
            false
        );
        teamsOpen = true;
        console.info("Teams: panel opened");
    } catch (e) {
        console.warn("Teams: openCoWebSite failed", e);
        WA.nav.openTab("https://teams.cloud.microsoft/");
    }
}
