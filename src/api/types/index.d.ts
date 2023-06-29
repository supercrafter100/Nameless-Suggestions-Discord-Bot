export interface APIWebsiteInfo {
    nameless_version: string;
    locale: string;
    modules: string[];
}

export interface ApiSuggestion {
    id: string;
    link: string;
    author: {
        id: string;
        username: string;
    };
    updated_by: {
        id: string;
        username: string;
    };
    status: {
        id: string;
        name: string;
        open: boolean;
        color?: string;
    };
    category: {
        id: string;
        name: string;
    };
    title: string;
    content: string;
    views: string;
    created: string;
    last_updated: string;
    likes_count: string;
    dislikes_count: string;
    likes: number[];
    dislikes: number[];
}

export interface ApiListSuggestion {
    suggestions: {
        id: string;
        title: string;
        status: {
            id: string;
            name: string;
            open: boolean;
        };
    }[];
}

export interface ApiComment {
    id: number;
    user: {
        id: string;
        username: string;
        nickname: string;
    };
    created: string;
    content: string;
}

export interface ApiCommentsResponse {
    suggestion: {
        id: string;
    };
    comments: ApiComment[];
}

export interface ApiUser {
    error?: string;
    exists: boolean;
    id: number;
    username: string;
    language_id: number;
    language: string;
    displayname: string;
    uuid: string;
    registered_timestamp: number;
    last_online_timestamp: number;
    banned: boolean;
    validated: boolean;
    user_title: string;
    discord_id: string;
    groups: {
        id: number;
        name: string;
        staff: boolean;
        order: number;
        ingame_rank_name: string;
        discord_role_id: string;
    }[];
    profile_fields: {
        name: string;
        type: number;
        public: boolean;
        required: boolean;
        description: string;
        value: string;
    };
    avatar_url?: string;
}

export interface CreateCommentResponse {
    comment_id: number;
}

export interface SendReactionResponse {
    message: string;
}

export interface ApiError {
    error: string;
    message: string;
    meta?: string[];
}
