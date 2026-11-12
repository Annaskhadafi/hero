import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Aligning CER approval matrix tables with Drizzle schema...");
  await db.execute(sql`
    DROP TABLE IF EXISTS "hero_cer_approval_matrix_steps" CASCADE;
    DROP TABLE IF EXISTS "hero_cer_approval_matrices" CASCADE;

    CREATE TABLE "hero_cer_approval_matrices" (
      "id" serial PRIMARY KEY,
      "department_id" integer REFERENCES "hero_master_departments"("id") ON DELETE SET NULL,
      "site_id" integer REFERENCES "hero_sites"("id") ON DELETE SET NULL,
      "name" text NOT NULL,
      "description" text NOT NULL DEFAULT '',
      "is_active" boolean NOT NULL DEFAULT true,
      "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE INDEX "cer_matrix_dept_site_idx" ON "hero_cer_approval_matrices" ("department_id", "site_id");

    CREATE TABLE "hero_cer_approval_matrix_steps" (
      "id" serial PRIMARY KEY,
      "matrix_id" integer NOT NULL REFERENCES "hero_cer_approval_matrices"("id") ON DELETE CASCADE,
      "step_order" integer NOT NULL,
      "step_key" text NOT NULL,
      "label" text NOT NULL,
      "approver_role" text NOT NULL DEFAULT '',
      "specific_employee_id" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
      "approval_mode" text NOT NULL DEFAULT 'single',
      "sla_hours" integer NOT NULL DEFAULT 24,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE INDEX "cer_matrix_step_order_idx" ON "hero_cer_approval_matrix_steps" ("matrix_id", "step_order");
  `);

  console.log("Aligned successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
