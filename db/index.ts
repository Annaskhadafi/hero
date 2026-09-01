import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse the same pool during hot reloads in development.
  var heroDbPool: Pool | undefined;
  var heroDbConnectionString: string | undefined;
  var heroDrizzleDb: ReturnType<typeof drizzle> | undefined;
}

let drizzleDb: ReturnType<typeof drizzle> | undefined;

function getSslConfig(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode =
    url.searchParams.get("sslmode")?.toLowerCase() ||
    process.env.PGSSLMODE?.trim().toLowerCase() ||
    process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  const sslOverride = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (sslOverride === "false" || sslOverride === "0" || sslOverride === "no") {
    return false;
  }

  if (sslOverride === "true" || sslOverride === "1" || sslOverride === "yes") {
    return { rejectUnauthorized: false };
  }

  if (sslMode === "disable") {
    return false;
  }

  if (sslMode === "require" || sslMode === "prefer" || sslMode === "allow") {
    return { rejectUnauthorized: false };
  }

  return false;
}

function getPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL?.trim() || serverEnv.databaseUrl;

  if (
    globalThis.heroDbPool &&
    globalThis.heroDbConnectionString === connectionString
  ) {
    return globalThis.heroDbPool;
  }

  if (globalThis.heroDbPool) {
    try {
      globalThis.heroDbPool.end();
    } catch {
      // ignore cleanup
    }
  }

  const maxConnections = process.env.DATABASE_MAX_CONNECTIONS
    ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
    : process.env.NODE_ENV === "production"
    ? 10
    : 4;

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(connectionString),
    idleTimeoutMillis: 2000,
    connectionTimeoutMillis: 10000,
    max: maxConnections,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  });

  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  globalThis.heroDbPool = pool;
  globalThis.heroDbConnectionString = connectionString;
  globalThis.heroDrizzleDb = drizzle({ client: pool });

  return pool;
}

function getDb(): ReturnType<typeof drizzle> {
  if (
    globalThis.heroDrizzleDb &&
    globalThis.heroDbPool &&
    globalThis.heroDbConnectionString ===
      (process.env.DATABASE_URL?.trim() || serverEnv.databaseUrl)
  ) {
    return globalThis.heroDrizzleDb;
  }

  getPool();
  return globalThis.heroDrizzleDb!;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, property, receiver);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});
