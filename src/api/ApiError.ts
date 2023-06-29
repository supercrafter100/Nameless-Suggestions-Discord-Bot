import { ApiError } from './types/index.js';

export default class extends Error {
    public raw: string;
    public namespace: string;
    public code: string;

    constructor(json: ApiError) {
        if (json.message) super(json.message);
        else super(json.error);

        const parts = json.error.split(':');
        this.namespace = parts[0];
        this.code = parts[1];
        this.raw = json.error;
    }
}
