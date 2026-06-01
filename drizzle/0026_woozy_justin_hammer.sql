CREATE TABLE "hero_safety_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"findings" text DEFAULT '' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"assessment_score" integer,
	"pic_name" text DEFAULT '' NOT NULL,
	"report_attachment_url" text DEFAULT '' NOT NULL,
	"result_attachment_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
