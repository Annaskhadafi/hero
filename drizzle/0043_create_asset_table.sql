-- Central Service asset master follows MASTER_ROOSTER_TOOLS_2026.xlsx.
-- Asset numbers are optional and can repeat in the workbook.
DROP INDEX IF EXISTS "cs_asset_number_idx";
ALTER TABLE "hero_central_service_assets" ALTER COLUMN "asset_number" DROP NOT NULL;
ALTER TABLE "hero_central_service_assets" ADD COLUMN IF NOT EXISTS "work_section" text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "hero_central_service_asset_attachments" (
  "id" serial PRIMARY KEY NOT NULL,
  "asset_id" integer NOT NULL REFERENCES "hero_central_service_assets"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL DEFAULT '',
  "file_url" text NOT NULL,
  "mime_type" text NOT NULL DEFAULT 'application/octet-stream',
  "file_size" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cs_asset_attachment_asset_idx"
  ON "hero_central_service_asset_attachments" ("asset_id");
