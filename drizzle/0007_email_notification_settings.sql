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
