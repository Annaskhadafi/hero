CREATE TABLE IF NOT EXISTS "hero_mine_permit_reminder_sends" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "employee_id" integer NOT NULL,
  "permit_expiry_date" date NOT NULL,
  "send_count" integer DEFAULT 0 NOT NULL,
  "last_sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "hero_mine_permit_reminder_sends_employee_expiry_uq" UNIQUE("employee_id","permit_expiry_date")
);
--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_sends" ADD CONSTRAINT "hero_mine_permit_reminder_sends_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_sends" ADD CONSTRAINT "hero_mine_permit_reminder_sends_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;
