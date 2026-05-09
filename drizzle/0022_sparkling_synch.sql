CREATE TABLE "hero_timesheet_attendance_real_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"employee_id" integer NOT NULL,
	"day" integer NOT NULL,
	"status" text DEFAULT 'empty' NOT NULL,
	"clock_in" text DEFAULT '' NOT NULL,
	"clock_out" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"saved_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_field_break_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" text NOT NULL,
	"section_name" text DEFAULT '' NOT NULL,
	"roster_section" text DEFAULT '' NOT NULL,
	"on_site_date" date NOT NULL,
	"day_count" integer DEFAULT 90 NOT NULL,
	"field_break_date" date NOT NULL,
	"saved_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD CONSTRAINT "hero_timesheet_attendance_real_overrides_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD CONSTRAINT "hero_timesheet_attendance_real_overrides_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD CONSTRAINT "hero_timesheet_attendance_real_overrides_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD CONSTRAINT "hero_timesheet_field_break_plans_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD CONSTRAINT "hero_timesheet_field_break_plans_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD CONSTRAINT "hero_timesheet_field_break_plans_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_attendance_real_overrides_employee_day_uidx" ON "hero_timesheet_attendance_real_overrides" USING btree ("site_id","period","employee_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_field_break_plans_employee_period_uidx" ON "hero_timesheet_field_break_plans" USING btree ("site_id","period","employee_id");