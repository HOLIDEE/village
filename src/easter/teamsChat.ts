/// <reference types="@workadventure/iframe-api-typings" />

/**
 * Bouton "💬 Teams" pour les membres de l'équipe.
 * Ouvre Microsoft Teams dans le panneau latéral de WorkAdventure.
 * Uniquement visible pour les utilisateurs avec le tag "team".
 */

const TEAMS_URL = "https://teams.cloud.microsoft/";

export {};

let teamsCoWebsite: { close(): Promise<void> } | null = null;
let teamsOpen = false;

WA.onInit().then(() => {
    // Uniquement pour les membres de l'équipe
    if (!WA.player.tags.includes("team")) {
        console.info("Teams: user is not team member, skipping");
        return;
    }

    console.info("Teams: adding Teams button for team member");

    WA.ui.actionBar.addButton({
        id: "teams-chat-btn",
        label: "💬 Teams",
        callback: () => {
            toggleTeams();
        },
    });
});

async function toggleTeams() {
    if (teamsOpen && teamsCoWebsite) {
        // Fermer le panneau
        try {
            await teamsCoWebsite.close();
        } catch (_e) { /* */ }
        teamsCoWebsite = null;
        teamsOpen = false;
        console.info("Teams: panel closed");
        return;
    }

    // Ouvrir Teams dans le panneau latéral
    try {
        teamsCoWebsite = await WA.nav.openCoWebSite(
            TEAMS_URL,
            false,                              // allowApi
            "microphone; camera; display-capture", // allowPolicy
            40,                                 // widthPercent (40% de l'écran)
            0,                                  // position
            true,                               // closable
            false                               // lazy
        );
        teamsOpen = true;
        console.info("Teams: panel opened");
    } catch (e) {
        console.warn("Teams: openCoWebSite failed, falling back to new tab", e);
        // Plan B : ouvrir dans un nouvel onglet
        WA.nav.openTab(TEAMS_URL);
    }
}
