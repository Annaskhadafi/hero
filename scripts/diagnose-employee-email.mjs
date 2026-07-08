/**
 * Script: diagnose-employee-email.mjs
 * Cek email mismatch antara auth user dan hero_employees
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dir, '..')

function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}
loadEnv(resolve(projectRoot, '.env.local'))
loadEnv(resolve(projectRoot, '.env'))

const { default: pg } = await import('pg')
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
const q = (text, params = []) => pool.query(text, params)

async function main() {
  console.log('\n🔍 DIAGNOSA EMAIL MISMATCH\n')

  // Auth users yang auth_user_id terhubung tapi email berbeda
  console.log('=== Auth users dengan email berbeda dari hero_employees ===')
  const { rows: mismatched } = await q(`
    SELECT
      u.id as auth_id,
      u.email as auth_email,
      e.id as emp_id,
      e.name as emp_name,
      e.email as emp_email,
      e.access_role
    FROM "user" u
    INNER JOIN hero_employees e ON e.auth_user_id = u.id
    WHERE u.email != e.email
    ORDER BY e.name
  `)

  if (mismatched.length === 0) {
    console.log('  ✅ Tidak ada email mismatch antara auth user dan hero_employees!')
  } else {
    console.log(`  ⚠️  ${mismatched.length} user dengan EMAIL BERBEDA:`)
    mismatched.forEach(m => {
      console.log(`  [${m.emp_id}] ${m.emp_name} (${m.access_role}):`)
      console.log(`    auth_email: "${m.auth_email}"`)
      console.log(`    emp_email:  "${m.emp_email}"`)
      console.log(`    → getCurrentEmployee() akan RETURN NULL untuk user ini!`)
    })
  }

  // Auth users yang TIDAK punya link ke hero_employees sama sekali
  console.log('\n=== Auth users TANPA link ke hero_employees ===')
  const { rows: noLink } = await q(`
    SELECT u.id, u.email, u.name
    FROM "user" u
    WHERE NOT EXISTS (
      SELECT 1 FROM hero_employees e
      WHERE e.auth_user_id = u.id OR e.email = u.email
    )
    ORDER BY u.email
  `)

  if (noLink.length === 0) {
    console.log('  ✅ Semua auth user punya link ke hero_employees')
  } else {
    console.log(`  ⚠️  ${noLink.length} auth user TANPA record di hero_employees:`)
    noLink.forEach(u => console.log(`    [${u.id.substring(0,8)}...] ${u.email}`))
    console.log('  → getCurrentEmployee() akan RETURN NULL untuk user ini!')
  }

  // Simulasi createCourse untuk auth users dengan Super Admin role
  console.log('\n=== Simulasi createCourse untuk Super Admin users ===')
  const { rows: superAdmins } = await q(`
    SELECT u.id as auth_id, u.email as auth_email, e.id as emp_id, e.name, e.email as emp_email, e.access_role
    FROM "user" u
    INNER JOIN hero_employees e ON e.auth_user_id = u.id
    WHERE e.access_role = 'Super Admin'
    ORDER BY e.name
  `)

  if (superAdmins.length === 0) {
    console.log('  ℹ️  Tidak ada employee dengan access_role = "Super Admin" yang linked ke auth')
  } else {
    for (const sa of superAdmins) {
      // Simulasi getCurrentEmployee: query by employees.email = session.user.email
      const { rows: foundByEmail } = await q(`
        SELECT id FROM hero_employees WHERE email = $1 LIMIT 1
      `, [sa.auth_email])

      const empFound = foundByEmail.length > 0
      const icon = empFound ? '🟢' : '🔴'
      console.log(`  ${icon} ${sa.name}:`)
      console.log(`    auth_email="${sa.auth_email}", emp_email="${sa.emp_email}"`)
      if (!empFound) {
        console.log(`    → getCurrentEmployee() RETURN NULL! createCourse() akan throw "Unauthorized"`)
      } else {
        console.log(`    → getCurrentEmployee() OK`)
      }
    }
  }

  console.log('\n🎉 Done.\n')
  await pool.end()
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
