import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating hero_sop_win_department_workflows table if not exists...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_sop_win_department_workflows (
      id SERIAL PRIMARY KEY,
      department_code TEXT NOT NULL UNIQUE,
      department_name TEXT NOT NULL,
      steps JSONB NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table hero_sop_win_department_workflows ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
