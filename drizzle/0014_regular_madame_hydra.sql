CREATE TABLE "hero_cargo_manifest_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"manifest_id" integer NOT NULL,
	"no" integer DEFAULT 1 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"serial_number" text DEFAULT '' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_cargo_manifests" (
	"id" serial PRIMARY KEY NOT NULL,
	"manifest_number" text NOT NULL,
	"date" date NOT NULL,
	"attention" text DEFAULT '' NOT NULL,
	"transport_via" text DEFAULT '' NOT NULL,
	"shipped_via" text DEFAULT '' NOT NULL,
	"final_destination" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_cargo_manifests_manifest_number_unique" UNIQUE("manifest_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_age_bands" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_age_bands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_departments_code_unique" UNIQUE("code"),
	CONSTRAINT "hero_hr_departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_educations" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_educations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_employee_statuses" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_employee_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"auth_user_id" text,
	"full_name" text NOT NULL,
	"email" text,
	"email_password_migration" text,
	"department_id" integer,
	"section_id" integer,
	"site_id" integer,
	"work_location_id" integer,
	"position_id" integer,
	"org_node_id" integer,
	"join_date" date,
	"birth_date" date,
	"gender_code" text,
	"age_band_code" text,
	"service_band_code" text,
	"education_code" text,
	"demographic_employee_status_code" text,
	"location_category_code" text,
	"account_status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_genders" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_genders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_job_levels" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_job_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_location_categories" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_location_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_org_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"parent_node_id" integer,
	"node_type" text NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"section_id" integer,
	"site_id" integer,
	"work_location_id" integer,
	"hierarchy_level" integer DEFAULT 0 NOT NULL,
	"path_text" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_org_nodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"level_name" text NOT NULL,
	"rank_name" text NOT NULL,
	"job_level_code" text,
	"employee_status_code" text,
	"is_managerial" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"department_id" integer,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_sections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_service_bands" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "hero_hr_service_bands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_sites_code_unique" UNIQUE("code"),
	CONSTRAINT "hero_hr_sites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_hr_work_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hr_work_locations_code_unique" UNIQUE("code"),
	CONSTRAINT "hero_hr_work_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_master_sub_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"section_id" integer,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_sub_sections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_user_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_user_group_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_user_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_user_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_user_import_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_by_employee_id" integer,
	"file_name" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_details" jsonb,
	"mapping" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "invitation_token" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "invitation_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "invitation_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "email_verification_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifest_items" ADD CONSTRAINT "hero_cargo_manifest_items_manifest_id_hero_cargo_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."hero_cargo_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD CONSTRAINT "hero_cargo_manifests_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_auth_user_id_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_department_id_hero_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_section_id_hero_hr_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_hr_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_site_id_hero_hr_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_hr_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_work_location_id_hero_hr_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."hero_hr_work_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_position_id_hero_hr_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hero_hr_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_org_node_id_hero_hr_org_nodes_id_fk" FOREIGN KEY ("org_node_id") REFERENCES "public"."hero_hr_org_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_gender_code_hero_hr_genders_code_fk" FOREIGN KEY ("gender_code") REFERENCES "public"."hero_hr_genders"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_age_band_code_hero_hr_age_bands_code_fk" FOREIGN KEY ("age_band_code") REFERENCES "public"."hero_hr_age_bands"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_service_band_code_hero_hr_service_bands_code_fk" FOREIGN KEY ("service_band_code") REFERENCES "public"."hero_hr_service_bands"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_education_code_hero_hr_educations_code_fk" FOREIGN KEY ("education_code") REFERENCES "public"."hero_hr_educations"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_demographic_employee_status_code_hero_hr_employee_statuses_code_fk" FOREIGN KEY ("demographic_employee_status_code") REFERENCES "public"."hero_hr_employee_statuses"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD CONSTRAINT "hero_hr_employees_location_category_code_hero_hr_location_categories_code_fk" FOREIGN KEY ("location_category_code") REFERENCES "public"."hero_hr_location_categories"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_org_nodes" ADD CONSTRAINT "hero_hr_org_nodes_parent_node_id_hero_hr_org_nodes_id_fk" FOREIGN KEY ("parent_node_id") REFERENCES "public"."hero_hr_org_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_org_nodes" ADD CONSTRAINT "hero_hr_org_nodes_department_id_hero_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_org_nodes" ADD CONSTRAINT "hero_hr_org_nodes_section_id_hero_hr_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_hr_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_org_nodes" ADD CONSTRAINT "hero_hr_org_nodes_site_id_hero_hr_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_hr_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_org_nodes" ADD CONSTRAINT "hero_hr_org_nodes_work_location_id_hero_hr_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."hero_hr_work_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_positions" ADD CONSTRAINT "hero_hr_positions_job_level_code_hero_hr_job_levels_code_fk" FOREIGN KEY ("job_level_code") REFERENCES "public"."hero_hr_job_levels"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_positions" ADD CONSTRAINT "hero_hr_positions_employee_status_code_hero_hr_employee_statuses_code_fk" FOREIGN KEY ("employee_status_code") REFERENCES "public"."hero_hr_employee_statuses"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_sections" ADD CONSTRAINT "hero_hr_sections_department_id_hero_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_sub_sections" ADD CONSTRAINT "hero_master_sub_sections_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_user_activity_log" ADD CONSTRAINT "hero_user_activity_log_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_user_group_memberships" ADD CONSTRAINT "hero_user_group_memberships_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_user_group_memberships" ADD CONSTRAINT "hero_user_group_memberships_group_id_hero_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."hero_user_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_user_import_history" ADD CONSTRAINT "hero_user_import_history_imported_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("imported_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_hr_positions_signature_uq" ON "hero_hr_positions" USING btree ("level_name","rank_name","job_level_code","employee_status_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_hr_sections_department_name_uq" ON "hero_hr_sections" USING btree ("department_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_user_activity_log_employee_idx" ON "hero_user_activity_log" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_user_group_memberships_unique" ON "hero_user_group_memberships" USING btree ("employee_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_user_group_memberships_employee_idx" ON "hero_user_group_memberships" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_user_group_memberships_group_idx" ON "hero_user_group_memberships" USING btree ("group_id");