import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse the same pool during hot reloads in development.
  var heroDbPool: Pool | undefined;
}

let drizzleDb: ReturnType<typeof drizzle> | undefined;

function getSslConfig(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode =
    url.searchParams.get("sslmode")?.toLowerCase() ||
    process.env.PGSSLMODE?.trim().toLowerCase() ||
    process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  const sslOverride = process.env.DATABASE_SSL?.trim().toLowerCase();
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);

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

  return isLocal ? false : { rejectUnauthorized: false };
}

function getPool() {
  const existingPool = globalThis.heroDbPool;

  if (existingPool) {
    return existingPool;
  }

  const connectionString = serverEnv.databaseUrl;

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(connectionString),
    idleTimeoutMillis: process.env.NODE_ENV === "production" ? 30000 : 10000,
    connectionTimeoutMillis: 15000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // A remote Postgres link can drop idle sockets (NAT/firewall) and an idle
  // client can emit an async error. Without this listener pg turns it into an
  // unhandled exception that can poison or crash the pool; logging here lets pg
  // evict the dead client and hand out a healthy one instead of timing out.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.heroDbPool = pool;
  }

  return pool;
}

function getDb() {
  if (drizzleDb) {
    return drizzleDb;
  }

  drizzleDb = drizzle({ client: getPool() });
  return drizzleDb;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, property, receiver);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});
