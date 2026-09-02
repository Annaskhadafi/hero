import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

declare global {
  var legacyDbPool: Pool | undefined;
}

const legacyPool =
  globalThis.legacyDbPool ??
  new Pool({
    connectionString:
      process.env.SAP_DB_URL?.trim() ||
      "postgresql://onechitranewdb:Wusthochq2018-@31.97.187.38:5475/onechitranewdb",
    ssl: false,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.legacyDbPool = legacyPool;
}

export const legacyDb = drizzle({ client: legacyPool, schema });

