CREATE TABLE "hero_org_chart_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"structure_id" integer NOT NULL,
	"parent_node_id" integer,
	"position_id" integer,
	"employee_id" integer,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_org_chart_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scope_type" text DEFAULT 'custom' NOT NULL,
	"scope_value" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_master_departments" DROP CONSTRAINT "hero_master_departments_section_id_hero_master_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "latitude" text;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "longitude" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "employee_status_type" text DEFAULT 'Permanen | Staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_master_positions" ADD COLUMN IF NOT EXISTS "site_location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_master_sections" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "hero_navbar_themes" ADD COLUMN "header_background_color" text DEFAULT '#FFFFFF' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD CONSTRAINT "hero_org_chart_nodes_structure_id_hero_org_chart_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."hero_org_chart_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD CONSTRAINT "hero_org_chart_nodes_position_id_hero_master_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hero_master_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD CONSTRAINT "hero_org_chart_nodes_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_sections" ADD CONSTRAINT "hero_master_sections_department_id_hero_master_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_master_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_departments" DROP COLUMN "section_id";
