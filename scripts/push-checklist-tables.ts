import { db } from '@/db'
import {
  checklistTemplates,
  checklistTemplateRevisions,
  checklistTemplateRevisionItems,
  dailyChecklists,
  dailyChecklistAnswers,
} from '@/db/schema/hero'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Creating checklist tables...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_checklist_templates (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✓ hero_checklist_templates')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_checklist_template_revisions (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL REFERENCES hero_checklist_templates(id) ON DELETE CASCADE,
      revision_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✓ hero_checklist_template_revisions')

  await db.execute(sql`
    ALTER TABLE IF EXISTS hero_checklist_template_revisions
    ADD COLUMN IF NOT EXISTS created_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hero_checklist_template_revisions_template_rev_uq
      ON hero_checklist_template_revisions (template_id, revision_number)
  `)
  console.log('  ✓ index template_rev_uq')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_checklist_template_revision_items (
      id SERIAL PRIMARY KEY,
      revision_id INTEGER NOT NULL REFERENCES hero_checklist_template_revisions(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      prompt TEXT NOT NULL DEFAULT '',
      input_type TEXT NOT NULL DEFAULT 'yes_no_na',
      options JSONB,
      is_required BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✓ hero_checklist_template_revision_items')

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hero_checklist_template_revision_items_revision_order_uq
      ON hero_checklist_template_revision_items (revision_id, order_index)
  `)
  console.log('  ✓ index revision_order_uq')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_daily_checklists (
      id SERIAL PRIMARY KEY,
      template_id INTEGER REFERENCES hero_checklist_templates(id) ON DELETE SET NULL,
      template_revision_id INTEGER REFERENCES hero_checklist_template_revisions(id) ON DELETE SET NULL,
      title_snapshot TEXT NOT NULL DEFAULT '',
      description_snapshot TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      responsible_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      responsible_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'in_progress',
      score_percent DOUBLE PRECISION,
      completed_at TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✓ hero_daily_checklists')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_daily_checklist_answers (
      id SERIAL PRIMARY KEY,
      checklist_id INTEGER NOT NULL REFERENCES hero_daily_checklists(id) ON DELETE CASCADE,
      revision_item_id INTEGER NOT NULL REFERENCES hero_checklist_template_revision_items(id) ON DELETE CASCADE,
      input_type TEXT NOT NULL DEFAULT 'yes_no_na',
      value_choice TEXT NOT NULL DEFAULT '',
      value_text TEXT NOT NULL DEFAULT '',
      value_number DOUBLE PRECISION,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('  ✓ hero_daily_checklist_answers')

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hero_daily_checklist_answers_checklist_item_uq
      ON hero_daily_checklist_answers (checklist_id, revision_item_id)
  `)
  console.log('  ✓ index checklist_item_uq')

  console.log('All checklist tables created successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
