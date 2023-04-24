import { TextChannel } from "discord.js";

export async function getWebhookForChannel(channel: TextChannel) {

    // Get existing webhooks
    const existingWebhooks = await channel.fetchWebhooks();

    // See if one exists for our bot
    const ourWebhook = existingWebhooks.find((webhook) => webhook.name.toLowerCase().includes("suggestions"));
    if (ourWebhook) return ourWebhook;

    const newHook = await channel.createWebhook({
        name: 'Nameless Suggestions'
    }).catch(() => undefined);

    return newHook;
}