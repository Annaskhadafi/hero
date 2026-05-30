CREATE TABLE "hero_safety_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_name" text NOT NULL,
	"pic_department" text DEFAULT '' NOT NULL,
	"work_area" text DEFAULT '' NOT NULL,
	"equipment_classification" text DEFAULT '' NOT NULL,
	"certifier" text DEFAULT '' NOT NULL,
	"certification_date" date,
	"next_certification_date" date,
	"status" text DEFAULT 'UNKNOWN' NOT NULL,
	"regulation" text DEFAULT '' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"work_location" text DEFAULT '' NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_incident_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_name" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"incident_description" text NOT NULL,
	"property_damage" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"incident_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_incident_summary_monthly" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" date NOT NULL,
	"fatality" integer DEFAULT 0 NOT NULL,
	"lost_day_injury" integer DEFAULT 0 NOT NULL,
	"restricted_work_day_injury" integer DEFAULT 0 NOT NULL,
	"medical_treatment_case" integer DEFAULT 0 NOT NULL,
	"first_aid" integer DEFAULT 0 NOT NULL,
	"property_damage" integer DEFAULT 0 NOT NULL,
	"near_miss_report" integer DEFAULT 0 NOT NULL,
	"environmental" integer DEFAULT 0 NOT NULL,
	"total_events" integer DEFAULT 0 NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_incident_summary_yearly" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"fatality" integer DEFAULT 0 NOT NULL,
	"lost_day_injury" integer DEFAULT 0 NOT NULL,
	"restricted_work_day_injury" integer DEFAULT 0 NOT NULL,
	"medical_treatment_case" integer DEFAULT 0 NOT NULL,
	"first_aid" integer DEFAULT 0 NOT NULL,
	"property_damage" integer DEFAULT 0 NOT NULL,
	"near_miss_report" integer DEFAULT 0 NOT NULL,
	"environmental" integer DEFAULT 0 NOT NULL,
	"fatigue" integer DEFAULT 0 NOT NULL,
	"total_events" integer DEFAULT 0 NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_man_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_location" text NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"safety_man_hours" numeric(14, 2) DEFAULT '0' NOT NULL,
	"safe_target" numeric(14, 2) DEFAULT '0' NOT NULL,
	"average_weekly_revenue" numeric(14, 2),
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_monthly_man_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_location" text NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"month" date NOT NULL,
	"safety_man_hours" numeric(14, 2) DEFAULT '0' NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"period_label" text NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"safe_man_hours_up_to_year" numeric(14, 2) DEFAULT '0' NOT NULL,
	"fatality_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fatality_actual" numeric(10, 2) DEFAULT '0' NOT NULL,
	"lti_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"lti_actual" numeric(10, 2) DEFAULT '0' NOT NULL,
	"property_damage_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"property_damage_actual" numeric(10, 2) DEFAULT '0' NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_weekly_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity" text NOT NULL,
	"activity_date" date,
	"pic" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"evidence_url" text DEFAULT '' NOT NULL,
	"source_sheet" text DEFAULT 'manual' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
