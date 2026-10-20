import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Menyiapkan tabel hero_hrga_kerjasama_sekolah...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_hrga_kerjasama_sekolah (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        institution_type TEXT NOT NULL DEFAULT 'SMK',
        location TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        start_date DATE,
        end_date DATE,
        status TEXT NOT NULL DEFAULT 'active',
        contact_person TEXT NOT NULL DEFAULT '',
        contact_phone TEXT NOT NULL DEFAULT '',
        contract_document_url TEXT,
        contract_document_name TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✅ Tabel hero_hrga_kerjasama_sekolah siap!')
  } catch (err) {
    console.error('❌ Gagal menyiapkan tabel hero_hrga_kerjasama_sekolah:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
