/* eslint-disable @typescript-eslint/no-var-requires */
import BaseSuggestionHandler from './BaseSuggestionHandler.js';
import Bot from './Bot.js';
import { join } from 'path';
import { readdirSync } from 'fs';
import chalk from 'chalk';

export default class {
    constructor(private readonly bot: Bot) {}

    private readonly loadedHandler: BaseSuggestionHandler[] = [];

    loadHandlerVersions() {
        const endpoints = readdirSync(join(__dirname, './suggestionsHandler/'));
        for (const endpoint of endpoints) {
            const endpointPath = join(__dirname, './suggestionsHandler/', endpoint);
            if (endpoint.endsWith('.js') || endpoint.endsWith('.ts')) {
                const endpointName = endpoint.slice(0, -3);
                const endpointClass = require(endpointPath).default;
                if (endpointClass) {
                    this.bot.logger.info(`Loaded api handler ${chalk.yellow(endpointName)}`);
                    this.loadedHandler.push(new endpointClass(this.bot));
                }
            }
        }

        // Sort the endpoints from most recent to least recent
        this.loadedHandler.sort((a, b) => b.minVersion - a.minVersion);
        this.bot.logger.info(`Loaded ${chalk.yellow(this.loadedHandler.length)} api handlers`);
    }

    async getHandler(guildId: string): Promise<BaseSuggestionHandler> {
        // Attempt to fetch the site version from the database
        const redisApiVersion = await this.bot.redis.get(`suggestionapi:${guildId}:version`);
        const apiVersion = redisApiVersion
            ? parseInt(redisApiVersion)
            : await this.bot.suggestionsApi.fetchApiVersion(guildId);
        if (!apiVersion)
            throw new Error('Something went wrong while fetching the api version for this guild ' + guildId);

        if (!redisApiVersion)
            await this.bot.redis.set(`suggestionapi:${guildId}:version`, apiVersion?.toString(), 'EX', 60 * 60 * 24); // Cache for 1 day
        let suitableApi = this.loadedHandler.find(
            (api) => (api.minVersion <= apiVersion && api.maxVersion) || Number.MAX_SAFE_INTEGER >= apiVersion
        );
        if (!suitableApi) {
            this.bot.logger.warn(`No suitable api handler found for guild ${guildId} with version ${apiVersion}`);
            suitableApi = this.loadedHandler[0]; // Fall back to the most recent api handler
        }

        suitableApi.api = await this.bot.suggestionsApi.getApi(guildId);
        return suitableApi;
    }
}
