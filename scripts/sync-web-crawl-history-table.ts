import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function createTableDirectly() {
  console.log("=== Creating hero_genius_web_crawl_history table in PostgreSQL ===");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_genius_web_crawl_history (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      site_name VARCHAR(150),
      markdown TEXT NOT NULL,
      char_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      total_chunks INTEGER NOT NULL DEFAULT 0,
      is_ai_enhanced BOOLEAN NOT NULL DEFAULT FALSE,
      model_used VARCHAR(100),
      ingested_to_knowledge_base BOOLEAN NOT NULL DEFAULT FALSE,
      ingested_document_id VARCHAR(120),
      user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log("✅ Table hero_genius_web_crawl_history is ready and synchronized!");
  process.exit(0);
}

createTableDirectly().catch((err) => {
  console.error("Failed to create table:", err);
  process.exit(1);
});
