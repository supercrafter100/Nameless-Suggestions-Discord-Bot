import Bot from './Bot';
import fetch from 'node-fetch';
import Database from '../database/Database';
import { APIWebsiteInfo, ApiCommentsResponse, ApiListSuggestion, ApiSuggestion, ApiUser } from '../types';

export default class {
    constructor(private readonly bot: Bot) {}

    //
    // General endpoints
    //

    public async getWebsiteInfo(guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return null;
        }

        const suggestion = (await fetch(apiCredentials.apiurl + 'info', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined)) as APIWebsiteInfo;

        return suggestion;
    }

    public async createWebhook(guildId: string, options: { name?: string; url: string; events: string[] }) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return null;
        }

        const result = await fetch(apiCredentials.apiurl + 'webhooks/create', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
            body: JSON.stringify({
                name: options.name || 'Suggestions Bot',
                url: options.url,
                type: '1',
                events: options.events,
            }),
        }).then((res) => res.json());

        if (result.message) return true;
        return false;
    }

    //
    // Suggestion related endpoints
    //

    public async getSuggestion(id: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return null;
        }

        const suggestion = (await fetch(apiCredentials.apiurl + 'suggestions/' + id, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined)) as ApiSuggestion;

        return suggestion;
    }

    public async sendReaction(
        suggestionId: string,
        guildId: string,
        type: 'like' | 'dislike',
        userId: string,
        mustBeRemoved: boolean
    ) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const response = await fetch(apiCredentials.apiurl + 'suggestions/' + suggestionId + '/' + type, {
            method: 'POST',
            body: JSON.stringify({
                user: `integration_id:discord:${userId}`,
                like: mustBeRemoved,
                dislike: mustBeRemoved,
            }),
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined);

        return response;
    }

    public async sendComment(suggestionId: string, guildId: string, content: string, userId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const response = await fetch(apiCredentials.apiurl + 'suggestions/' + suggestionId + '/comment', {
            method: 'POST',
            body: JSON.stringify({
                user: `integration_id:discord:${userId}`,
                content,
            }),
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined);

        return response;
    }

    //
    // SUGGEST CMD
    //

    public async sendSuggestion(guildId: string, title: string, content: string, userId = '') {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        type bodyType = { title: string; content: string; user?: string };

        const body: bodyType = {
            title,
            content,
        };
        if (userId.length > 0) {
            body.user = `integration_id:discord:${userId}`;
        }

        const response = await fetch(apiCredentials.apiurl + 'suggestions/create', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined);

        return response;
    }

    //
    // UTILITY METHODS (used for things idk)
    //

    public async getSuggestions(guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const suggestions = (await fetch(apiCredentials.apiurl + 'suggestions', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined)) as ApiListSuggestion;

        return suggestions;
    }

    public async getSuggestionComments(suggestionId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const comments = (await fetch(apiCredentials.apiurl + 'suggestions/' + suggestionId + '/comments', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        })
            .then((res) => res.json())
            .catch(() => undefined)) as ApiCommentsResponse;

        return comments;
    }

    public async getCommentInfo(suggestionId: string, commentId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const comment = await fetch(
            apiCredentials.apiurl + 'suggestions/' + suggestionId + '/comments/&comment=' + commentId,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiCredentials.apikey}`,
                },
            }
        )
            .then((res) => res.json() as Promise<ApiCommentsResponse>)
            .then((json) => json.comments[0])
            .catch(() => undefined);

        return comment;
    }

    public async getUserInfo(userId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const user = (await fetch(apiCredentials.apiurl + 'users/id:' + userId, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json())) as Promise<ApiUser>;

        return user;
    }

    public async getUserInfoByIntegrationId(integrationId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const user = (await fetch(apiCredentials.apiurl + 'users/integration_id:discord:' + integrationId, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json())) as Promise<ApiUser>;

        return user;
    }
}
