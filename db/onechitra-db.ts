import { Pool } from "pg"

/**
 * Secondary connection to onechitranewdb — source of truth for customers.
 * Read-only usage: queries only, no writes to this DB.
 */

declare global {
  var _onechitaPool: Pool | undefined
}

function getOnechitaPool() {
  if (globalThis._onechitaPool) return globalThis._onechitaPool

  const pool = new Pool({
    connectionString:
      process.env.ONECHITRA_DB_URL ||
      "postgresql://onechitranewdb:Wusthochq2018-@31.97.187.38:5475/onechitranewdb",
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000, // 3s fast timeout to prevent blocking page rendering
  })

  pool.on("error", (err) => {
    console.error("[onechitra-db] pool error:", err.message)
  })

  globalThis._onechitaPool = pool
  return pool
}

export const onechitaDb = {
  query: async (text: string, params?: unknown[]) => {
    const pool = getOnechitaPool()
    let client
    try {
      client = await pool.connect()
      return await client.query(text, params)
    } finally {
      if (client) {
        client.release()
      }
    }
  },
}
