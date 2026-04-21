CREATE TABLE IF NOT EXISTS "hero_overtime_request_leader_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"leader_employee_id" integer NOT NULL,
	"enabled_by_employee_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "hero_overtime_request_leader_permissions"
	ADD CONSTRAINT "hero_overtime_request_leader_permissions_site_id_hero_sites_id_fk"
	FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "hero_overtime_request_leader_permissions"
	ADD CONSTRAINT "hero_overtime_request_leader_permissions_leader_employee_id_hero_employees_id_fk"
	FOREIGN KEY ("leader_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "hero_overtime_request_leader_permissions"
	ADD CONSTRAINT "hero_overtime_request_leader_permissions_enabled_by_employee_id_hero_employees_id_fk"
	FOREIGN KEY ("enabled_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hero_overtime_request_leader_permissions_site_leader_uq"
ON "hero_overtime_request_leader_permissions" USING btree ("site_id","leader_employee_id");
--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_items"
ADD COLUMN IF NOT EXISTS "assigned_employee_id" integer;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "hero_overtime_command_letter_items"
	ADD CONSTRAINT "hero_overtime_command_letter_items_assigned_employee_id_hero_employees_id_fk"
	FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
