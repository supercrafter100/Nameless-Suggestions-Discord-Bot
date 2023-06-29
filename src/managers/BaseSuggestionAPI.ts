import { Snowflake } from 'discord.js';
import {
    APIWebsiteInfo,
    ApiComment,
    ApiCommentsResponse,
    ApiListSuggestion,
    ApiSuggestion,
    ApiUser,
    CreateCommentResponse,
    SendReactionResponse,
} from '../api/types/index.js';

export type createWebhookOptions = { name?: string; url: string; events: string[] };
export enum reactionType {
    LIKE = 'like',
    DISLIKE = 'dislike',
}
export type ApiCredentials = { url: string; key: string };

export default abstract class BaseSuggestionAPI {
    abstract minVersion: number;
    abstract maxVersion: number | undefined;

    /**
     * Get website info
     * @param credentials The credentials to use
     */
    abstract getWebsiteInfo(credentials: ApiCredentials): Promise<APIWebsiteInfo>;

    /**
     * Create a new webhook
     * @param credentials The credentials to use
     * @param options The options used for creating the webhook
     */
    abstract createWebhook(credentials: ApiCredentials, options: createWebhookOptions): Promise<void>;

    /**
     * Get a list of all suggestions from the site (CAN BE REALLY LONG)
     * @param credentials The credentials to use
     */
    abstract getSuggestions(credentials: ApiCredentials): Promise<ApiListSuggestion>;

    /**
     * Get a suggestion by id
     * @param credentials The credentials to use
     * @param id The suggestion id to request
     */
    abstract getSuggestion(credentials: ApiCredentials, id: string): Promise<ApiSuggestion>;

    /**
     * Send a reaction to the website
     * @param credentials The credentials to use
     * @param suggestionId The suggestion id to react to
     * @param type The type of reaction to add or remove
     * @param userId The discord user id to react as
     * @param mustBeRemoved If the reaction should be removed or not
     */
    abstract createReaction(
        credentials: ApiCredentials,
        suggestionId: string,
        type: reactionType,
        userId: Snowflake,
        mustBeRemoved: boolean
    ): Promise<SendReactionResponse>;

    /**
     * Create a comment on a suggestion
     * @param credentials The credentials to use
     * @param suggestionId The suggestion id to create a comment for
     * @param content The content of the comment
     * @param userId The user id of the discord user that sends the comment
     */
    abstract createComment(
        credentials: ApiCredentials,
        suggestionId: string,
        content: string,
        userId: Snowflake
    ): Promise<CreateCommentResponse>;

    /**
     * Get a comment for a suggestion
     * @param credentials The credentials to use
     * @param suggestionId The suggestion id to get the comment info for
     * @param commentId The id of the comment to get the info for
     */
    abstract getComment(credentials: ApiCredentials, suggestionId: string, commentId: string): Promise<ApiComment>;

    /**
     * Get all comments from a suggestion
     * @param credentials The credentials to use
     * @param suggestionId The suggestion id to get the comments for
     */
    abstract getComments(credentials: ApiCredentials, suggestionId: string): Promise<ApiCommentsResponse>;

    /**
     * Create a suggestion
     * @param credentials The credentials to use
     * @param title The title of the suggestion
     * @param content The content of the suggestion
     * @param userId The discord user id to suggest as
     */
    abstract createSuggestion(
        credentials: ApiCredentials,
        title: string,
        content: string,
        userId: Snowflake
    ): Promise<ApiSuggestion>;

    /**
     * Get info about a user by user id
     * @param credentials The credentials to use
     * @param userId The user id to get the info for
     */
    abstract getUser(credentials: ApiCredentials, userId: string): Promise<ApiUser>;

    /**
     * Get info about a user by discord user id
     * @param credentials The credentials to use
     * @param userId The user id to get the info for
     */
    abstract getUserByDiscordId(credentials: ApiCredentials, userId: Snowflake): Promise<ApiUser>;
}
