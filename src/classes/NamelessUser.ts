import Bot from "../managers/Bot";

export class NamelessUser {
    public static async getUserByDiscordId(id: string, guildId: string, client: Bot) {
        const user = await client.suggestionsApi.getUserInfoByIntegrationId(id, guildId) ?? undefined;
        return user;
    }

    public static async getUserById(id: string, guildId: string, client: Bot) {
        const user = await client.suggestionsApi.getUserInfo(id, guildId) ?? undefined;
        return user;
    }
}