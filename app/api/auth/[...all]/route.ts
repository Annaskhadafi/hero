import { auth } from "@/lib/auth";

function isDatabaseConnectionError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    return ["ECONNREFUSED", "connect ECONNREFUSED", "Connection terminated unexpectedly"].some((pattern) =>
        error.message.includes(pattern),
    );
}

async function handleAuth(request: Request) {
    try {
        return await auth.handler(request);
    } catch (error) {
        console.error(`[auth-route] ${request.method} ${request.url} failed`, error);

        if (isDatabaseConnectionError(error)) {
            return Response.json(
                {
                    code: "AUTH_BACKEND_UNAVAILABLE",
                    message: "Authentication service is unavailable because the database connection failed.",
                },
                { status: 503 },
            );
        }

        return Response.json(
            {
                code: "AUTH_INTERNAL_ERROR",
                message: "Authentication request failed.",
            },
            { status: 500 },
        );
    }
}

export const GET = handleAuth;
export const POST = handleAuth;
