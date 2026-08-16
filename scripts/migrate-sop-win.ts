import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to database. Creating hero_sop_win_documents and hero_sop_win_revisions tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_sop_win_documents (
        id SERIAL PRIMARY KEY,
        document_number TEXT NOT NULL,
        title TEXT NOT NULL,
        document_type TEXT NOT NULL,
        department_code TEXT NOT NULL,
        owner_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        current_revision TEXT NOT NULL DEFAULT '00',
        status TEXT NOT NULL DEFAULT 'active',
        pdf_file_url TEXT NOT NULL,
        docx_file_url TEXT,
        rag_document_id TEXT,
        summary TEXT NOT NULL DEFAULT '',
        effective_date TIMESTAMP,
        created_by_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hero_sop_win_revisions (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES hero_sop_win_documents(id) ON DELETE CASCADE,
        revision_number TEXT NOT NULL,
        effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
        change_description TEXT NOT NULL DEFAULT '',
        pdf_file_url TEXT NOT NULL,
        docx_file_url TEXT,
        rag_document_id TEXT,
        revised_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sop_win_dept ON hero_sop_win_documents(department_code);
      CREATE INDEX IF NOT EXISTS idx_sop_win_type ON hero_sop_win_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_sop_win_doc_num ON hero_sop_win_documents(document_number);
    `);

    console.log("Tables hero_sop_win_documents and hero_sop_win_revisions created successfully!");
  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
