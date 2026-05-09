CREATE TABLE "hero_indonesia_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"local_name" text NOT NULL,
	"country_code" text DEFAULT 'ID' NOT NULL,
	"source" text DEFAULT 'openholiday' NOT NULL,
	"source_id" text,
	"types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nationwide" boolean DEFAULT true NOT NULL,
	"raw_payload" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hero_indonesia_holidays_date_source_uidx" ON "hero_indonesia_holidays" USING btree ("date","source");
