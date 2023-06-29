export function stripLength(str: string, length: number) {
    if (str.length > length) {
        return str.substring(0, length - 3) + '...';
    }
    return str;
}
export function parseAvatarUrl(url: string) {
    url = url.replace(/ +/g, ''); // Apparently names can have spaces in them?
    url = url.replace('.svg', '.png');
    return url;
}

export function fixContent(content: string) {
    const map: Record<string, string> = {
        '&amp;': '&',
        '&#038;': '&',
        '&nbsp;': ' ',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&#8217;': '’',
        '&#8216;': '‘',
        '&#8211;': '–',
        '&#8212;': '—',
        '&#8230;': '…',
        '&#8221;': '”',
    };
    return content.replace(/<br \/>/g, '').replace(/&[\w\d#]{2,5};/g, (m) => map[m] ?? m);
}
