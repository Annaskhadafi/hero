import { getDatabaseUrl, getDatabaseUrlErrorMessage } from "./lib/database-url";

const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  throw new Error(getDatabaseUrlErrorMessage("run Drizzle migrations"));
}

export default {
  out: "./drizzle",
  schema: "./db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
};
