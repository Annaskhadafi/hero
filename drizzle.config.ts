import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./lib/server-env";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: serverEnv.databaseUrl,
  },
});
