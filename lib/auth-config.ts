const FALLBACK_AUTH_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
];

function normalizeOrigin(value?: string | null) {
    if (!value) {
        return undefined;
    }

    let trimmedValue = value.trim();

    if (!trimmedValue) {
        return undefined;
    }

    if (!trimmedValue.startsWith("http://") && !trimmedValue.startsWith("https://")) {
        trimmedValue = `https://${trimmedValue}`;
    }

    return trimmedValue.replace(/\/+$/, "").replace(/\/api\/auth$/i, "");
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
    const configured = normalizeOrigin(
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    );
    if (configured) {
        return configured;
    }
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return undefined;
}

export function getTrustedOrigins(_request?: Request) {
    return [...getConfiguredAuthOrigins(), ...FALLBACK_AUTH_ORIGINS].filter(
        (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
    );
}

export function getPublicAppUrl() {
    const candidates = [
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.APP_URL,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, ""),
        process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, ""),
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ]
    const origin = candidates.map(normalizeOrigin).find(Boolean)
    if (origin) {
        return origin
    }
    if (process.env.NODE_ENV !== "production") {
        return "http://localhost:3000"
    }
    return "https://hero.chitraparatama.com"
}

