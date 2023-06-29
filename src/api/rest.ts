export const Routes = {
    /**
     * Route for:
     * - GET `/info`
     */
    getInfo() {
        return '/info' as const;
    },

    /**
     * Route for:
     * - GET `/users`
     */
    getUsers() {
        return '/users' as const;
    },

    /**
     * Route for:
     * - GET `/users/{user}`
     */
    getUser(filter: string) {
        return `/users/${filter}` as const;
    },

    /**
     * Route for:
     * - POST `/webhooks/create`
     */
    createWebhook() {
        return '/webhooks/create' as const;
    },

    /**
     * Route for:
     * - GET `/suggestions`
     */
    getSuggestions() {
        return '/suggestions' as const;
    },

    /**
     * Route for:
     * - GET `/suggestions/{id}`
     */
    getSuggestion(id: string) {
        return `/suggestions/${id}` as const;
    },

    /**
     * Route for:
     * - POST `/suggestions/create`
     */
    createSuggestion() {
        return '/suggestions/create' as const;
    },

    /**
     * Route for:
     * - POST `/suggestions/{id}/{like/dislike}`
     */
    createReaction(id: string, reaction: 'like' | 'dislike') {
        return `/suggestions/${id}/${reaction}` as const;
    },

    /**
     * Route for:
     * - POST `/suggestions/{id}/comment`
     */
    createComment(id: string) {
        return `/suggestions/${id}/comment` as const;
    },

    /**
     * Route for:
     * - GET `/suggestions/{id}/comments/&comment={comment}
     */
    getComment(id: string, comment: string) {
        return `/suggestions/${id}/comments/&comment=${comment}`;
    },

    /**
     * Route for:
     * - GET `/suggestions/{id}/comments`
     */
    getComments(id: string) {
        return `/suggestions/${id}/comments`;
    },
};
