CREATE TABLE "hero_approval_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"approval_id" integer,
	"attachment_kind" text DEFAULT 'file' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_approval_request_actors" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"approval_id" integer,
	"actor_employee_id" integer,
	"actor_role" text DEFAULT 'approver' NOT NULL,
	"assignment_type" text DEFAULT 'primary' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"acted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_field_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"option_value" text NOT NULL,
	"option_label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_validation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"rule_type" text NOT NULL,
	"operator" text DEFAULT '=' NOT NULL,
	"rule_value" text DEFAULT '' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_event_id" integer NOT NULL,
	"delivery_channel" text DEFAULT 'in_app' NOT NULL,
	"recipient" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_step_decision_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"approval_id" integer NOT NULL,
	"actor_employee_id" integer,
	"decision" text NOT NULL,
	"decision_note" text DEFAULT '' NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_version_id" integer NOT NULL,
	"branch_key" text NOT NULL,
	"label" text NOT NULL,
	"outcome_type" text DEFAULT 'route' NOT NULL,
	"route_mode" text DEFAULT 'sequential' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_version_id" integer NOT NULL,
	"parent_condition_id" integer,
	"field_key" text NOT NULL,
	"operator" text DEFAULT '=' NOT NULL,
	"compare_value" text DEFAULT '' NOT NULL,
	"logical_join" text DEFAULT 'AND' NOT NULL,
	"group_label" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_notification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_version_id" integer NOT NULL,
	"branch_id" integer,
	"event_type" text NOT NULL,
	"channel" text DEFAULT 'in_app' NOT NULL,
	"recipient_mode" text DEFAULT 'approver' NOT NULL,
	"cc_mode" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_reminder_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_version_id" integer NOT NULL,
	"step_rule_id" integer,
	"reminder_type" text DEFAULT 'before_due' NOT NULL,
	"offset_hours" integer DEFAULT 2 NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_step_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_version_id" integer NOT NULL,
	"branch_id" integer,
	"approval_matrix_step_id" integer,
	"step_order" integer DEFAULT 1 NOT NULL,
	"label" text NOT NULL,
	"approval_mode" text DEFAULT 'sequential' NOT NULL,
	"assignment_source" text DEFAULT 'matrix' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_template_id" integer NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"publish_status" text DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_workflow_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"name" text NOT NULL,
	"mode" text DEFAULT 'org_template' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_workflow_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
ALTER TABLE "hero_approval_attachments" ADD CONSTRAINT "hero_approval_attachments_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_attachments" ADD CONSTRAINT "hero_approval_attachments_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_attachments" ADD CONSTRAINT "hero_approval_attachments_uploaded_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("uploaded_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_request_actors" ADD CONSTRAINT "hero_approval_request_actors_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_request_actors" ADD CONSTRAINT "hero_approval_request_actors_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_request_actors" ADD CONSTRAINT "hero_approval_request_actors_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_field_options" ADD CONSTRAINT "hero_form_field_options_field_id_hero_form_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."hero_form_template_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_validation_rules" ADD CONSTRAINT "hero_form_validation_rules_field_id_hero_form_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."hero_form_template_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_deliveries" ADD CONSTRAINT "hero_notification_deliveries_notification_event_id_hero_notification_events_id_fk" FOREIGN KEY ("notification_event_id") REFERENCES "public"."hero_notification_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_step_decision_histories" ADD CONSTRAINT "hero_step_decision_histories_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_step_decision_histories" ADD CONSTRAINT "hero_step_decision_histories_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_step_decision_histories" ADD CONSTRAINT "hero_step_decision_histories_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_branches" ADD CONSTRAINT "hero_workflow_branches_workflow_version_id_hero_workflow_template_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."hero_workflow_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_conditions" ADD CONSTRAINT "hero_workflow_conditions_workflow_version_id_hero_workflow_template_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."hero_workflow_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_conditions" ADD CONSTRAINT "hero_workflow_conditions_parent_condition_id_hero_workflow_conditions_id_fk" FOREIGN KEY ("parent_condition_id") REFERENCES "public"."hero_workflow_conditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_notification_rules" ADD CONSTRAINT "hero_workflow_notification_rules_workflow_version_id_hero_workflow_template_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."hero_workflow_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_notification_rules" ADD CONSTRAINT "hero_workflow_notification_rules_branch_id_hero_workflow_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hero_workflow_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_reminder_rules" ADD CONSTRAINT "hero_workflow_reminder_rules_workflow_version_id_hero_workflow_template_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."hero_workflow_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_reminder_rules" ADD CONSTRAINT "hero_workflow_reminder_rules_step_rule_id_hero_workflow_step_rules_id_fk" FOREIGN KEY ("step_rule_id") REFERENCES "public"."hero_workflow_step_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_step_rules" ADD CONSTRAINT "hero_workflow_step_rules_workflow_version_id_hero_workflow_template_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."hero_workflow_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_step_rules" ADD CONSTRAINT "hero_workflow_step_rules_branch_id_hero_workflow_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hero_workflow_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_step_rules" ADD CONSTRAINT "hero_workflow_step_rules_approval_matrix_step_id_hero_approval_matrix_steps_id_fk" FOREIGN KEY ("approval_matrix_step_id") REFERENCES "public"."hero_approval_matrix_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_workflow_template_versions" ADD CONSTRAINT "hero_workflow_template_versions_workflow_template_id_hero_workflow_templates_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."hero_workflow_templates"("id") ON DELETE cascade ON UPDATE no action;