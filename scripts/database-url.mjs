const DATABASE_URL_ENV_NAMES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRESQL_URL",
  "DATABASE_PUBLIC_URL",
];

export function getDatabaseUrl() {
  for (const name of DATABASE_URL_ENV_NAMES) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function getDatabaseUrlErrorMessage(context) {
  return `Environment variable DATABASE_URL is required to ${context}. Supported aliases: ${DATABASE_URL_ENV_NAMES.join(", ")}.`;
}
