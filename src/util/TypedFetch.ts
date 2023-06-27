export default async function TypedJsonFetch<T>(url: RequestInfo | URL, options: RequestInit | undefined) {
    return (await fetch(url).then((res) => res.json())) as T;
}
