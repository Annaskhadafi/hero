import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
  const sqlPath = resolve(process.cwd(), "drizzle/0047_mcu_wellness_advance.sql");
  const sqlContent = readFileSync(sqlPath, "utf-8");

  const statements = sqlContent
    .split(";")
    .map((s) => s.replace(/^--.*$/gm, "").trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      console.log("[OK]", stmt.slice(0, 80).replace(/\n/g, " "));
    } catch (e: any) {
      console.error("[FAIL]", e.message, "|", stmt.slice(0, 80));
    }
  }
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
