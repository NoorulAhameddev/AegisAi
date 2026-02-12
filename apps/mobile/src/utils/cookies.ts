export const parseSetCookie = (header: string | string[]): { [key: string]: string } => {
    const cookies: { [key: string]: string } = {};

    const processCookie = (str: string) => {
        // Only take the first part (key=value) before semicolon
        const parts = str.split(';');
        const [key, value] = parts[0].split('=');
        if (key && value) {
            cookies[key.trim()] = value.trim();
        }
    };

    if (Array.isArray(header)) {
        header.forEach(processCookie);
    } else if (typeof header === 'string') {
        processCookie(header);
    }

    return cookies;
};

export const formatCookieHeader = (cookies: { [key: string]: string | null }): string => {
    return Object.entries(cookies)
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
};
