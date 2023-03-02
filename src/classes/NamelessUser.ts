import { ApiUser } from "../types";
import SuggestionModel from "../database/models/suggestion.model";
import Bot from "../managers/Bot";
import chalk from "chalk";

export class NamelessUser {
    public apiData: ApiUser | undefined;
    private guildId: string;

    private discordId: string;
    private client: Bot;

    public static async getUserByDiscordId(id: string, guildId: string, client: Bot) {
        const user = new NamelessUser(id, guildId, client);
        await user.refresh();
        return user;
    }

    constructor(id: string, guildId: string, client: Bot) {
        this.discordId = id;
        this.guildId = guildId;
        this.client = client;
    }

    public async getApiData() {
        const user = await this.client.suggestionsApi.getUserInfoByIntegrationId(this.discordId, this.guildId) ?? undefined;
        this.apiData = user;
    }

    public async refresh() {
        await this.getApiData();
    }
}