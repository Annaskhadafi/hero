import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse the same pool during hot reloads in development.
  var heroDbPool: Pool | undefined;
  var heroDbConnectionString: string | undefined;
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

function getPool() {
  const connectionString =
    process.env.DATABASE_URL?.trim() || serverEnv.databaseUrl;

  const existingPool = globalThis.heroDbPool;
  const existingConnString = globalThis.heroDbConnectionString;

  if (existingPool && existingConnString === connectionString) {
    return existingPool;
  }

  if (existingPool) {
    try {
      existingPool.end();
    } catch {
      // ignore cleanup
    }
  }

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(connectionString),
    idleTimeoutMillis: process.env.NODE_ENV === "production" ? 30000 : 10000,
    connectionTimeoutMillis: 30000,
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.heroDbPool = pool;
    globalThis.heroDbConnectionString = connectionString;
  }

  return pool;
}

function getDb() {
  const currentPool = getPool();
  if (!drizzleDb) {
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
