import { sql } from 'drizzle-orm'
import { db } from '../db'

async function main() {
  console.log('Running raw SQL to create hero_hc_employee_contract_reviews...')
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_hc_employee_contract_reviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "employee_id" integer,
      "review_type" text DEFAULT 'probation' NOT NULL,
      "contract_length" text DEFAULT '' NOT NULL,
      "today_date" date NOT NULL,
      "hire_date" date NOT NULL,
      "performance_activities" jsonb DEFAULT '[]'::jsonb,
      "comp_discipline_ach" text DEFAULT '' NOT NULL,
      "comp_discipline_remark" text DEFAULT '' NOT NULL,
      "comp_skill_ach" text DEFAULT '' NOT NULL,
      "comp_skill_remark" text DEFAULT '' NOT NULL,
      "comp_result_ach" text DEFAULT '' NOT NULL,
      "comp_result_remark" text DEFAULT '' NOT NULL,
      "comp_quality_ach" text DEFAULT '' NOT NULL,
      "comp_quality_remark" text DEFAULT '' NOT NULL,
      "comp_customer_ach" text DEFAULT '' NOT NULL,
      "comp_customer_remark" text DEFAULT '' NOT NULL,
      "comp_teamwork_ach" text DEFAULT '' NOT NULL,
      "comp_teamwork_remark" text DEFAULT '' NOT NULL,
      "recommendation" text DEFAULT '' NOT NULL,
      "contract_extended_months" integer,
      "leader_name" text DEFAULT '' NOT NULL,
      "employee_name_str" text DEFAULT '' NOT NULL,
      "superior_name" text DEFAULT '' NOT NULL,
      "hr_name" text DEFAULT '' NOT NULL,
      "next_superior_name" text DEFAULT '' NOT NULL,
      "letter_issuance" text DEFAULT '' NOT NULL,
      "status" text DEFAULT 'draft' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
     ALTER TABLE "hero_hc_employee_contract_reviews" ADD CONSTRAINT "hero_hc_employee_contract_reviews_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "hero_employees"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
  `)
  console.log('Done.')
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
