import { ApiSuggestion, ApiCommentsResponse } from "../types";
import SuggestionModel from "../database/models/suggestion.model";
import Bot from "../managers/Bot";
import chalk from "chalk";
import { NamelessUser } from "./NamelessUser";

export class Suggestion {
    public apiData: ApiSuggestion | undefined;
    public comments: ApiCommentsResponse | undefined;
    public dbData: SuggestionModel | undefined;

    private id: string;
    private client: Bot;
    private guildId: string;

    public static async getSuggestion(id: string, guildId: string, client: Bot) {
        const suggestion = new Suggestion(id, guildId, client);
        await suggestion.refresh();
        return suggestion;
    }

    constructor(id: string, guildId: string, client: Bot) {
        this.id = id;
        this.guildId = guildId;
        this.client = client;
    }

    public async getApiData() {
        const suggestion = await this.client.suggestionsApi.getSuggestion(this.id, this.guildId) ?? undefined;
        this.apiData = suggestion;
    }

    public async getDbData() {
        if (!this.id) {
            this.client.logger.error("Suggestion id was undefined when retrieving it? ( guildId: " + chalk.yellow(this.guildId) + " )");
            return;
        }
        const suggestion = await SuggestionModel.findOne({ where: { suggestionId: this.id, guildId: this.guildId } }) ?? undefined;
        this.dbData = suggestion;
    }

    public async getComments() {
        const comments = await this.client.suggestionsApi.getSuggestionComments(this.id, this.guildId);
        this.comments = comments;
    }

    public async getAuthor() {
        if (!this.apiData) throw new Error("Api data was not defined!");
        const author = NamelessUser.getUserById(this.apiData.author.id, this.guildId, this.client);
        return author;
    }

    public async refresh() {
        await this.getApiData();
        await this.getDbData();
        await this.getComments();
    }
}