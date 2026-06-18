import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Fetching foreign key constraints on hero_master_departments...\n");

  const query = sql`
    SELECT
        tc.table_name AS referencing_table,
        kcu.column_name AS referencing_column,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule AS on_delete
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'hero_master_departments';
  `;

  const result = await db.execute(query);
  console.log("Referencing tables and constraints:");
  console.log(JSON.stringify(result.rows, null, 2));
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
