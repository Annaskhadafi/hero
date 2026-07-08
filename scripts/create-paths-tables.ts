import { Pool } from 'pg'

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral",
  })

  try {
    console.log('Creating hero_chitralearning_paths table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_chitralearning_paths (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        cover_image_url TEXT,
        created_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Creating hero_chitralearning_path_courses table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_chitralearning_path_courses (
        id SERIAL PRIMARY KEY,
        path_id INTEGER NOT NULL REFERENCES hero_chitralearning_paths(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES hero_chitralearning_courses(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Tables created successfully!')
  } catch (error) {
    console.error('Error creating tables:', error)
  } finally {
    await pool.end()
  }
}

void run()
