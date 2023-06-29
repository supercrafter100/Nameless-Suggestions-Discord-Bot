import Database from '../database/Database.js';
import Bot from '../managers/Bot';

export class NamelessUser {
    public static async getUserByDiscordId(id: string, guildId: string, client: Bot) {
        const suggestionApi = await client.suggestionsApi.getApi(guildId);
        const credentials = await Database.getApiCredentials(guildId);
        if (!credentials) {
            throw new Error('No credentials found');
        }

        const user = (await suggestionApi.getUserByDiscordId(credentials, id)) ?? undefined;
        return user;
    }

    public static async getUserById(id: string, guildId: string, client: Bot) {
        const suggestionApi = await client.suggestionsApi.getApi(guildId);
        const credentials = await Database.getApiCredentials(guildId);
        if (!credentials) {
            throw new Error('No credentials found');
        }

        const user = (await suggestionApi.getUser(credentials, id)) ?? undefined;
        return user;
    }
}
