CREATE TABLE "hero_hse_incident_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"site_id" integer,
	"investigation_status" text DEFAULT 'Open' NOT NULL,
	"incident_date" timestamp NOT NULL,
	"pic_employee_id" integer,
	"pic_name" text DEFAULT '' NOT NULL,
	"root_cause_analysis" text DEFAULT '' NOT NULL,
	"immediate_corrective_action" text DEFAULT '' NOT NULL,
	"documentation_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hse_inventories" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"location" text NOT NULL,
	"condition" text DEFAULT 'Baik' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"pic_name" text DEFAULT '' NOT NULL,
	"photo_url" text DEFAULT '' NOT NULL,
	"verified_status" text DEFAULT 'verified' NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"purchase_date" timestamp,
	"validity_months" integer,
	"expiration_date" timestamp,
	"reminder_days_before" integer DEFAULT 30 NOT NULL,
	"reminder_email_recipients" text DEFAULT '' NOT NULL,
	"last_reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_daily_checklist_answers" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hero_hse_incident_records" ADD CONSTRAINT "hero_hse_incident_records_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_incident_records" ADD CONSTRAINT "hero_hse_incident_records_pic_employee_id_hero_employees_id_fk" FOREIGN KEY ("pic_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;