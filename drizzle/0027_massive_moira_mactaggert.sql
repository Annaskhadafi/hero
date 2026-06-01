CREATE TABLE "hero_checklist_template_revision_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"prompt" text NOT NULL,
	"input_type" text NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_checklist_template_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_checklist_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by_employee_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_checklist_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"revision_item_id" integer NOT NULL,
	"input_type" text NOT NULL,
	"value_text" text DEFAULT '' NOT NULL,
	"value_choice" text DEFAULT '' NOT NULL,
	"value_boolean" boolean,
	"value_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"template_revision_id" integer,
	"title_snapshot" text NOT NULL,
	"description_snapshot" text DEFAULT '' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"responsible_employee_id" integer,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score_percent" integer,
	"completed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_checklist_template_revision_items" ADD CONSTRAINT "hero_checklist_template_revision_items_revision_id_hero_checklist_template_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."hero_checklist_template_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_checklist_template_revisions" ADD CONSTRAINT "hero_checklist_template_revisions_template_id_hero_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_checklist_template_revisions" ADD CONSTRAINT "hero_checklist_template_revisions_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_checklist_templates" ADD CONSTRAINT "hero_checklist_templates_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_checklist_answers" ADD CONSTRAINT "hero_daily_checklist_answers_checklist_id_hero_daily_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."hero_daily_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_checklist_answers" ADD CONSTRAINT "hero_daily_checklist_answers_revision_item_id_hero_checklist_template_revision_items_id_fk" FOREIGN KEY ("revision_item_id") REFERENCES "public"."hero_checklist_template_revision_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_checklists" ADD CONSTRAINT "hero_daily_checklists_template_id_hero_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_checklists" ADD CONSTRAINT "hero_daily_checklists_template_revision_id_hero_checklist_template_revisions_id_fk" FOREIGN KEY ("template_revision_id") REFERENCES "public"."hero_checklist_template_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_checklists" ADD CONSTRAINT "hero_daily_checklists_responsible_employee_id_hero_employees_id_fk" FOREIGN KEY ("responsible_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_checklist_template_revision_items_revision_order_uq" ON "hero_checklist_template_revision_items" USING btree ("revision_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_checklist_template_revisions_template_rev_uq" ON "hero_checklist_template_revisions" USING btree ("template_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_daily_checklist_answers_checklist_item_uq" ON "hero_daily_checklist_answers" USING btree ("checklist_id","revision_item_id");