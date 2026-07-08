import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const r = await pool.query("UPDATE hero_central_service_forecast_items SET status = 'Pending' WHERE status = 'Waiting'");
  console.log("Updated", r.rowCount, "rows from Waiting → Pending");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await pool.end();
}
