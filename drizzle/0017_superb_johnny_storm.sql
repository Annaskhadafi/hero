CREATE TABLE "hero_timesheet_daily_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"employee_sn" text NOT NULL,
	"employee_name" text NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"record_date" date NOT NULL,
	"day_of_month" integer NOT NULL,
	"ot_hours" numeric(5, 2),
	"ot_status" text,
	"ot_remark" text DEFAULT '' NOT NULL,
	"msa_amount" integer,
	"meals_amount" integer,
	"tlk_amount" integer,
	"allowance_status" text,
	"transferred_to_site" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"import_type" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_storage_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_sheets" integer DEFAULT 0 NOT NULL,
	"processed_sheets" integer DEFAULT 0 NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_log" jsonb,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_site_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"site_code" text NOT NULL,
	"site_name" text NOT NULL,
	"msa_rate" integer DEFAULT 0 NOT NULL,
	"meals_rate" integer DEFAULT 0 NOT NULL,
	"tlk_rate" integer DEFAULT 0 NOT NULL,
	"ot_decimal_mode" boolean DEFAULT false NOT NULL,
	"has_msa_summary" boolean DEFAULT true NOT NULL,
	"has_meals_summary" boolean DEFAULT false NOT NULL,
	"has_tlk_summary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_summary_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"output_filename" text NOT NULL,
	"file_storage_path" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_sites" integer DEFAULT 0 NOT NULL,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"prepared_by" text,
	"acknowledged_by" text,
	"approved_by" text,
	"checked_by" text,
	"generated_by_user_id" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_validation_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer NOT NULL,
	"issue_type" text NOT NULL,
	"severity" text NOT NULL,
	"employee_sn" text,
	"employee_name" text,
	"record_date" date,
	"message" text NOT NULL,
	"details" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by_user_id" text,
	"resolved_at" timestamp,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_timesheet_daily_records" ADD CONSTRAINT "hero_timesheet_daily_records_import_id_hero_timesheet_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."hero_timesheet_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_daily_records" ADD CONSTRAINT "hero_timesheet_daily_records_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_imports" ADD CONSTRAINT "hero_timesheet_imports_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_imports" ADD CONSTRAINT "hero_timesheet_imports_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_site_configs" ADD CONSTRAINT "hero_timesheet_site_configs_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_summary_outputs" ADD CONSTRAINT "hero_timesheet_summary_outputs_generated_by_user_id_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_validation_issues" ADD CONSTRAINT "hero_timesheet_validation_issues_import_id_hero_timesheet_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."hero_timesheet_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_validation_issues" ADD CONSTRAINT "hero_timesheet_validation_issues_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;