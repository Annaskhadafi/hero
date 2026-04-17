CREATE TABLE "hero_approval_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_id" integer NOT NULL,
	"actor_employee_id" integer,
	"comment_kind" text DEFAULT 'comment' NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_approval_matrices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"structure_id" integer,
	"transaction_type" text DEFAULT 'activity' NOT NULL,
	"site_id" integer,
	"department_id" integer,
	"section_id" integer,
	"requester_position_id" integer,
	"activity_type" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'any' NOT NULL,
	"min_overtime_minutes" integer DEFAULT 0 NOT NULL,
	"max_overtime_minutes" integer,
	"description" text DEFAULT '' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_approval_matrix_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"matrix_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"node_id" integer,
	"fallback_node_id" integer,
	"escalation_node_id" integer,
	"approval_mode" text DEFAULT 'sequential' NOT NULL,
	"sla_hours" integer DEFAULT 24 NOT NULL,
	"can_delegate" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_submission_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"field_key" text NOT NULL,
	"field_type" text NOT NULL,
	"value_text" text DEFAULT '' NOT NULL,
	"display_value" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"template_version_id" integer NOT NULL,
	"requester_employee_id" integer NOT NULL,
	"site_id" integer,
	"legacy_activity_id" integer,
	"request_number" text DEFAULT '' NOT NULL,
	"request_status" text DEFAULT 'draft' NOT NULL,
	"workflow_snapshot" text DEFAULT '' NOT NULL,
	"payload_snapshot" text DEFAULT '' NOT NULL,
	"preview_snapshot" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_template_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"section_id" integer,
	"field_key" text NOT NULL,
	"field_type" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text DEFAULT '' NOT NULL,
	"help_text" text DEFAULT '' NOT NULL,
	"default_value" text DEFAULT '' NOT NULL,
	"config_json" text DEFAULT '' NOT NULL,
	"validation_json" text DEFAULT '' NOT NULL,
	"option_source_json" text DEFAULT '' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_template_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"section_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_collapsible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"publish_status" text DEFAULT 'draft' NOT NULL,
	"workflow_snapshot" text DEFAULT '' NOT NULL,
	"schema_snapshot" text DEFAULT '' NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"workflow_mode" text DEFAULT 'org_template' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_form_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "hero_inbox_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"approval_id" integer,
	"assignee_employee_id" integer,
	"inbox_type" text DEFAULT 'approval' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"snoozed_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer,
	"inbox_item_id" integer,
	"approval_id" integer,
	"channel" text DEFAULT 'email' NOT NULL,
	"event_type" text NOT NULL,
	"recipient" text NOT NULL,
	"payload_snapshot" text DEFAULT '' NOT NULL,
	"delivery_status" text DEFAULT 'queued' NOT NULL,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_org_node_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer NOT NULL,
	"employee_id" integer,
	"assignment_type" text DEFAULT 'primary' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_reminder_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbox_item_id" integer NOT NULL,
	"reminder_type" text DEFAULT 'before_due' NOT NULL,
	"reminder_at" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"execution_log" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_request_status_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"approval_id" integer,
	"actor_employee_id" integer,
	"from_status" text DEFAULT '' NOT NULL,
	"to_status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "approver_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "approver_node_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "approval_matrix_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "approval_step_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "resolution_source" text DEFAULT 'matrix' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "route_snapshot" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "decision_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "position_id" integer;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "org_node_id" integer;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "node_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "node_type" text DEFAULT 'position' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "approval_role" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "can_approve" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "can_delegate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "is_escalation_target" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "sla_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD COLUMN "fallback_node_id" integer;--> statement-breakpoint
ALTER TABLE "hero_org_chart_structures" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_structures" ADD COLUMN "effective_from" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_org_chart_structures" ADD COLUMN "effective_to" timestamp;--> statement-breakpoint
ALTER TABLE "hero_org_chart_structures" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approval_comments" ADD CONSTRAINT "hero_approval_comments_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_comments" ADD CONSTRAINT "hero_approval_comments_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrices" ADD CONSTRAINT "hero_approval_matrices_structure_id_hero_org_chart_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."hero_org_chart_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrices" ADD CONSTRAINT "hero_approval_matrices_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrices" ADD CONSTRAINT "hero_approval_matrices_department_id_hero_master_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_master_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrices" ADD CONSTRAINT "hero_approval_matrices_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrices" ADD CONSTRAINT "hero_approval_matrices_requester_position_id_hero_master_positions_id_fk" FOREIGN KEY ("requester_position_id") REFERENCES "public"."hero_master_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrix_steps" ADD CONSTRAINT "hero_approval_matrix_steps_matrix_id_hero_approval_matrices_id_fk" FOREIGN KEY ("matrix_id") REFERENCES "public"."hero_approval_matrices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrix_steps" ADD CONSTRAINT "hero_approval_matrix_steps_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrix_steps" ADD CONSTRAINT "hero_approval_matrix_steps_fallback_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("fallback_node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approval_matrix_steps" ADD CONSTRAINT "hero_approval_matrix_steps_escalation_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("escalation_node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submission_values" ADD CONSTRAINT "hero_form_submission_values_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_template_id_hero_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_form_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_template_version_id_hero_form_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."hero_form_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_requester_employee_id_hero_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_legacy_activity_id_hero_activities_id_fk" FOREIGN KEY ("legacy_activity_id") REFERENCES "public"."hero_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_template_fields" ADD CONSTRAINT "hero_form_template_fields_version_id_hero_form_template_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."hero_form_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_template_fields" ADD CONSTRAINT "hero_form_template_fields_section_id_hero_form_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_form_template_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_template_sections" ADD CONSTRAINT "hero_form_template_sections_version_id_hero_form_template_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."hero_form_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_template_versions" ADD CONSTRAINT "hero_form_template_versions_template_id_hero_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_form_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_template_versions" ADD CONSTRAINT "hero_form_template_versions_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inbox_items" ADD CONSTRAINT "hero_inbox_items_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inbox_items" ADD CONSTRAINT "hero_inbox_items_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inbox_items" ADD CONSTRAINT "hero_inbox_items_assignee_employee_id_hero_employees_id_fk" FOREIGN KEY ("assignee_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_events" ADD CONSTRAINT "hero_notification_events_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_events" ADD CONSTRAINT "hero_notification_events_inbox_item_id_hero_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."hero_inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_notification_events" ADD CONSTRAINT "hero_notification_events_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_node_assignments" ADD CONSTRAINT "hero_org_node_assignments_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_node_assignments" ADD CONSTRAINT "hero_org_node_assignments_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reminder_jobs" ADD CONSTRAINT "hero_reminder_jobs_inbox_item_id_hero_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."hero_inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_request_status_histories" ADD CONSTRAINT "hero_request_status_histories_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_request_status_histories" ADD CONSTRAINT "hero_request_status_histories_approval_id_hero_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."hero_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_request_status_histories" ADD CONSTRAINT "hero_request_status_histories_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD CONSTRAINT "hero_org_chart_nodes_parent_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("parent_node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_org_chart_nodes" ADD CONSTRAINT "hero_org_chart_nodes_fallback_node_id_hero_org_chart_nodes_id_fk" FOREIGN KEY ("fallback_node_id") REFERENCES "public"."hero_org_chart_nodes"("id") ON DELETE set null ON UPDATE no action;