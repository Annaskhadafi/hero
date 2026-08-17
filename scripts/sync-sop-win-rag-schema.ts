import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and syncing SOP/WIN RAG schema...");

  // 1. Add columns to hero_sop_win_documents if not exists
  await db.execute(sql`
    ALTER TABLE hero_sop_win_documents
    ADD COLUMN IF NOT EXISTS rag_status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS rag_error_message text,
    ADD COLUMN IF NOT EXISTS rag_processed_at timestamp;
  `);
  console.log("✓ hero_sop_win_documents columns synced.");

  // 2. Add columns to hero_sop_win_revisions if not exists
  await db.execute(sql`
    ALTER TABLE hero_sop_win_revisions
    ADD COLUMN IF NOT EXISTS rag_status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS rag_error_message text;
  `);
  console.log("✓ hero_sop_win_revisions columns synced.");

  // 3. Create hero_sop_win_rag_queue table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_sop_win_rag_queue (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES hero_sop_win_documents(id) ON DELETE CASCADE,
      revision_id INTEGER REFERENCES hero_sop_win_revisions(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'pdf',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ hero_sop_win_rag_queue table synced.");

  // 4. Update any existing documents with rag_document_id to 'ready'
  await db.execute(sql`
    UPDATE hero_sop_win_documents
    SET rag_status = 'ready'
    WHERE rag_document_id IS NOT NULL AND rag_status = 'pending';
  `);
  console.log("✓ Updated existing ready documents.");

  console.log("All SOP/WIN RAG schema changes applied successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Schema sync error:", err);
  process.exit(1);
});
