import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Pushing Interview Enhancement Schema Changes to Database...");

  try {
    // 1. Add columns to hero_hc_candidate_interviews
    await db.execute(sql`
      ALTER TABLE hero_hc_candidate_interviews 
      ADD COLUMN IF NOT EXISTS interviewer_emails jsonb,
      ADD COLUMN IF NOT EXISTS stage_name text NOT NULL DEFAULT 'Interview 1',
      ADD COLUMN IF NOT EXISTS stage_order integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS access_token text UNIQUE;
    `);
    console.log("✓ Updated hero_hc_candidate_interviews table");

    // 2. Add 12 dimension columns to hero_hc_candidate_panel_evaluations
    await db.execute(sql`
      ALTER TABLE hero_hc_candidate_panel_evaluations 
      ADD COLUMN IF NOT EXISTS panelist_email text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS stage_name text NOT NULL DEFAULT 'Interview 1',
      
      ADD COLUMN IF NOT EXISTS daya_tangkap_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS daya_tangkap_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS problem_solving_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS problem_solving_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS motivational_fit_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS motivational_fit_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS adaptability_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS adaptability_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS interpersonal_skills_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS interpersonal_skills_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS communication_skill_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS communication_skill_comment text NOT NULL DEFAULT '',

      ADD COLUMN IF NOT EXISTS fundamental_understanding_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fundamental_understanding_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS experience_related_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS experience_related_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS technical_skill_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS technical_skill_comment text NOT NULL DEFAULT '',

      ADD COLUMN IF NOT EXISTS managerial_skills_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS managerial_skills_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS leadership_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS leadership_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS team_work_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS team_work_comment text NOT NULL DEFAULT '',

      ADD COLUMN IF NOT EXISTS job_match_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS recommendation_other_position text NOT NULL DEFAULT '';
    `);
    console.log("✓ Updated hero_hc_candidate_panel_evaluations table");

    // 3. Create hero_hc_interview_settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_interview_settings (
        id SERIAL PRIMARY KEY,
        default_interviewer_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
        default_interviewer_names JSONB NOT NULL DEFAULT '[]'::jsonb,
        default_duration_minutes INTEGER NOT NULL DEFAULT 60,
        default_location_or_link TEXT NOT NULL DEFAULT '',
        default_interview_type TEXT NOT NULL DEFAULT 'Online',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Ensured hero_hc_interview_settings table exists");

    console.log("🚀 All Interview Enhancement DB schema changes pushed successfully!");
  } catch (error) {
    console.error("❌ Failed pushing schema changes:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
