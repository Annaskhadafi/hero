import 'dotenv/config'
import { db } from '../db'
import { sql } from 'drizzle-orm'

async function addPerformanceIndexes() {
  console.log('--- Applying Performance Indexes for HERO System ---')
  const queries = [
    `CREATE INDEX IF NOT EXISTS idx_hero_da_sessions_emp_created ON hero_daily_activity_sessions (employee_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_sessions_site ON hero_daily_activity_sessions (site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_sessions_status ON hero_daily_activity_sessions (status)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_session_items_session ON hero_daily_activity_session_items (session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_approvals_session ON hero_daily_activity_approvals (session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_approvals_status ON hero_daily_activity_approvals (status)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_da_approvals_approver ON hero_daily_activity_approvals (approver_employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_activities_emp_start ON hero_activities (employee_id, start_time DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_activities_site ON hero_activities (site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_activities_status ON hero_activities (status)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_activity_photos_activity ON hero_activity_photos (activity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_job_assignments_emp_date ON hero_job_assignments (assigned_to_employee_id, assigned_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_approvals_activity ON hero_approvals (activity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_approvals_submission ON hero_approvals (submission_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_approvals_status ON hero_approvals (status)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_approvals_approver ON hero_approvals (approver_employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_employees_active_name ON hero_employees (is_active, name)`,
    `CREATE INDEX IF NOT EXISTS idx_hero_employees_site_section ON hero_employees (site_id, section_id)`,
  ]

  for (const q of queries) {
    const t0 = Date.now()
    await db.execute(sql.raw(q))
    console.log(`[OK] ${q.split(' ')[5]} (${Date.now() - t0}ms)`)
  }
  console.log('--- All Performance Indexes verified & active! ---')
  process.exit(0)
}

addPerformanceIndexes().catch((err) => {
  console.error('[Error] Failed to apply indexes:', err)
  process.exit(1)
})
