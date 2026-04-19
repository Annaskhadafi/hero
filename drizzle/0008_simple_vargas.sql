CREATE TABLE "hero_activity_libraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"activity_code" text NOT NULL,
	"activity_name" text NOT NULL,
	"category" text DEFAULT 'Technical' NOT NULL,
	"department_id" integer,
	"section_id" integer,
	"base_points" integer DEFAULT 5 NOT NULL,
	"complexity_level" integer DEFAULT 1 NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"requires_equipment_no" boolean DEFAULT false NOT NULL,
	"requires_duration" boolean DEFAULT true NOT NULL,
	"requires_location_gps" boolean DEFAULT false NOT NULL,
	"requires_material_used" boolean DEFAULT false NOT NULL,
	"max_daily_count" integer DEFAULT 3 NOT NULL,
	"max_points_per_day" integer DEFAULT 50 NOT NULL,
	"is_assignable" boolean DEFAULT true NOT NULL,
	"is_self_input" boolean DEFAULT true NOT NULL,
	"approval_required" boolean DEFAULT true NOT NULL,
	"auto_approve_if_gps_valid" boolean DEFAULT false NOT NULL,
	"sla_hours" integer DEFAULT 24 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_activity_libraries_activity_code_unique" UNIQUE("activity_code")
);
--> statement-breakpoint
CREATE TABLE "hero_activity_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"event_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"multiplier" integer DEFAULT 100 NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_activity_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"config_key" text NOT NULL,
	"config_label" text NOT NULL,
	"config_value" text DEFAULT '' NOT NULL,
	"value_type" text DEFAULT 'number' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_editable_by_section_head" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_daily_activity_configs_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "hero_email_smtp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_name" text DEFAULT 'Default SMTP' NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"encryption" text DEFAULT 'tls' NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"password_secret" text DEFAULT '' NOT NULL,
	"from_email" text DEFAULT '' NOT NULL,
	"from_name" text DEFAULT 'HERO Operations' NOT NULL,
	"reply_to_email" text DEFAULT '' NOT NULL,
	"retry_limit" integer DEFAULT 3 NOT NULL,
	"timeout_seconds" integer DEFAULT 15 NOT NULL,
	"queue_enabled" boolean DEFAULT true NOT NULL,
	"audit_enabled" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"template_code" text NOT NULL,
	"template_type" text DEFAULT 'Notification' NOT NULL,
	"delivery_channel" text DEFAULT 'email' NOT NULL,
	"recipient_scope" text DEFAULT 'all' NOT NULL,
	"cc_email" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"html_content" text DEFAULT '' NOT NULL,
	"text_content" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_email_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE "hero_job_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"assigned_by_employee_id" integer NOT NULL,
	"assigned_to_employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"library_activity_id" integer,
	"custom_job_name" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"estimated_duration" integer DEFAULT 60 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"assignment_type" text DEFAULT 'individual' NOT NULL,
	"assigned_date" timestamp DEFAULT now() NOT NULL,
	"deadline" timestamp,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_master_attendance_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"start_time" text DEFAULT '' NOT NULL,
	"end_time" text DEFAULT '' NOT NULL,
	"window_label" text DEFAULT '' NOT NULL,
	"helper" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_attendance_shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_notification_channel_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'bell' NOT NULL,
	"label" text NOT NULL,
	"event_type" text NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'notification' NOT NULL,
	"trigger_expression" text DEFAULT '' NOT NULL,
	"template_code" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_notification_channel_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"realtime_badge" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT false NOT NULL,
	"auto_mark_read" boolean DEFAULT true NOT NULL,
	"vapid_public_key" text DEFAULT '' NOT NULL,
	"vapid_private_key" text DEFAULT '' NOT NULL,
	"push_subject" text DEFAULT '' NOT NULL,
	"service_worker_path" text DEFAULT '/sw.js' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_notification_channel_settings_channel_unique" UNIQUE("channel")
);
--> statement-breakpoint
CREATE TABLE "hero_notification_push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"device_label" text DEFAULT 'Browser' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_notification_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "hero_notification_user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"approval_requests_enabled" boolean DEFAULT true NOT NULL,
	"shift_reminders_enabled" boolean DEFAULT true NOT NULL,
	"hse_alerts_enabled" boolean DEFAULT true NOT NULL,
	"points_updates_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_notification_user_preferences_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "hero_penalty_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"activity_id" integer,
	"penalty_code" text NOT NULL,
	"penalty_type" text NOT NULL,
	"reference_date" timestamp DEFAULT now() NOT NULL,
	"points_deducted" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_disputed" boolean DEFAULT false NOT NULL,
	"dispute_status" text DEFAULT 'none' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_point_disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"penalty_event_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"reason" text NOT NULL,
	"evidence_urls" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by_employee_id" integer,
	"resolution_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hero_streak_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"streak_start_date" timestamp DEFAULT now() NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp,
	"streak_bonus_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "library_activity_id" integer;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "assignment_id" integer;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "source_mode" text DEFAULT 'self_input' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "custom_activity_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "custom_activity_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "submission_time" timestamp;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "submission_category" text DEFAULT 'on_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "equipment_no" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "material_used" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "gps_lat" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "gps_lng" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "gps_valid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "photo_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "penalty_deducted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "points_override" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "rejection_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "points_override_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "latitude" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "longitude" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "photo_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN "alert_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_master_positions" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD COLUMN "transaction_type" text DEFAULT 'reward' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD COLUMN "source_type" text DEFAULT 'activity' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD COLUMN "source_id" integer;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD COLUMN "balance_after" integer;--> statement-breakpoint
ALTER TABLE "hero_point_events" ADD COLUMN "metadata" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "province_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "province_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "regency_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "regency_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "district_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "district_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "village_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "village_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "address_detail" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "geo_latitude" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "geo_longitude" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "geo_radius_meters" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD CONSTRAINT "hero_activity_libraries_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD CONSTRAINT "hero_activity_libraries_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_modifiers" ADD CONSTRAINT "hero_activity_modifiers_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_modifiers" ADD CONSTRAINT "hero_activity_modifiers_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activity_photos" ADD CONSTRAINT "hero_activity_photos_activity_id_hero_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."hero_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_configs" ADD CONSTRAINT "hero_daily_activity_configs_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_configs" ADD CONSTRAINT "hero_daily_activity_configs_updated_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("updated_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_job_assignments" ADD CONSTRAINT "hero_job_assignments_assigned_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("assigned_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_job_assignments" ADD CONSTRAINT "hero_job_assignments_assigned_to_employee_id_hero_employees_id_fk" FOREIGN KEY ("assigned_to_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_job_assignments" ADD CONSTRAINT "hero_job_assignments_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_job_assignments" ADD CONSTRAINT "hero_job_assignments_library_activity_id_hero_activity_libraries_id_fk" FOREIGN KEY ("library_activity_id") REFERENCES "public"."hero_activity_libraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_push_subscriptions" ADD CONSTRAINT "hero_notification_push_subscriptions_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_user_preferences" ADD CONSTRAINT "hero_notification_user_preferences_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_penalty_events" ADD CONSTRAINT "hero_penalty_events_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_penalty_events" ADD CONSTRAINT "hero_penalty_events_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_penalty_events" ADD CONSTRAINT "hero_penalty_events_activity_id_hero_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."hero_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_point_disputes" ADD CONSTRAINT "hero_point_disputes_penalty_event_id_hero_penalty_events_id_fk" FOREIGN KEY ("penalty_event_id") REFERENCES "public"."hero_penalty_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_point_disputes" ADD CONSTRAINT "hero_point_disputes_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_point_disputes" ADD CONSTRAINT "hero_point_disputes_resolved_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("resolved_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_streak_records" ADD CONSTRAINT "hero_streak_records_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD CONSTRAINT "hero_hse_incidents_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_positions" ADD CONSTRAINT "hero_master_positions_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;