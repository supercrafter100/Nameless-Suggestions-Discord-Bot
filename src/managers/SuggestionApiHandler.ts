/* eslint-disable @typescript-eslint/no-var-requires */
import Bot from './Bot';
import { readdirSync } from 'fs';
import { join } from 'path';
import BaseSuggestionAPI from './BaseSuggestionAPI.js';
import Database from '../database/Database.js';
import chalk from 'chalk';

export default class {
    constructor(private readonly bot: Bot) {}

    private readonly loadedApi: BaseSuggestionAPI[] = [];

    loadApiVersions() {
        const endpoints = readdirSync(join(__dirname, './suggestionsApi/'));
        for (const endpoint of endpoints) {
            const endpointPath = join(__dirname, './suggestionsApi/', endpoint);
            if (endpoint.endsWith('.js') || endpoint.endsWith('.ts')) {
                const endpointName = endpoint.slice(0, -3);
                const endpointClass = require(endpointPath).default;
                if (endpointClass) {
                    this.bot.logger.info(`Loaded api handler ${chalk.yellow(endpointName)}`);
                    this.loadedApi.push(new endpointClass(this.bot));
                }
            }
        }

        // Sort the endpoints from most recent to least recent
        this.loadedApi.sort((a, b) => b.minVersion - a.minVersion);
        this.bot.logger.info(`Loaded ${chalk.yellow(this.loadedApi.length)} api handlers`);
    }

    async getApi(guildId: string): Promise<BaseSuggestionAPI> {
        // Attempt to fetch the site version from the database
        const redisApiVersion = await this.bot.redis.get(`suggestionapi:${guildId}:version`);
        const apiVersion = redisApiVersion ? parseInt(redisApiVersion) : await this.fetchApiVersion(guildId);
        if (!apiVersion)
            throw new Error('Something went wrong while fetching the api version for this guild ' + guildId);

        if (!redisApiVersion)
            await this.bot.redis.set(`suggestionapi:${guildId}:version`, apiVersion?.toString(), 'EX', 60 * 60 * 24); // Cache for 1 day
        let suitableApi = this.loadedApi.find(
            (api) => (api.minVersion <= apiVersion && api.maxVersion) || Number.MAX_SAFE_INTEGER >= apiVersion
        );
        if (!suitableApi) {
            this.bot.logger.warn(`No suitable api handler found for guild ${guildId} with version ${apiVersion}`);
            suitableApi = this.loadedApi[0]; // Fall back to the most recent api handler
        }
        return suitableApi;
    }

    async fetchApiVersion(guildId: string) {
        const credentials = await Database.getApiCredentials(guildId);
        if (!credentials) return null;

        // Assume that they are using the most recent NamelessMC version and attempt to fetch with the most recent version of the api
        const api = this.loadedApi[0];
        const info = await api.getWebsiteInfo(credentials);
        return parseInt(info.nameless_version.replace(/\./g, ''));
    }
}
