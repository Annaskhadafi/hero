import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function isDatabaseConnectionError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    return ["ECONNREFUSED", "connect ECONNREFUSED", "Connection terminated unexpectedly"].some((pattern) =>
        error.message.includes(pattern),
    );
}

const authHandlers = toNextJsHandler(auth);

async function handleAuth(request: Request, method: "GET" | "POST") {
    try {
        return await authHandlers[method](request);
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

export const GET = (request: Request) => handleAuth(request, "GET");
export const POST = (request: Request) => handleAuth(request, "POST");
