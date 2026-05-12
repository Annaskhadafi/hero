CREATE TABLE IF NOT EXISTS "hero_employee_site_assignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "employee_id" integer NOT NULL,
  "site_id" integer NOT NULL,
  "assignment_type" text DEFAULT 'primary' NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "hero_employee_site_assignments" ADD CONSTRAINT "hero_employee_site_assignments_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "hero_employee_site_assignments" ADD CONSTRAINT "hero_employee_site_assignments_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "hero_employee_site_assignments_employee_site_effective_uq" ON "hero_employee_site_assignments" USING btree ("employee_id","site_id","effective_from");
