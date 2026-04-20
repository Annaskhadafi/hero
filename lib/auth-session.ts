import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

function isFailedToGetSessionError(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const maybeError = error as {
        status?: string;
        statusCode?: number;
        body?: {
            code?: string;
            message?: string;
        };
    };

    return (
        maybeError.body?.code === "FAILED_TO_GET_SESSION" ||
        maybeError.status === "INTERNAL_SERVER_ERROR" ||
        maybeError.statusCode === 500
    );
}

export const getServerSession = cache(async function getServerSession() {
    try {
        return await auth.api.getSession({
            headers: await headers(),
        });
    } catch (error) {
        if (isFailedToGetSessionError(error)) {
            console.warn("[auth-session] falling back to null session", error);
            return null;
        }

        throw error;
    }
});
