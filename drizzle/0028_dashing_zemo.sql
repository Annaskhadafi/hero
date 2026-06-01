CREATE TABLE "hero_hiradc_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"register_id" integer,
	"order_index" integer DEFAULT 0 NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"activity_name" text DEFAULT '' NOT NULL,
	"routine_type" text DEFAULT 'Rutin' NOT NULL,
	"equipment" text DEFAULT '' NOT NULL,
	"hazard_category" text DEFAULT '' NOT NULL,
	"hazard_details" text DEFAULT '' NOT NULL,
	"risk_consequence" text DEFAULT '' NOT NULL,
	"likelihood_before" text DEFAULT '' NOT NULL,
	"severity_before" integer,
	"score_before" integer,
	"risk_level_before" text DEFAULT '' NOT NULL,
	"existing_control" text DEFAULT '' NOT NULL,
	"legal_reference" text DEFAULT '' NOT NULL,
	"likelihood_after" text DEFAULT '' NOT NULL,
	"severity_after" integer,
	"score_after" integer,
	"risk_level_after" text DEFAULT '' NOT NULL,
	"additional_control" text DEFAULT '' NOT NULL,
	"source_batch_id" text DEFAULT '' NOT NULL,
	"source_row_number" integer,
	"raw_department" text DEFAULT '' NOT NULL,
	"raw_routine_type" text DEFAULT '' NOT NULL,
	"raw_likelihood_before" text DEFAULT '' NOT NULL,
	"raw_severity_before" text DEFAULT '' NOT NULL,
	"raw_likelihood_after" text DEFAULT '' NOT NULL,
	"raw_severity_after" text DEFAULT '' NOT NULL,
	"raw_score_before" text DEFAULT '' NOT NULL,
	"raw_score_after" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hiradc_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"original_filename" text DEFAULT '' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"register_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_log" text,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "hero_hiradc_imports_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE "hero_hiradc_registers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"document_no" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"revision" text DEFAULT '0' NOT NULL,
	"effective_date" date,
	"prepared_by" text DEFAULT '' NOT NULL,
	"reviewed_by" text DEFAULT '' NOT NULL,
	"approved_by" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source_batch_id" text DEFAULT '' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_daily_checklist_answers" ALTER COLUMN "value_number" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "hero_daily_checklists" ALTER COLUMN "score_percent" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "hero_daily_checklists" ADD COLUMN "responsible_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hiradc_entries" ADD CONSTRAINT "hero_hiradc_entries_register_id_hero_hiradc_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."hero_hiradc_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hiradc_imports" ADD CONSTRAINT "hero_hiradc_imports_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hiradc_registers" ADD CONSTRAINT "hero_hiradc_registers_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_hiradc_entries_register_order_uq" ON "hero_hiradc_entries" USING btree ("register_id","order_index");--> statement-breakpoint
ALTER TABLE "hero_daily_checklist_answers" DROP COLUMN "value_boolean";