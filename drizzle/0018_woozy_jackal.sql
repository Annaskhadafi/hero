CREATE TABLE "hero_central_service_employee_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_storage_path" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_log" text,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "hero_central_service_employee_imports_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_sn" text NOT NULL,
	"full_name" text NOT NULL,
	"nickname" text,
	"email" text,
	"phone_number" text,
	"site_id" integer,
	"site_name" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"employment_status" text DEFAULT 'active' NOT NULL,
	"employment_type" text DEFAULT 'permanent' NOT NULL,
	"id_card_number" text,
	"birth_date" text,
	"birth_place" text,
	"address" text,
	"join_date" text,
	"resign_date" text,
	"auth_user_id" text,
	"is_synced_to_user_management" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp,
	"import_batch_id" text,
	"imported_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_central_service_employee_imports" ADD CONSTRAINT "hero_central_service_employee_imports_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_employees" ADD CONSTRAINT "hero_central_service_employees_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_employees" ADD CONSTRAINT "hero_central_service_employees_auth_user_id_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cs_employee_sn_idx" ON "hero_central_service_employees" USING btree ("employee_sn");--> statement-breakpoint
CREATE UNIQUE INDEX "cs_employee_email_idx" ON "hero_central_service_employees" USING btree ("email");