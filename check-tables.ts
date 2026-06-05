import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%hc_candidate%';`);
    console.log(res.rows);
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();
