import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const legacyPool = new Pool({
  connectionString:
    process.env.SAP_DB_URL?.trim() ||
    "postgresql://onechitranewdb:Wusthochq2018-@31.97.187.38:5475/onechitranewdb",
  ssl: false,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  max: 10,
});

export const legacyDb = drizzle({ client: legacyPool, schema });
