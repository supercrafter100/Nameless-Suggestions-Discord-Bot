import { APIUser } from 'discord.js';
import {
    APIWebsiteInfo,
    ApiListSuggestion,
    ApiSuggestion,
    ApiComment,
    ApiCommentsResponse,
} from '../../types/index.js';
import BaseSuggestionAPI, { ApiCredentials, createWebhookOptions, reactionType } from '../BaseSuggestionAPI.js';
import TypedJsonFetch from '../../util/TypedFetch.js';

export default class extends BaseSuggestionAPI {
    async getWebsiteInfo(credentials: ApiCredentials): Promise<APIWebsiteInfo> {
        return await TypedJsonFetch<APIWebsiteInfo>(credentials.url + 'info', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${credentials.key}`,
            },
        });
    }
    async createWebhook(credentials: ApiCredentials, options: createWebhookOptions): Promise<boolean> {}
    async getSuggestions(credentials: ApiCredentials): Promise<ApiListSuggestion> {
        throw new Error('Method not implemented.');
    }
    async getSuggestion(credentials: ApiCredentials, id: string): Promise<ApiSuggestion> {
        throw new Error('Method not implemented.');
    }
    async createReaction(
        credentials: ApiCredentials,
        suggestionId: string,
        type: reactionType,
        userId: string,
        mustBeRemoved: boolean
    ): Promise<unknown> {
        throw new Error('Method not implemented.');
    }
    async createComment(credentials: ApiCredentials, content: string, userId: string): Promise<unknown> {
        throw new Error('Method not implemented.');
    }
    async getComment(credentials: ApiCredentials, suggestionId: string, commentId: string): Promise<ApiComment> {
        throw new Error('Method not implemented.');
    }
    async getSuggestionComments(credentials: ApiCredentials, suggestionId: string): Promise<ApiCommentsResponse> {
        throw new Error('Method not implemented.');
    }
    async createSuggestion(
        credentials: ApiCredentials,
        title: string,
        content: string,
        userId: string
    ): Promise<unknown> {
        throw new Error('Method not implemented.');
    }
    async getUser(credentials: ApiCredentials, userId: string): Promise<APIUser> {
        throw new Error('Method not implemented.');
    }
    async getUserByDiscordId(credentials: ApiCredentials, userId: string): Promise<APIUser> {
        throw new Error('Method not implemented.');
    }
}
