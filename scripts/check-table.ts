import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'hero_master_sub_sections'`);
  console.log('Table hero_master_sub_sections:', result.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
  if (result.rows.length > 0) {
    const cols = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hero_master_sub_sections' ORDER BY ordinal_position`);
    cols.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`));
  }
}
main().catch(e => console.error(e.message)).finally(() => process.exit());
