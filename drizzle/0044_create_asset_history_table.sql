CREATE TABLE IF NOT EXISTS "hero_central_service_asset_histories" (
  "id" serial PRIMARY KEY NOT NULL,
  "asset_id" integer NOT NULL REFERENCES "hero_central_service_assets"("id") ON DELETE CASCADE,
  "action" text NOT NULL DEFAULT 'update',
  "field_name" text NOT NULL DEFAULT '',
  "field_label" text NOT NULL DEFAULT '',
  "previous_value" text,
  "new_value" text,
  "change_remark" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cs_asset_history_asset_idx"
  ON "hero_central_service_asset_histories" ("asset_id");
