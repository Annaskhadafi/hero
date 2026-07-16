import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const legacyPool = new Pool({
  connectionString: 'postgresql://satuchitra:Wusthochq2018-@31.97.187.38:5432/satuchitra',
  ssl: false,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  max: 10,
});

export const legacyDb = drizzle({ client: legacyPool });
