import { ApiSuggestion, ApiCommentsResponse } from '../api/types';
import SuggestionModel from '../database/models/suggestion.model';
import Bot from '../managers/Bot';
import chalk from 'chalk';
import { NamelessUser } from './NamelessUser';
import Database from '../database/Database.js';
import { ApiCredentials } from '../managers/BaseSuggestionAPI.js';

export class Suggestion {
    public apiData: ApiSuggestion | undefined;
    public comments: ApiCommentsResponse | undefined;
    public dbData: SuggestionModel | undefined;

    private id: string;
    private client: Bot;
    private guildId: string;
    private credentials!: ApiCredentials;

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
        const apiProvider = await this.client.suggestionsApi.getApi(this.guildId);
        const suggestion = await apiProvider.getSuggestion(this.credentials, this.guildId);
        this.apiData = suggestion;
    }

    public async getDbData() {
        if (!this.id) {
            this.client.logger.error(
                'Suggestion id was undefined when retrieving it? ( guildId: ' + chalk.yellow(this.guildId) + ' )'
            );
            return;
        }
        const suggestion =
            (await SuggestionModel.findOne({ where: { suggestionId: this.id, guildId: this.guildId } })) ?? undefined;
        this.dbData = suggestion;
    }

    public async getComments() {
        const apiProvider = await this.client.suggestionsApi.getApi(this.guildId);

        const comments = await apiProvider.getComments(this.credentials, this.id);
        this.comments = comments;
    }

    public async getAuthor() {
        if (!this.apiData) throw new Error('Api data was not defined!');
        const author = NamelessUser.getUserById(this.apiData.author.id, this.guildId, this.client);
        return author;
    }

    public async refresh() {
        const credentials = await Database.getApiCredentials(this.guildId);
        if (!credentials) throw new Error('Credentials were not found!');
        this.credentials = credentials;

        await this.getApiData();
        await this.getDbData();
        await this.getComments();
    }
}
