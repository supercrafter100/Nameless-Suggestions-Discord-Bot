export interface ApiSuggestion {
    id: string;
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