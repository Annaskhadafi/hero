import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse the same pool during hot reloads in development.
  var heroDbPool: Pool | undefined;
}

let drizzleDb: ReturnType<typeof drizzle> | undefined;

function getPool() {
  const existingPool = globalThis.heroDbPool;

  if (existingPool) {
    return existingPool;
  }

  const connectionString = serverEnv.databaseUrl;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const pool = new Pool({ 
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    idleTimeoutMillis: 3000, // Very aggressive for development to prune stale sockets
    connectionTimeoutMillis: 5000,
    max: 10,
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
