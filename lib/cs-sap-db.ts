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

export interface SapRevenueRow {
  customerName: string;
  salesman: string;
  revenueInDocCurr: number;
  revenueInLocCurr: number;
  revType: string;
  billingDate: string;
}

export async function fetchSapRevenue(monthYear: string): Promise<{
  service: { idr: number; usd: number };
  repair: { idr: number; usd: number };
  retread: { idr: number; usd: number };
  rows: SapRevenueRow[];
}> {
  try {
    const pool = getSapPool();

    // monthYear format: "July 2026" → convert to date range
    const result = await pool.query(`
      SELECT
        COALESCE(customer_name, '') AS "customerName",
        COALESCE(salesman, '') AS "salesman",
        COALESCE(NULLIF(revenue_in_doc_curr, 'NaN'::float8), 0) AS "revenueInDocCurr",
        COALESCE(NULLIF(revenue_in_loc_curr, 'NaN'::float8), 0) AS "revenueInLocCurr",
        COALESCE(rev_type, '') AS "revType",
        COALESCE(billing_date::text, '') AS "billingDate"
      FROM sales_revenue_sap
      WHERE billing_date IS NOT NULL
        AND (cancelled IS NULL OR cancelled = '')
        AND TO_CHAR(billing_date, 'YYYY-MM') = $1
      ORDER BY billing_date DESC
    `, [monthYearToKey(monthYear)]);

    const rows = result.rows as SapRevenueRow[];

    const service = { idr: 0, usd: 0 };
    const repair = { idr: 0, usd: 0 };
    const retread = { idr: 0, usd: 0 };

    rows.forEach((r) => {
      const idr = Number(r.revenueInDocCurr) || 0;
      const usd = Number(r.revenueInLocCurr) || 0;
      const revType = r.revType.toLowerCase().trim();

      if (revType.includes("repair")) {
        repair.idr += idr;
        repair.usd += usd;
      } else if (revType.includes("service")) {
        service.idr += idr;
        service.usd += usd;
      } else if (revType.includes("retread")) {
        retread.idr += idr;
        retread.usd += usd;
      }
    });

    return { service, repair, retread, rows };
  } catch (error) {
    console.error("[SAP DB] Failed to fetch revenue:", error);
    return {
      service: { idr: 0, usd: 0 },
      repair: { idr: 0, usd: 0 },
      retread: { idr: 0, usd: 0 },
      rows: [],
    };
  }
}

function monthYearToKey(monthYear: string): string {
  // "July 2026" → "2026-07"
  const months: Record<string, string> = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  };
  const parts = monthYear.trim().split(/\s+/);
  if (parts.length === 2) {
    const month = months[parts[0]] || "01";
    const year = parts[1];
    return `${year}-${month}`;
  }
  // If already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(monthYear)) return monthYear;
  return monthYear;
}

export interface SapInvoiceRow {
  billingDate: string;
  billingNo: string;
  customer: string;
  customerName: string;
  materialNo: string;
  materialDesc: string;
  qty: number;
  uom: string;
  revenueIdr: number;
  revenueUsd: number;
  revType: string;
  salesman: string;
  poNo: string;
}

export async function fetchSapInvoices(monthYear: string): Promise<SapInvoiceRow[]> {
  try {
    const pool = getSapPool();
    const result = await pool.query(`
      SELECT
        COALESCE(billing_date::text, '') AS "billingDate",
        COALESCE(billing_no, '') AS "billingNo",
        COALESCE(customer, '') AS "customer",
        COALESCE(customer_name, '') AS "customerName",
        COALESCE(material_no, '') AS "materialNo",
        COALESCE(material_description, '') AS "materialDesc",
        COALESCE(qty, 0)::int AS "qty",
        COALESCE(uom, '') AS "uom",
        COALESCE(NULLIF(revenue_in_doc_curr, 'NaN'::float8), 0) AS "revenueIdr",
        COALESCE(NULLIF(revenue_in_loc_curr, 'NaN'::float8), 0) AS "revenueUsd",
        COALESCE(rev_type, '') AS "revType",
        COALESCE(salesman, '') AS "salesman",
        COALESCE(po_no, '') AS "poNo"
      FROM sales_revenue_sap
      WHERE billing_date IS NOT NULL
        AND (cancelled IS NULL OR cancelled = '')
        AND TO_CHAR(billing_date, 'YYYY-MM') = $1
        AND LOWER(TRIM(rev_type)) IN ('repair', 'service', 'retread job')
      ORDER BY billing_date DESC, billing_no
    `, [monthYearToKey(monthYear)]);

    return result.rows as SapInvoiceRow[];
  } catch (error) {
    console.error("[SAP DB] Failed to fetch invoices:", error);
    return [];
  }
}
