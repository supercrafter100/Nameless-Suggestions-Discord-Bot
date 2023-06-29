import { Snowflake } from 'discord.js';
import {
    APIWebsiteInfo,
    ApiComment,
    ApiCommentsResponse,
    ApiListSuggestion,
    ApiSuggestion,
    CreateCommentResponse,
    SendReactionResponse,
    ApiUser,
} from '../../api/types/index.js';
import BaseSuggestionAPI, { ApiCredentials, createWebhookOptions, reactionType } from '../BaseSuggestionAPI.js';
import { TypedAPIFetch } from '../../util/TypedFetch.js';
import { Routes } from '../../api/rest.js';
import UserTransformerBuilder from '../../api/lib/UserTransformerBuilder.js';
import UserTransformer from '../../api/lib/UserTransformer.js';

export default class extends BaseSuggestionAPI {
    public readonly minVersion = 210;
    public readonly maxVersion = 220;

    async getWebsiteInfo(credentials: ApiCredentials): Promise<APIWebsiteInfo> {
        return await TypedAPIFetch<APIWebsiteInfo>(credentials, Routes.getInfo());
    }

    async createWebhook(credentials: ApiCredentials, options: createWebhookOptions): Promise<void> {
        await TypedAPIFetch(credentials, Routes.createWebhook(), 'POST', {
            name: options.name || 'Suggestions Bot',
            url: options.url,
            type: '1',
            events: options.events,
        });
    }

    async getSuggestions(credentials: ApiCredentials): Promise<ApiListSuggestion> {
        return await TypedAPIFetch<ApiListSuggestion>(credentials, Routes.getSuggestions());
    }

    async getSuggestion(credentials: ApiCredentials, id: string): Promise<ApiSuggestion> {
        return await TypedAPIFetch<ApiSuggestion>(credentials, Routes.getSuggestion(id));
    }

    async createReaction(
        credentials: ApiCredentials,
        suggestionId: string,
        type: reactionType,
        userId: Snowflake,
        mustBeRemoved: boolean
    ): Promise<SendReactionResponse> {
        const userTransformer = UserTransformerBuilder(UserTransformer.INTEGRATION_ID, ['discord', userId]);
        return await TypedAPIFetch<SendReactionResponse>(
            credentials,
            Routes.createReaction(suggestionId, type),
            'POST',
            {
                user: userTransformer,
                like: mustBeRemoved,
                dislike: mustBeRemoved,
            }
        );
    }

    async createComment(
        credentials: ApiCredentials,
        suggestionId: string,
        content: string,
        userId: string
    ): Promise<CreateCommentResponse> {
        const userTransformer = UserTransformerBuilder(UserTransformer.INTEGRATION_ID, ['discord', userId]);
        return await TypedAPIFetch<CreateCommentResponse>(credentials, Routes.createComment(suggestionId), 'POST', {
            user: userTransformer,
            content: content,
        });
    }

    async getComment(credentials: ApiCredentials, suggestionId: string, commentId: string): Promise<ApiComment> {
        return await TypedAPIFetch<ApiComment>(credentials, Routes.getComment(suggestionId, commentId));
    }

    async getComments(credentials: ApiCredentials, suggestionId: string): Promise<ApiCommentsResponse> {
        return await TypedAPIFetch<ApiCommentsResponse>(credentials, Routes.getComments(suggestionId));
    }

    async createSuggestion(
        credentials: ApiCredentials,
        title: string,
        content: string,
        userId: string
    ): Promise<ApiSuggestion> {
        const userTransformer = UserTransformerBuilder(UserTransformer.INTEGRATION_ID, ['discord', userId]);
        return await TypedAPIFetch<ApiSuggestion>(credentials, Routes.createSuggestion(), 'POST', {
            title: title,
            content: content,
            user: userTransformer,
        });
    }
    async getUser(credentials: ApiCredentials, userId: string): Promise<ApiUser> {
        const userTransformer = UserTransformerBuilder(UserTransformer.ID, userId);
        return await TypedAPIFetch<ApiUser>(credentials, Routes.getUser(userTransformer));
    }
    async getUserByDiscordId(credentials: ApiCredentials, userId: string): Promise<ApiUser> {
        const userTransformer = UserTransformerBuilder(UserTransformer.INTEGRATION_ID, ['discord', userId]);
        return await TypedAPIFetch<ApiUser>(credentials, Routes.getUser(userTransformer));
    }
}
