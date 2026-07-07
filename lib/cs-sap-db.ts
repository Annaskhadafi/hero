import { Pool } from "pg";

const SAP_DB_URL = "postgresql://satuchitra:Wusthochq2018-@31.97.187.38:5432/satuchitra";

let sapPool: Pool | null = null;

function getSapPool() {
  if (!sapPool) {
    sapPool = new Pool({
      connectionString: SAP_DB_URL,
      connectionTimeoutMillis: 10000,
      max: 5,
    });
  }
  return sapPool;
}

export interface SapActualRow {
  customer: string;
  picSales: string;
  amountIdr: number;
  amountUsd: number;
  remark: string;
  category: string;
  updateDate: string;
}

export async function fetchSapActuals(): Promise<SapActualRow[]> {
  try {
    const pool = getSapPool();
    const result = await pool.query(`
      SELECT
        customer_name AS "customer",
        salesman AS "pic_sales",
        COALESCE(amount_idr, 0) AS "amountIdr",
        COALESCE(amount_usd, 0) AS "amountUsd",
        COALESCE(remark, '') AS "remark",
        COALESCE(job_category, 'Service') AS "category",
        COALESCE(update_date::text, '') AS "updateDate"
      FROM revenue_actuals
      ORDER BY update_date DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("[SAP DB] Failed to fetch actuals:", error);
    return [];
  }
}
