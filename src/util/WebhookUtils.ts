import { TextChannel } from 'discord.js';

export async function getWebhookForChannel(channel: TextChannel) {
    // Get existing webhooks
    const existingWebhooks = await channel.fetchWebhooks();

    // See if one exists for our bot
    const ourWebhook = existingWebhooks.find((webhook) => webhook.name.toLowerCase().includes('suggestions'));
    if (ourWebhook) return ourWebhook;

    const newHook = await channel
        .createWebhook({
            name: 'Nameless Suggestions',
        })
        .catch(() => undefined);

    return newHook;
}

export function splitOversizedMessage(content: string, length = 2000) {
    const words = content.split(' ');
    const parts = [];

    let currentPart = '';
    for (let i = 0; i < words.length; i++) {
        if (currentPart.length + (' ' + words[i]).length > length) {
            parts.push(currentPart.trim());
            currentPart = words[i];
        } else {
            currentPart += ' ' + words[i];
        }
    }

    return parts;
}
