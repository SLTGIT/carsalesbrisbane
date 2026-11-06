/**
 * WordPress API Client
 * Core client configuration and fetch utilities
 */

const API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || process.env.WORDPRESS_API_URL || '';

/**
 * Construct full API URL from endpoint
 */
export const getAPIUrl = (endpoint: string): string => {
    return `${API_URL}${endpoint}`;
};

/**
 * Generic fetch wrapper with error handling and authentication
 */
export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = getAPIUrl(endpoint);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add authentication if credentials are provided
    if (process.env.WORDPRESS_AUTH_USERNAME && process.env.WORDPRESS_AUTH_PASSWORD) {
        const credentials = Buffer.from(
            `${process.env.WORDPRESS_AUTH_USERNAME}:${process.env.WORDPRESS_AUTH_PASSWORD}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers as Record<string, string>),
        },
        // cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Like fetchAPI but also returns WordPress pagination headers.
 */
export async function fetchAPIWithMeta<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<{ data: T; total: number; totalPages: number }> {
    const url = getAPIUrl(endpoint);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (process.env.WORDPRESS_AUTH_USERNAME && process.env.WORDPRESS_AUTH_PASSWORD) {
        const credentials = Buffer.from(
            `${process.env.WORDPRESS_AUTH_USERNAME}:${process.env.WORDPRESS_AUTH_PASSWORD}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers as Record<string, string>),
        },
        cache: 'force-cache',
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    return {
        data: await response.json(),
        total: parseInt(response.headers.get('X-WP-Total') || '0', 10),
        totalPages: parseInt(response.headers.get('X-WP-TotalPages') || '0', 10),
    };
}

/**
 * Export API_URL for use in other modules
 */
export { API_URL };
