import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = 'force-dynamic';

// Next.js App Router handler for Better Auth endpoints (/api/auth/*)
export const { GET, POST } = toNextJsHandler(auth.handler);
