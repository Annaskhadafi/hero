import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  const r1 = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hero_employee_mcu' ORDER BY ordinal_position`);
  console.log("hero_employee_mcu columns:", (r1 as any).rows.length);
  (r1 as any).rows.forEach((x: any) => console.log("  -", x.column_name, ":", x.data_type));

  const r2 = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hero_employee_mcu_metrics' ORDER BY ordinal_position`);
  console.log("\nhero_employee_mcu_metrics columns:", (r2 as any).rows.length);
  (r2 as any).rows.forEach((x: any) => console.log("  -", x.column_name, ":", x.data_type));

  const r3 = await db.execute(sql`SELECT indexname FROM pg_indexes WHERE tablename IN ('hero_employee_mcu','hero_employee_mcu_metrics') ORDER BY indexname`);
  console.log("\nIndexes:");
  (r3 as any).rows.forEach((x: any) => console.log("  -", x.indexname));

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
