import ApiError from '../api/ApiError.js';
import { ApiCredentials } from '../managers/BaseSuggestionAPI.js';

export async function TypedJsonFetch<T>(url: RequestInfo | URL, options: RequestInit | undefined) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    const json = await response.json();
    if (json.error) throw new ApiError(json);

    return json as T;
}
export async function TypedAPIFetch<T>(
    credentials: ApiCredentials,
    endpoint: string,
    type: 'GET' | 'POST' = 'GET',
    body: object = {}
) {
    if (credentials.url.endsWith('/')) credentials.url = credentials.url.slice(0, -1);
    return await TypedJsonFetch<T>(credentials.url + endpoint, {
        method: type,
        headers: {
            Authorization: `Bearer ${credentials.key}`,
        },
        body: JSON.stringify(body),
    });
}
