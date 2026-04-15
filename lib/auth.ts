import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema/auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
    plugins: [nextCookies()],
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
    },
    ...(isGoogleAuthEnabled
        ? {
              socialProviders: {
                  google: {
                      clientId: googleClientId as string,
                      clientSecret: googleClientSecret as string,
                  },
              },
          }
        : {}),
});
