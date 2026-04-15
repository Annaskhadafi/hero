CREATE TABLE "hero_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"activity_code" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"unit_number" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer NOT NULL,
	"level" integer NOT NULL,
	"approver_name" text NOT NULL,
	"status" text NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"reviewed_at" timestamp,
	"overtime_minutes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"event_time" timestamp NOT NULL,
	"status" text NOT NULL,
	"location_note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_employee_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_label" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"report_date" timestamp NOT NULL,
	"customer_name" text NOT NULL,
	"total_sections" integer DEFAULT 4 NOT NULL,
	"ready_sections" integer DEFAULT 0 NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"manpower_present" integer DEFAULT 0 NOT NULL,
	"hse_summary" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_email_delivery_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"delivery_channel" text DEFAULT 'email' NOT NULL,
	"to_email" text NOT NULL,
	"cc_email" text,
	"from_email" text,
	"template_name" text,
	"template_code" text,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"html_content" text,
	"text_content" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"employee_sn" text DEFAULT '' NOT NULL,
	"join_year" integer DEFAULT 2026 NOT NULL,
	"birth_place_date" text DEFAULT '' NOT NULL,
	"domicile" text DEFAULT '' NOT NULL,
	"direct_manager_id" integer,
	"section" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"work_location" text DEFAULT '' NOT NULL,
	"phone_number" text DEFAULT '' NOT NULL,
	"employment_status" text DEFAULT 'active' NOT NULL,
	"access_role" text DEFAULT 'Site Admin' NOT NULL,
	"level_name" text DEFAULT 'Rookie' NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"fit_status" text DEFAULT 'fit' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hse_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"unit_number" text NOT NULL,
	"impact" text NOT NULL,
	"status" text NOT NULL,
	"reported_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hse_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"notes" text NOT NULL,
	"observed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_master_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"section_id" integer,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_master_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_master_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_sections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_navbar_menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_area" text DEFAULT 'main' NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"icon_name" text NOT NULL,
	"resource" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_navbar_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"theme_name" text NOT NULL,
	"background_style" text NOT NULL,
	"accent_color" text NOT NULL,
	"text_color" text NOT NULL,
	"density" text DEFAULT 'comfortable' NOT NULL,
	"logo_mode" text DEFAULT 'hero' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_org_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"job_type" text DEFAULT 'default' NOT NULL,
	"position_id" integer NOT NULL,
	"manager_position_id" integer,
	"approval_level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_point_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_role_menu_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_select_all" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_security_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_security_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_security_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT 'site' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"customer_name" text NOT NULL,
	"contract_number" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"period_label" text NOT NULL,
	"regular_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_amount" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_training_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"training_name" text NOT NULL,
	"provider" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_wellness_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" text NOT NULL,
	"status" text NOT NULL,
	"notes" text NOT NULL,
	"recorded_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_activities" ADD CONSTRAINT "hero_activities_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD CONSTRAINT "hero_activities_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD CONSTRAINT "hero_approvals_activity_id_hero_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."hero_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD CONSTRAINT "hero_attendance_records_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD CONSTRAINT "hero_attendance_records_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_audit_logs" ADD CONSTRAINT "hero_audit_logs_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_reports" ADD CONSTRAINT "hero_daily_reports_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_email_delivery_logs" ADD CONSTRAINT "hero_email_delivery_logs_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD CONSTRAINT "hero_employees_auth_user_id_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD CONSTRAINT "hero_employees_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD CONSTRAINT "hero_hse_incidents_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_observations" ADD CONSTRAINT "hero_hse_observations_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_observations" ADD CONSTRAINT "hero_hse_observations_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_departments" ADD CONSTRAINT "hero_master_departments_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_positions" ADD CONSTRAINT "hero_master_positions_department_id_hero_master_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_master_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_structures" ADD CONSTRAINT "hero_org_structures_position_id_hero_master_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hero_master_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_structures" ADD CONSTRAINT "hero_org_structures_manager_position_id_hero_master_positions_id_fk" FOREIGN KEY ("manager_position_id") REFERENCES "public"."hero_master_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD CONSTRAINT "hero_point_events_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_role_menu_permissions" ADD CONSTRAINT "hero_role_menu_permissions_role_id_hero_security_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."hero_security_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_role_menu_permissions" ADD CONSTRAINT "hero_role_menu_permissions_menu_item_id_hero_navbar_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."hero_navbar_menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_security_role_permissions" ADD CONSTRAINT "hero_security_role_permissions_role_id_hero_security_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."hero_security_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_security_role_permissions" ADD CONSTRAINT "hero_security_role_permissions_permission_id_hero_security_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."hero_security_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_entries" ADD CONSTRAINT "hero_timesheet_entries_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_entries" ADD CONSTRAINT "hero_timesheet_entries_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_training_records" ADD CONSTRAINT "hero_training_records_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_wellness_records" ADD CONSTRAINT "hero_wellness_records_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;