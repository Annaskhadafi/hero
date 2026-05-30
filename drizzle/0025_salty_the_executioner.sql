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
CREATE TABLE "repair_master_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"material_name" text NOT NULL,
	"valuation_stock_value" varchar(100),
	"currency" varchar(20),
	"valuated_stock" varchar(100),
	"uom" varchar(30),
	"category" varchar(100),
	"smu" varchar(50),
	"default_qty" varchar(50),
	"standard_time" varchar(50),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_repair_master_item_code" UNIQUE("material_code")
);
--> statement-breakpoint
CREATE TABLE "repair_master_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_code" varchar(50) NOT NULL,
	"site_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_repair_master_site_code" UNIQUE("site_code")
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_inbound" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_no" text NOT NULL,
	"transaction_date" date NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_item_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_code" text NOT NULL,
	"type_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"type_id" integer,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"unit_id" integer,
	"photo_url" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_outbound" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_no" text NOT NULL,
	"transaction_date" date NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_code" text NOT NULL,
	"unit_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_inbound" ADD CONSTRAINT "hero_warehouse_repair_inbound_item_id_hero_warehouse_repair_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_warehouse_repair_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_items" ADD CONSTRAINT "hero_warehouse_repair_items_type_id_hero_warehouse_repair_item_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."hero_warehouse_repair_item_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_items" ADD CONSTRAINT "hero_warehouse_repair_items_unit_id_hero_warehouse_repair_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."hero_warehouse_repair_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_outbound" ADD CONSTRAINT "hero_warehouse_repair_outbound_item_id_hero_warehouse_repair_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_warehouse_repair_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_inbound_no_idx" ON "hero_warehouse_repair_inbound" USING btree ("transaction_no");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_item_types_code_idx" ON "hero_warehouse_repair_item_types" USING btree ("type_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_items_code_idx" ON "hero_warehouse_repair_items" USING btree ("item_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_outbound_no_idx" ON "hero_warehouse_repair_outbound" USING btree ("transaction_no");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_units_code_idx" ON "hero_warehouse_repair_units" USING btree ("unit_code");