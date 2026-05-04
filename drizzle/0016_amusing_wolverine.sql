CREATE TABLE "hero_cargo_master_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_name" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"contact_person" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"province" text DEFAULT '' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_cargo_master_recipients_recipient_name_unique" UNIQUE("recipient_name")
);
