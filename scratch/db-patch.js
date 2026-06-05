require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query('ALTER TABLE hero_hc_recruitments ADD COLUMN mandatory_fields jsonb DEFAULT \'[]\'::jsonb;');
    console.log('Added mandatory_fields');
  } catch (e) {
    console.log(e.message);
  }

  try {
    await pool.query('ALTER TABLE hero_hc_recruitments ADD COLUMN email_template_id integer;');
    console.log('Added email_template_id');
  } catch (e) {
    console.log(e.message);
  }

  // Also create the missing tables for tests so that it doesn't crash if navigated to.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_hc_online_tests (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        time_limit_minutes INTEGER DEFAULT 60 NOT NULL,
        passing_score INTEGER DEFAULT 70 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    console.log('Created hero_hc_online_tests');
  } catch (e) {
    console.log(e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_hc_online_test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES hero_hc_online_tests(id) ON DELETE CASCADE,
        question_type TEXT NOT NULL,
        question_text TEXT NOT NULL,
        options JSONB,
        correct_answer TEXT NOT NULL,
        points INTEGER DEFAULT 10 NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    console.log('Created hero_hc_online_test_questions');
  } catch (e) {
    console.log(e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_hc_online_test_assignments (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER,
        test_id INTEGER REFERENCES hero_hc_online_tests(id) ON DELETE CASCADE,
        access_key TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'Pending' NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    console.log('Created hero_hc_online_test_assignments');
  } catch (e) {
    console.log(e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_hc_online_test_answers (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES hero_hc_online_test_assignments(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES hero_hc_online_test_questions(id) ON DELETE CASCADE,
        answer_text TEXT NOT NULL,
        is_correct BOOLEAN,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    console.log('Created hero_hc_online_test_answers');
  } catch (e) {
    console.log(e.message);
  }

  process.exit(0);
}

run();
