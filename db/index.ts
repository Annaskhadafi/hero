import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse one pool for the process and across hot reloads. Creating a Pool per
  // query quickly exhausts PostgreSQL connections and makes auth look invalid.
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

  const parsedMax = process.env.DB_MAX_CONNECTIONS
    ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
    : NaN;
  const maxConnections =
    !isNaN(parsedMax) && parsedMax > 0
      ? parsedMax
      : process.env.NODE_ENV === "production"
      ? 15
      : 10;

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(connectionString),
    idleTimeoutMillis: process.env.NODE_ENV === "production" ? 15000 : 5000,
    connectionTimeoutMillis: 30000,
    max: maxConnections,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  });

  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  globalThis.heroDbPool = pool;
  globalThis.heroDbConnectionString = connectionString;

  return pool;
}

let cachedPool: Pool | undefined;

function getDb(): ReturnType<typeof drizzle> {
  const currentPool = getPool();
  if (!drizzleDb || cachedPool !== currentPool) {
    cachedPool = currentPool;
    drizzleDb = drizzle({ client: currentPool });
  }

  return drizzleDb;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, property, receiver);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});
