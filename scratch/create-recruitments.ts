import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Recreating recruitment tables...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_recruitments (
        id SERIAL PRIMARY KEY,
        job_title TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT '',
        section TEXT NOT NULL DEFAULT '',
        total_requested INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'Sourcing',
        
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        job_description TEXT NOT NULL DEFAULT '',
        requirements TEXT NOT NULL DEFAULT '',
        qualifications JSONB,
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hero_hc_candidates (
        id SERIAL PRIMARY KEY,
        recruitment_id INTEGER REFERENCES hero_hc_recruitments(id) ON DELETE SET NULL,
        
        full_name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        date_of_birth TIMESTAMP,
        address TEXT NOT NULL DEFAULT '',
        gender VARCHAR(50) NOT NULL DEFAULT '',
        
        work_experience JSONB,
        education JSONB,
        driving_licenses JSONB,
        certificates JSONB,
        achievements TEXT NOT NULL DEFAULT '',
        
        cv_url TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '',
        current_stage TEXT NOT NULL DEFAULT 'Sourcing',
        rating INTEGER,
        
        ai_score INTEGER,
        ai_summary TEXT NOT NULL DEFAULT '',
        ai_assessment_date TIMESTAMP,
        
        notes TEXT NOT NULL DEFAULT '',
        rejection_reason TEXT NOT NULL DEFAULT '',
        rejected_at_stage TEXT NOT NULL DEFAULT '',
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("Tables created successfully!");
  } catch (error) {
    console.error("Failed to create tables:", error);
  }
  process.exit(0);
}

main();
