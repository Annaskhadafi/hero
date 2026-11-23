import { db } from '../db'
import { sql } from 'drizzle-orm'

async function migrate() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_chitralearning_testimonials (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES hero_chitralearning_courses(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        training_title TEXT NOT NULL,
        experience_review TEXT NOT NULL,
        knowledge_benefit TEXT NOT NULL,
        feedback_suggestion TEXT NOT NULL DEFAULT '',
        allow_display BOOLEAN NOT NULL DEFAULT true,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_hero_cl_testimonials_emp ON hero_chitralearning_testimonials(employee_id);
      CREATE INDEX IF NOT EXISTS idx_hero_cl_testimonials_course ON hero_chitralearning_testimonials(course_id);
    `)
    console.log('Table hero_chitralearning_testimonials created successfully.')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
  process.exit(0)
}

migrate()
