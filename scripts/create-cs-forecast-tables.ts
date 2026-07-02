import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating Forecast Revenue Central Service tables...");

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_central_service_forecast_periods" (
        "id" serial PRIMARY KEY,
        "month_year" text NOT NULL UNIQUE,
        "exchange_rate_idr_to_usd" numeric NOT NULL DEFAULT '15000',
        "status" text NOT NULL DEFAULT 'Draft',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Created hero_central_service_forecast_periods");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_central_service_forecast_items" (
        "id" serial PRIMARY KEY,
        "period_id" integer NOT NULL REFERENCES "hero_central_service_forecast_periods"("id") ON DELETE CASCADE,
        "customer" text NOT NULL,
        "pic_sales" text NOT NULL DEFAULT '',
        "os_invoice_prev_month" numeric NOT NULL DEFAULT '0',
        "repair_forecast" numeric NOT NULL DEFAULT '0',
        "retread_forecast" numeric NOT NULL DEFAULT '0',
        "service_forecast" numeric NOT NULL DEFAULT '0',
        "total_forecast_idr" numeric NOT NULL DEFAULT '0',
        "remaining_repair" numeric NOT NULL DEFAULT '0',
        "remaining_retread" numeric NOT NULL DEFAULT '0',
        "remaining_service" numeric NOT NULL DEFAULT '0',
        "remaining_total_idr" numeric NOT NULL DEFAULT '0',
        "is_product_accessories" boolean NOT NULL DEFAULT false,
        "accessories_amount_idr" numeric NOT NULL DEFAULT '0',
        "accessories_amount_usd" numeric NOT NULL DEFAULT '0',
        "remaining_accessories_idr" numeric NOT NULL DEFAULT '0',
        "remaining_accessories_usd" numeric NOT NULL DEFAULT '0',
        "status" text NOT NULL DEFAULT 'Waiting',
        "remark" text NOT NULL DEFAULT '',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "cs_forecast_items_period_idx" ON "hero_central_service_forecast_items"("period_id");
    `);
    console.log("Created hero_central_service_forecast_items");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_central_service_forecast_actuals" (
        "id" serial PRIMARY KEY,
        "period_id" integer NOT NULL REFERENCES "hero_central_service_forecast_periods"("id") ON DELETE CASCADE,
        "forecast_item_id" integer REFERENCES "hero_central_service_forecast_items"("id") ON DELETE SET NULL,
        "update_date" timestamp NOT NULL DEFAULT now(),
        "invoice_number" text NOT NULL,
        "customer" text,
        "category" text NOT NULL,
        "job_code" text NOT NULL DEFAULT '',
        "amount_idr" numeric NOT NULL DEFAULT '0',
        "amount_usd" numeric NOT NULL DEFAULT '0',
        "remark" text NOT NULL DEFAULT '',
        "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "cs_forecast_actuals_period_idx" ON "hero_central_service_forecast_actuals"("period_id");
      CREATE INDEX IF NOT EXISTS "cs_forecast_actuals_item_idx" ON "hero_central_service_forecast_actuals"("forecast_item_id");
    `);
    console.log("Created hero_central_service_forecast_actuals");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_central_service_forecast_histories" (
        "id" serial PRIMARY KEY,
        "forecast_item_id" integer NOT NULL REFERENCES "hero_central_service_forecast_items"("id") ON DELETE CASCADE,
        "previous_status" text NOT NULL,
        "new_status" text NOT NULL,
        "action_remark" text NOT NULL DEFAULT '',
        "action_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "cs_forecast_history_item_idx" ON "hero_central_service_forecast_histories"("forecast_item_id");
    `);
    console.log("Created hero_central_service_forecast_histories");

    console.log("Done.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
  process.exit(0);
}

main();
