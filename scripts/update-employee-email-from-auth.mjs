/**
 * Script: update-employee-email-from-auth.mjs
 * Tujuan: Mengupdate hero_employees.email dengan email dari tabel "user" (auth)
 * bagi employee yang sudah ter-link (auth_user_id tidak null) tetapi email-nya berbeda.
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

loadEnv(resolve(projectRoot, '.env.local'))
loadEnv(resolve(projectRoot, '.env'))

const { default: pg } = await import('pg')
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ada di env')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
})

const q = (text, params = []) => pool.query(text, params)

async function main() {
  console.log('\n🚀 Memulai proses update email employee dari auth user...\n')

  // 1. Cek berapa data yang akan diupdate
  const { rows: mismatched } = await q(`
    SELECT
      u.id as auth_id,
      u.email as auth_email,
      e.id as emp_id,
      e.name as emp_name,
      e.email as emp_email
    FROM "user" u
    INNER JOIN hero_employees e ON e.auth_user_id = u.id
    WHERE u.email != e.email
  `)

  if (mismatched.length === 0) {
    console.log('✅ Tidak ada email yang perlu di-update. Semua email sudah sama.')
    await pool.end()
    return
  }

  console.log(`⚠️  Ditemukan ${mismatched.length} employee dengan email yang berbeda dari auth user.\n`)
  
  // Menampilkan beberapa contoh sebelum update
  console.log('Contoh data yang akan di-update:')
  mismatched.slice(0, 5).forEach(m => {
    console.log(`  - [${m.emp_name}] dari "${m.emp_email}" menjadi "${m.auth_email}"`)
  })
  if (mismatched.length > 5) console.log('  ...dan lainnya')

  console.log('\n⏳ Mengeksekusi update...')

  // 2. Lakukan update
  const { rows: updatedRows } = await q(`
    UPDATE hero_employees e
    SET email = u.email
    FROM "user" u
    WHERE e.auth_user_id = u.id AND e.email != u.email
    RETURNING e.id, e.name, e.email as new_email
  `)

  console.log(`\n🎉 Selesai! Berhasil meng-update email untuk ${updatedRows.length} employee.`)
  
  await pool.end()
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
