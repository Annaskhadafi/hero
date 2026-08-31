import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema/auth";
import { getServerAuthBaseUrl, getTrustedOrigins } from "@/lib/auth-config";
import { buildMagicLinkEmail, buildResetPasswordEmail, sendAuthEmail } from "@/lib/auth-email";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret =
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";

export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
    secret: authSecret || undefined,
    baseURL: getServerAuthBaseUrl(),
    trustedOrigins: async (request) => getTrustedOrigins(request),
    session: {
        cookieCache: {
            enabled: false,
        },
    },
    plugins: [
        nextCookies(),
        magicLink({
            disableSignUp: true,
            sendMagicLink: async ({ email, url }) => {
                await sendAuthEmail(buildMagicLinkEmail(email, url));
            },
        }),
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user,
            account,
            session,
            verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        sendResetPassword: async ({ user: authUser, url }) => {
            await sendAuthEmail(buildResetPasswordEmail(authUser.email, url));
        },
    },
    ...(isGoogleAuthEnabled
        ? {
              socialProviders: {
                  google: {
                      clientId: googleClientId as string,
                      clientSecret: googleClientSecret as string,
                      disableSignUp: true,
                  },
              },
          }
        : {}),
});
