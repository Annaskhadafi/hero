import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'

declare global {
  var legacyDbPool: Pool | undefined
}

const legacyDatabaseUrl = process.env.SAP_DB_URL?.trim() || process.env.ONECHITRA_DB_URL?.trim()
if (!legacyDatabaseUrl) {
  throw new Error('SAP_DB_URL or ONECHITRA_DB_URL is required to connect to the SAP database.')
}

const legacyPool =
  globalThis.legacyDbPool ??
  new Pool({
    connectionString: legacyDatabaseUrl,
    ssl: false,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.legacyDbPool = legacyPool
}

export const legacyDb = drizzle({ client: legacyPool, schema })
