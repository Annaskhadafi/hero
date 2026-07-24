import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, or } from "drizzle-orm";
import * as schema from "../db/schema/hero";

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/hero_db";
  console.log("Connecting to", connectionString);
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    const deleted = await db.delete(schema.navbarMenuItems)
      .where(or(
        eq(schema.navbarMenuItems.url, "/dashboard/lms"),
        eq(schema.navbarMenuItems.url, "/api/lms/sso"),
        eq(schema.navbarMenuItems.resource, "lms_integration")
      ))
      .returning();
      
    console.log("Deleted old LMS menu items:", deleted.length);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
