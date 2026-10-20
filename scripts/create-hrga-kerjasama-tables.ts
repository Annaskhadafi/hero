import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Menyiapkan tabel HRGA Kerjasama...')

    // 1. Tabel Kerjasama RS & Faskes
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_hrga_kerjasama_rs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
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
    console.log('✅ Tabel hero_hrga_kerjasama_rs siap!')

    // 2. Tabel Siswa PKL / Magang
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_hrga_pkl_students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        institution TEXT NOT NULL,
        major TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        duration_months INTEGER NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 0,
        duration_display TEXT NOT NULL DEFAULT '',
        mentor_name TEXT NOT NULL,
        mentor_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✅ Tabel hero_hrga_pkl_students siap!')

    // 3. Seed data Kerjasama RS jika masih kosong
    const rsCountRes = await client.query('SELECT COUNT(*) FROM hero_hrga_kerjasama_rs')
    if (parseInt(rsCountRes.rows[0].count) === 0) {
      console.log('🌱 Melakukan seeding data awal Kerjasama Rumah Sakit...')
      const rsData = [
        ['RS Sari Mulia', 'Banjarmasin', '', '2024-08-01', '2026-07-31', 'expired', '', '', ''],
        ['RS Meloy', 'Sangatta', '', '2025-05-06', '2030-05-05', 'active', '', '', ''],
        ['RS Prima Inco', 'Sorowako', '', '2026-06-02', '2028-06-01', 'active', '', '', ''],
        ['RS Siaga Al Munawwarah', 'Samarinda', '', '2026-03-02', '2028-03-01', 'active', '', '', ''],
        ['RS Hermina', 'Samarinda', '', null, null, 'no_partnership', '', '', 'Belum ada kerjasama'],
        ['RS Datu Sanggul', 'Binuang', '', null, null, 'no_partnership', '', '', ''],
        ['RS dr. Kanujoso Djatiwibowo', 'Balikpapan', '', '2024-09-15', '2026-09-14', 'expired', '', '', ''],
        ['RS Syifa Medika Persada', 'Banjarbaru', '', '2024-05-02', '2027-03-31', 'active', '', '', ''],
        ['RS Samarinda Medica Citra', 'Samarinda', '', '2024-01-01', '2025-12-31', 'expired', '', '', 'Extend per 01 Sept 2026 ( Durasi 3 tahun )'],
        ['Pramita Lab', 'Balikpapan', '', null, null, 'no_partnership', '', '', ''],
        ['RS Pertamina', 'Balikpapan', '', null, null, 'no_partnership', '', '', ''],
        ['Siloam Hospital', 'Balikpapan', '', null, null, 'no_partnership', '', '', ''],
        ['RS Balikpapan Baru', 'Balikpapan', '', null, null, 'no_partnership', '', '', ''],
        ['Tirta Medical Clinic', 'Balikpapan', '', null, null, 'no_partnership', '', '', ''],
        ['RS Ciputra', 'Banjarmasin', '', '2026-09-01', '2029-08-31', 'active', '', '', ''],
      ]

      for (const item of rsData) {
        await client.query(`
          INSERT INTO hero_hrga_kerjasama_rs 
          (name, location, address, start_date, end_date, status, contact_person, contact_phone, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, item)
      }
      console.log('✅ 15 Data Kerjasama RS berhasil di-seed!')
    }

    // 4. Seed data Siswa PKL jika masih kosong
    const pklCountRes = await client.query('SELECT COUNT(*) FROM hero_hrga_pkl_students')
    if (parseInt(pklCountRes.rows[0].count) === 0) {
      console.log('🌱 Melakukan seeding data awal Siswa PKL...')
      const pklData = [
        ['Kayla Nafeeza Rifai', 'SMKN 2 BPN', 'Management Perkantoran', '2026-06-22', '2026-09-30', 3, 8, '3 Bulan 8 Hari', 'Bardinia', 'completed'],
        ['Refah Ainayah Febriyanti', 'SMK Inne Dongwha Penajam', 'Tehnik Komputer Jaringan', '2026-07-01', '2026-08-31', 1, 30, '1 Bulan 30 Hari', 'Dwi Astuti', 'completed'],
        ['Cintia', 'SMKN 7 BPN', 'Teknik Instalasi Listrik', '2026-07-01', '2026-12-20', 5, 19, '5 Bulan 19 Hari', 'Sandy', 'active'],
        ['Airin Putri Vanessa', 'SMK Setia Budi BPN', 'Tehnik Komputer Jaringan', '2026-07-01', '2026-12-30', 5, 29, '5 Bulan 29 Hari', 'Aditya J.N / Gilang', 'active'],
        ['Muhammad Alif Mansur', 'SMK Setia Budi BPN', 'Tehnik Komputer Jaringan', '2026-07-01', '2026-12-30', 5, 29, '5 Bulan 29 Hari', 'Aditya J.N / Gilang', 'active'],
        ['Risyaldi Abdyan Ramadhani', 'SMK Setia Budi BPN', 'Teknik Alat Berat', '2026-07-01', '2026-12-30', 5, 29, '5 Bulan 29 Hari', 'Ary Maulana', 'active'],
        ['Raihan Putra Ariyanto N.', 'SMKN 6 BPN', 'Teknik Komputer & Jaringan', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'Aditya J.N / Gilang', 'active'],
        ['M. Rohan Eka Saputra', 'SMKN 6 BPN', 'Teknik Komputer & Jaringan', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'Aditya J.N / Gilang', 'active'],
        ['Andi Rivelani Aurellah', 'SMKN 6 BPN', 'Rekayasa Perangkat Lunak', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'M. Annas Khadafi', 'active'],
        ['Raya Raihana Yasmin', 'SMKN 6 BPN', 'Rekayasa Perangkat Lunak', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'M. Annas Khadafi', 'active'],
        ['Salman Alfarizi Musthafa', 'SMKN 6 BPN', 'Teknik Instalasi Tenaga Listrik', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'Sandy', 'active'],
        ['Dzakira Afifah', 'SMKN 6 BPN', 'Teknik Kendaraan Ringan', '2026-07-08', '2026-12-20', 5, 12, '5 Bulan 12 Hari', 'Sandy', 'active'],
        ['Fadhil Awalia Kusuma', 'Institut Teknologi Kalimantan', 'Teknik Elektro, Informatika dan Bisnis', '2026-07-08', '2026-09-04', 1, 27, '1 Bulan 27 Hari', 'Luthfi Saiful Shidiq', 'completed'],
        ['Rafi Baydar Athaillah', 'Institut Teknologi Kalimantan', 'Teknik Elektro, Informatika dan Bisnis', '2026-07-08', '2026-09-04', 1, 27, '1 Bulan 27 Hari', 'Luthfi Saiful Shidiq', 'completed'],
        ['Gita Pasura', 'Politeknik Negeri Balikpapan', 'Rekayasa Elektro', '2026-08-03', '2026-12-31', 4, 28, '4 Bulan 28 Hari', 'Muhammad Al Qadim', 'active'],
        ['Ulan Mangngiwan', 'Politeknik Negeri Balikpapan', 'Rekayasa Elektro', '2026-08-03', '2026-12-31', 4, 28, '4 Bulan 28 Hari', 'Muhammad Al Qadim', 'active'],
        ['Daffa Lazuari Wicaksono', 'Universitas Balikpapan', 'Keselamatan dan Kesehatan Kerja', '2026-08-18', '2026-10-18', 2, 0, '2 Bulan 0 Hari', 'Andi Safari', 'completed'],
        ['Bagus Baskhara', 'Universitas Balikpapan', 'Keselamatan dan Kesehatan Kerja', '2026-08-18', '2026-10-18', 2, 0, '2 Bulan 0 Hari', 'Andi Safari', 'completed'],
        ['Syafira Evrilia Putri', 'Universitas Balikpapan', 'Keselamatan dan Kesehatan Kerja', '2026-11-01', '2026-12-31', 1, 30, '1 Bulan 30 Hari', 'Andi Safari', 'upcoming'],
        ['Nurdianti', 'Universitas Balikpapan', 'Keselamatan dan Kesehatan Kerja', '2026-11-01', '2026-12-31', 1, 30, '1 Bulan 30 Hari', 'Andi Safari', 'upcoming'],
      ]

      for (const item of pklData) {
        await client.query(`
          INSERT INTO hero_hrga_pkl_students 
          (name, institution, major, start_date, end_date, duration_months, duration_days, duration_display, mentor_name, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, item)
      }
      console.log('✅ 20 Data Siswa PKL berhasil di-seed!')
    }

    console.log('🎉 Sukses inisialisasi tabel & data HRGA Kerjasama!')
  } catch (err) {
    console.error('❌ Terjadi kesalahan migrasi/seeding:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
