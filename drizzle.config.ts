if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    "Environment variable DATABASE_URL is required to run Drizzle migrations.",
  );
}

export default {
  out: "./drizzle",
  schema: "./db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
