import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 450): Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            attempt++;
            const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase();
            const isNetworkError =
                err?.code === 'ECONNRESET' ||
                err?.code === 'ETIMEDOUT' ||
                err?.code === 'ECONNREFUSED' ||
                err?.code === '53300' ||
                errStr.includes('econnreset') ||
                errStr.includes('connection terminated') ||
                errStr.includes('timeout exceeded') ||
                errStr.includes('trying to connect') ||
                errStr.includes('too many clients') ||
                errStr.includes('sorry, too many clients') ||
                errStr.includes('remaining connection slots') ||
                errStr.includes('remaining connection slots are reserved') ||
                errStr.includes('connection reset');
            if (attempt <= retries && isNetworkError) {
                await new Promise((res) => setTimeout(res, delayMs * attempt));
                continue;
            }
            throw err;
        }
    }
}

export const getServerSession = cache(async function getServerSession() {
    try {
        let reqHeaders: Headers | undefined;
        try {
            reqHeaders = await headers();
        } catch {
            // Outside request context (e.g. background script / test)
        }

        return await withDbRetry(
            () =>
                auth.api.getSession({
                    headers: reqHeaders ?? new Headers(),
                }),
            3,
            350
        );
    } catch (err: any) {
        console.warn("[getServerSession] Warning: Session DB connection timeout, falling back gracefully to null:", err?.message || err);
        return null;
    }
});
 
