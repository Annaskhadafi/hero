import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server-env";

declare global {
  // Reuse the same pool during hot reloads in development.
  var heroDbPool: Pool | undefined;
}

const pool = globalThis.heroDbPool ?? new Pool({ connectionString: serverEnv.databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalThis.heroDbPool = pool;
}

export const db = drizzle({ client: pool });
