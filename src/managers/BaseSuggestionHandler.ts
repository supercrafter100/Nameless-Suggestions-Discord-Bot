import { ButtonInteraction, Message, Snowflake, EmbedBuilder } from 'discord.js';
import { ApiComment } from '../api/types/index.js';
import { Suggestion } from '../classes/Suggestion.js';
import Guild from '../database/models/guild.model.js';
import BaseSuggestionAPI, { reactionType } from './BaseSuggestionAPI.js';
import Bot from './Bot.js';
import chalk from 'chalk/index.js';
import Database from '../database/Database.js';

export default abstract class BaseSuggestionHandler {
    abstract minVersion: number;
    abstract maxVersion: number | undefined;

    public api: BaseSuggestionAPI;
    public bot: Bot;

    public sentThreadMessages = new Set<`${string}-${string}-${string}`>();

    constructor(api: BaseSuggestionAPI, bot: Bot) {
        this.api = api;
        this.bot = bot;
    }

    /**
     * Create a suggestion in a suggestion channel
     * @param suggestion The suggestion to create
     * @param guildInfo The guild info to use
     */
    abstract createSuggestion(suggestion: Suggestion, guildInfo: Guild): Promise<void>;

    /**
     * Create a comment for a suggestion in a suggestion thread
     * @param suggestion The suggestion to create a coomment for
     * @param guildInfo The guild info to use
     * @param comment The comment to create
     */
    abstract createComment(suggestion: Suggestion, guildInfo: Guild, comment: ApiComment): Promise<void>;

    /**
     * Send a comment to the website
     * @param msg The discord message to use for sending the comment
     */
    abstract sendComment(msg: Message<true>): Promise<void>;

    /**
     * Handle a like or dislike button interaction
     * @param interaction The button interaction to handle
     * @param interactionType If the button clicked was a like or dislike button
     */
    abstract handleReactionInteraction(interaction: ButtonInteraction, interactionType: reactionType): Promise<void>;

    /**
     * Update the embed of a suggestion
     * @param suggestion The suggestion to update the embed for
     * @param guildInfo The guild info to use
     */
    abstract updateSuggestionEmbed(suggestion: Suggestion, guildInfo: Snowflake): Promise<void>;

    /**
     * Remove a deleted comment from a suggestion thread
     * @param suggestion The suggestion to delete a comment for
     * @param commentId The id of the comment to remove
     */
    abstract removedDeletedComment(suggestion: Suggestion, commentId: string): Promise<void>;

    /**
     * Remove a deleted suggestion from the suggestion channel
     * @param suggestion The suggestion to remove
     */
    abstract removeDeletedSuggestion(suggestion: Suggestion): Promise<void>;

    /**
     * Create a suggestion embed
     * @param suggestion The suggestion to create an embed for
     * @param guildId The guild id used for the translations
     */
    abstract createEmbed(suggestion: Suggestion, guildId: Snowflake): Promise<EmbedBuilder>;

    /**
     * Construct a composite id for a thread message
     * @param guildId The guild id to use
     * @param suggestionId The suggestion id to use
     * @param commentId The comment id to use
     * @returns A composite id for a thread message
     */
    public createThreadMessageCompositeId(
        guildId: string,
        suggestionId: string,
        commentId: number
    ): `${string}-${string}-${string}` {
        return `${guildId}-${suggestionId}-${commentId}`;
    }

    /**
     * Recover a suggestion in case we have no information about it
     * @param suggestion The suggestion to recover
     * @param guildData The guild data to use
     */
    public async recoverSuggestion(suggestion: Suggestion, guildData: Guild): Promise<void> {
        if (!suggestion.apiData) return;

        await this.createSuggestion(suggestion, guildData);
        if (!suggestion.comments) {
            this.bot.logger.error(
                `Error getting comments for suggestion ${suggestion.apiData.id} from API: ${JSON.stringify(
                    suggestion.comments
                )}`
            );
            return;
        }

        // Load all comments into the suggestion
        await suggestion.refresh();
        for (let i = 0; i < suggestion.comments.comments.length - 1; i++) {
            const comment = suggestion.comments.comments[i];
            this.bot.logger.debug('Creating new comment from API. Comment ID: ' + chalk.yellow(comment.id));
            await this.createComment(suggestion, guildData, comment);
        }
    }

    /**
     * Replace message placeholders in a string
     * @param guildId The guild id to use for credentials
     * @param content The content of the message to replace placeholders in
     * @returns A promise that resolves with the replaced content
     */
    public async replaceMessagePlaceholders(guildId: string, content: string) {
        // User placeholders
        const regex = /\[user\](\d+)\[\/user\]/gm;
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const fullMatch = m[0];
            const numMatch = m[1];

            const apiCredentials = await Database.getApiCredentials(guildId);
            if (!apiCredentials) {
                return content;
            }

            const siteUser = await this.api.getUser(apiCredentials, numMatch).catch(() => undefined);
            if (!siteUser) {
                continue;
            }

            const url = new URL(apiCredentials.url);
            content = content
                .split(fullMatch)
                .join(
                    `[@${siteUser.username}](${url.protocol}//${url.hostname}/profile/${encodeURIComponent(
                        siteUser.username
                    )})`
                );
        }

        // Suggestion placeholders
        const regex2 = /\[suggestion\](\d+)\[\/suggestion\]/gm;
        let m2;
        while ((m2 = regex2.exec(content)) !== null) {
            if (m2.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }

            const fullMatch = m2[0];
            const numMatch = m2[1];

            const suggestion = await Suggestion.getSuggestion(numMatch, guildId, this.bot);
            if (!suggestion.apiData) {
                continue;
            }

            const messageUrl = `https://discord.com/channels/${guildId}/${suggestion.dbData?.channelId}/${suggestion.dbData?.messageId}`;
            content = content.split(fullMatch).join(`[#${suggestion.apiData.id}](${messageUrl})`);
        }

        return content;
    }

    /**
     * Replace discord mentions in a string
     * @param guildId The guild id to use for credentials
     * @param content The content of the message to replace placeholders in
     * @returns A promise that resolves with the replaced content
     */
    public async replaceDiscordMentions(guildId: string, content: string) {
        // Replacing literal discord mentions
        const regex = /<@!?(\d+)>/gm;
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const fullMatch = m[0];
            const numMatch = m[1];

            // Fetch the user from the api
            const apiCredentials = await Database.getApiCredentials(guildId);
            if (!apiCredentials) {
                return content;
            }

            const user = await this.bot.users.fetch(numMatch).catch(() => undefined);
            let userMention = `@${user ? user.username : 'Unknown user'}`;

            const siteUser = await this.api.getUserByDiscordId(apiCredentials, numMatch).catch(() => undefined);
            if (siteUser) {
                userMention = `[user]${siteUser.id}[/user]`;
            }

            content = content.split(fullMatch).join(userMention);
        }

        // Replacing suggestion mentions
        const regex2 = /#(\d+)/gm;
        let m2;
        while ((m2 = regex2.exec(content)) !== null) {
            if (m2.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }

            const fullMatch = m2[0];
            const numMatch = m2[1];

            const suggestion = await Suggestion.getSuggestion(numMatch, guildId, this.bot);
            if (!suggestion.apiData || !suggestion.apiData.id) {
                continue;
            }

            content = content.split(fullMatch).join(`[suggestion]${suggestion.apiData.id}[/suggestion]`);
        }

        return content;
    }
}
