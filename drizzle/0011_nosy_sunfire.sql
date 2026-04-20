CREATE TABLE "hero_activity_route_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_template_id" integer NOT NULL,
	"group_key" text NOT NULL,
	"group_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_activity_route_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_group_id" integer NOT NULL,
	"library_activity_id" integer,
	"item_code" text DEFAULT '' NOT NULL,
	"item_label" text NOT NULL,
	"item_description" text DEFAULT '' NOT NULL,
	"point_override" integer,
	"requires_unit" boolean DEFAULT false NOT NULL,
	"requires_time" boolean DEFAULT true NOT NULL,
	"requires_remark" boolean DEFAULT false NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"requires_checklist_evidence" boolean DEFAULT false NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"allow_custom_unit" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_activity_route_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"department_id" integer,
	"section_id" integer,
	"position_id" integer,
	"route_code" text NOT NULL,
	"route_name" text NOT NULL,
	"shift_code" text DEFAULT 'ALL' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"mobile_enabled" boolean DEFAULT true NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"version_label" text DEFAULT 'v1' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_activity_route_templates_route_code_unique" UNIQUE("route_code")
);
--> statement-breakpoint
CREATE TABLE "hero_activity_section_point_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"department_id" integer,
	"section_id" integer,
	"position_id" integer,
	"library_activity_id" integer NOT NULL,
	"override_label" text DEFAULT '' NOT NULL,
	"override_points" integer,
	"reason" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_session_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"route_item_id" integer,
	"library_activity_id" integer,
	"overtime_command_letter_item_id" integer,
	"snapshot_label" text NOT NULL,
	"snapshot_group_name" text DEFAULT '' NOT NULL,
	"snapshot_payload" text DEFAULT '{}' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"checked_at" timestamp,
	"unit_number" text DEFAULT '' NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"actual_points" integer DEFAULT 0 NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"is_custom_item" boolean DEFAULT false NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"department_id" integer,
	"section_id" integer,
	"position_id" integer,
	"route_template_id" integer,
	"overtime_command_letter_id" integer,
	"legacy_assignment_id" integer,
	"session_code" text NOT NULL,
	"shift_code" text DEFAULT 'ALL' NOT NULL,
	"work_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_source" text DEFAULT 'route' NOT NULL,
	"started_at" timestamp,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"summary_remark" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_daily_activity_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "hero_overtime_command_letter_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"overtime_command_letter_id" integer NOT NULL,
	"route_template_id" integer,
	"route_item_id" integer,
	"library_activity_id" integer,
	"line_label" text NOT NULL,
	"line_description" text DEFAULT '' NOT NULL,
	"target_unit" text DEFAULT '' NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"planned_points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"is_custom_line" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_overtime_command_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_submission_id" integer,
	"site_id" integer NOT NULL,
	"department_id" integer,
	"section_id" integer,
	"position_id" integer,
	"requested_by_employee_id" integer NOT NULL,
	"approved_by_employee_id" integer,
	"spl_number" text NOT NULL,
	"title" text NOT NULL,
	"work_date" timestamp NOT NULL,
	"planned_start_at" timestamp,
	"planned_end_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"request_notes" text DEFAULT '' NOT NULL,
	"execution_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_overtime_command_letters_spl_number_unique" UNIQUE("spl_number")
);
--> statement-breakpoint
CREATE TABLE "hero_portal_chitra_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"color" text DEFAULT '#003461' NOT NULL,
	"icon_name" text DEFAULT 'globe' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_on_mobile" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_portal_chitra_apps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_portal_chitra_role_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"portal_app_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_training_records" ALTER COLUMN "completed_year" SET DEFAULT extract(year from current_date)::integer;--> statement-breakpoint
ALTER TABLE "hero_activity_route_groups" ADD CONSTRAINT "hero_activity_route_groups_route_template_id_hero_activity_route_templates_id_fk" FOREIGN KEY ("route_template_id") REFERENCES "public"."hero_activity_route_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_route_items" ADD CONSTRAINT "hero_activity_route_items_route_group_id_hero_activity_route_groups_id_fk" FOREIGN KEY ("route_group_id") REFERENCES "public"."hero_activity_route_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_route_items" ADD CONSTRAINT "hero_activity_route_items_library_activity_id_hero_activity_libraries_id_fk" FOREIGN KEY ("library_activity_id") REFERENCES "public"."hero_activity_libraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_route_templates" ADD CONSTRAINT "hero_activity_route_templates_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_route_templates" ADD CONSTRAINT "hero_activity_route_templates_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_section_point_overrides" ADD CONSTRAINT "hero_activity_section_point_overrides_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_section_point_overrides" ADD CONSTRAINT "hero_activity_section_point_overrides_library_activity_id_hero_activity_libraries_id_fk" FOREIGN KEY ("library_activity_id") REFERENCES "public"."hero_activity_libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_section_point_overrides" ADD CONSTRAINT "hero_activity_section_point_overrides_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_items" ADD CONSTRAINT "hero_daily_activity_session_items_session_id_hero_daily_activity_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_daily_activity_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_items" ADD CONSTRAINT "hero_daily_activity_session_items_route_item_id_hero_activity_route_items_id_fk" FOREIGN KEY ("route_item_id") REFERENCES "public"."hero_activity_route_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_items" ADD CONSTRAINT "hero_daily_activity_session_items_library_activity_id_hero_activity_libraries_id_fk" FOREIGN KEY ("library_activity_id") REFERENCES "public"."hero_activity_libraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_items" ADD CONSTRAINT "hero_daily_activity_session_items_overtime_command_letter_item_id_hero_overtime_command_letter_items_id_fk" FOREIGN KEY ("overtime_command_letter_item_id") REFERENCES "public"."hero_overtime_command_letter_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_route_template_id_hero_activity_route_templates_id_fk" FOREIGN KEY ("route_template_id") REFERENCES "public"."hero_activity_route_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_overtime_command_letter_id_hero_overtime_command_letters_id_fk" FOREIGN KEY ("overtime_command_letter_id") REFERENCES "public"."hero_overtime_command_letters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_items" ADD CONSTRAINT "hero_overtime_command_letter_items_overtime_command_letter_id_hero_overtime_command_letters_id_fk" FOREIGN KEY ("overtime_command_letter_id") REFERENCES "public"."hero_overtime_command_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_items" ADD CONSTRAINT "hero_overtime_command_letter_items_route_template_id_hero_activity_route_templates_id_fk" FOREIGN KEY ("route_template_id") REFERENCES "public"."hero_activity_route_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_items" ADD CONSTRAINT "hero_overtime_command_letter_items_route_item_id_hero_activity_route_items_id_fk" FOREIGN KEY ("route_item_id") REFERENCES "public"."hero_activity_route_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_items" ADD CONSTRAINT "hero_overtime_command_letter_items_library_activity_id_hero_activity_libraries_id_fk" FOREIGN KEY ("library_activity_id") REFERENCES "public"."hero_activity_libraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD CONSTRAINT "hero_overtime_command_letters_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD CONSTRAINT "hero_overtime_command_letters_requested_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD CONSTRAINT "hero_overtime_command_letters_approved_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("approved_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_portal_chitra_role_access" ADD CONSTRAINT "hero_portal_chitra_role_access_portal_app_id_hero_portal_chitra_apps_id_fk" FOREIGN KEY ("portal_app_id") REFERENCES "public"."hero_portal_chitra_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_portal_chitra_role_access" ADD CONSTRAINT "hero_portal_chitra_role_access_role_id_hero_security_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."hero_security_roles"("id") ON DELETE cascade ON UPDATE no action;