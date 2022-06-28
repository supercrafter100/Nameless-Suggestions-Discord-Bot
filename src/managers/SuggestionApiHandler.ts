import Bot from "./Bot";
import fetch from "node-fetch";
import Database from "../database/Database";
import Guild from "../database/models/guild.model";
import { ApiCommentsResponse, ApiListSuggestion, ApiSuggestion } from "../types";

export default class {

    constructor(private readonly bot: Bot) {}

    public async getSuggestion(id: number, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return null;
        }

        const suggestion = await fetch(apiCredentials.apiurl + "suggestions/" + id, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json()) as ApiSuggestion;

        return suggestion;
    }

    public async sendReaction(suggestionId: string, guildId: string, type: "like" | "dislike", userId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return;
        }

        const response = await fetch(apiCredentials.apiurl + "suggestions/" + suggestionId + "/" + type, {
            method: "POST",
            body: JSON.stringify({
                user: `integration_id:discord:${userId}`
            }),
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json());

        return response;
    }

    public async sendComment(suggestionId: string, guildId: string, content: string, userId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return;
        }

        const response = await fetch(apiCredentials.apiurl + "suggestions/" + suggestionId + "/comment", {
            method: "POST",
            body: JSON.stringify({
                user: `integration_id:discord:${userId}`,
                content
            }),
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json());

        return response;
    }

    //
    // UTILITY METHODS (used for things idk)
    //

    public async getSuggestions(guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return;
        }

        const suggestions = await fetch(apiCredentials.apiurl + "suggestions", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json()) as ApiListSuggestion;

        return suggestions;
    }

    public async getSuggestionComments(suggestionId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return;
        }

        const comments = await fetch(apiCredentials.apiurl + "suggestions/" + suggestionId + "/comments", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json()) as ApiCommentsResponse;

        return comments;
    }

    public async getCommentInfo(suggestionId: string, commentId: string, guildId: string) {
        const apiCredentials = await Database.getApiCredentials(guildId);
        if (!apiCredentials.apikey || !apiCredentials.apiurl) {
            return;
        }

        const comment = await fetch(apiCredentials.apiurl + "suggestions/" + suggestionId + "/comments/&comment=" + commentId, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiCredentials.apikey}`,
            },
        }).then((res) => res.json() as Promise<ApiCommentsResponse>).then((json) => json.comments[0]);

        return comment;
    }
}