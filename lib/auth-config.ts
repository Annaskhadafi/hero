const FALLBACK_AUTH_ORIGINS = [
    "https://hero.chitraparatama.com",
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
function isProductionAuthOrigin(value: string) {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
}

function getRequestOrigin(request?: Request) {
    if (!request) {
        return undefined;
    }

    const origin = normalizeOrigin(request.headers.get("origin"));
    if (!origin) {
        return undefined;
    }

    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;

    try {
        return new URL(origin).host === requestHost ? origin : undefined;
    } catch {
        return undefined;
    }
}

function getConfiguredAuthOrigins() {
    return [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        process.env.APP_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
        "https://hero.chitraparatama.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
        .map(normalizeOrigin)
        .filter((value): value is string => Boolean(value))
        .filter((value, index, list): value is string => list.indexOf(value) === index);
}

export function getServerAuthBaseUrl() {
    const configured = normalizeOrigin(
        process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL
    );
    if (configured) {
        return configured;
    }
    const origins = getConfiguredAuthOrigins();
    if (origins.length > 0) {
        return origins[0];
    }
    return process.env.NODE_ENV === "production"
        ? "https://hero.chitraparatama.com"
        : "http://localhost:3000";
}

export function getClientAuthBaseUrl() {
    // Browser authentication must stay on the origin that served the page. A stale
    // public build variable must never send the login request (and cookie) to a
    // different deployment.
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    const configured = normalizeOrigin(
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    );
    if (configured) {
        return configured;
    }
    return undefined;
}

export function getTrustedOrigins(request?: Request) {
    // Trust the live deployment origin only when it matches the host seen by the
    // application/proxy. This supports Dokploy host changes without accepting an
    // arbitrary Origin header.
    const requestOrigin = getRequestOrigin(request);

    return [...getConfiguredAuthOrigins(), ...FALLBACK_AUTH_ORIGINS, requestOrigin].filter(
        (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
    );
}

export function getPublicAppUrl() {
    const customUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    if (customUrl) {
        const origin = normalizeOrigin(customUrl)
        if (origin) return origin
    }
    const candidates = [
        process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, ""),
        process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, ""),
    ]
    const origin = candidates.map(normalizeOrigin).find((url) => url && !url.includes("localhost") && !url.includes("127.0.0.1"))
    if (origin) {
        return origin
    }
    return "https://hero.chitraparatama.com"
}
