const FALLBACK_AUTH_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
];

function normalizeOrigin(value?: string | null) {
    if (!value) {
        return undefined;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return undefined;
    }

    if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
        return trimmedValue.replace(/\/+$/, "");
    }

    return `https://${trimmedValue}`.replace(/\/+$/, "");
}

function getConfiguredAuthOrigins() {
    return [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        process.env.APP_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
    ]
        .map(normalizeOrigin)
        .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
}

export function getServerAuthBaseUrl() {
    return getConfiguredAuthOrigins()[0];
}

export function getClientAuthBaseUrl() {
    return normalizeOrigin(process.env.NEXT_PUBLIC_BETTER_AUTH_URL);
}

export function getTrustedOrigins(request?: Request) {
    const requestOrigin = request ? normalizeOrigin(request.headers.get("origin")) : undefined;

    return [...getConfiguredAuthOrigins(), ...FALLBACK_AUTH_ORIGINS, requestOrigin].filter(
        (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
    );
}
