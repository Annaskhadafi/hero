import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { getClientAuthBaseUrl } from "@/lib/auth-config";

export const authClient = createAuthClient({
    ...(getClientAuthBaseUrl() ? { baseURL: getClientAuthBaseUrl() } : {}),
    plugins: [magicLinkClient()],
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;
