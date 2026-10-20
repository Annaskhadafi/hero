import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero'
import { eq, or } from 'drizzle-orm'

const INCOMING_SEEDS_2026 = [
  { no: 1, name: 'Harriz Ichwan', sn: '77167', position: 'Sales', section: 'Major Account', poh: 'Palembang', joinDate: '2026-01-05', remark: 'New Hire' },
  { no: 2, name: 'Fathurrahman Sufi', sn: '77169', position: 'HSE Officer', section: 'HSE', poh: 'Balikpapan', joinDate: '2026-01-05', remark: 'New Hire' },
  { no: 3, name: 'Ade Saharu', sn: '77170', position: 'HSE Admin', section: 'HSE', poh: 'Balikpapan', joinDate: '2026-01-05', remark: 'New Hire' },
  { no: 4, name: 'Riyo Anugrah Saputra', sn: '77171', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Jakarta', joinDate: '2026-01-05', remark: 'New Hire' },
  { no: 5, name: 'Marsel Fernando Tambunan', sn: '77205', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', joinDate: '2026-01-12', remark: 'New Hire' },
  { no: 6, name: 'Ahyar Rifani', sn: '77206', position: 'Serviceman', section: 'Service Operation Others', poh: 'Tanah Bumbu', joinDate: '2026-01-12', remark: 'New Hire' },
  { no: 7, name: 'Rizky Aji Setiawan', sn: '77207', position: 'Serviceman', section: 'Service Operation Others', poh: 'Tanah Bumbu', joinDate: '2026-01-12', remark: 'New Hire' },
  { no: 8, name: 'Rizky Rahmadani', sn: '77477', position: 'HSE Officer', section: 'HSE', poh: 'Balikpapan', joinDate: '2026-03-10', remark: 'New Hire' },
  { no: 9, name: 'Abdul Muis', sn: '77598', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Sangatta', joinDate: '2026-04-01', remark: 'New Hire' },
  { no: 10, name: 'Wahyu Farabi', sn: '77599', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Sangatta', joinDate: '2026-04-01', remark: 'New Hire' },
  { no: 11, name: 'Natanael Rizky Mauraga', sn: '77614', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-06', remark: 'New Hire' },
  { no: 12, name: 'Afriza Rizky Naufal', sn: '77649', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-09', remark: 'New Hire' },
  { no: 13, name: 'Sanudin', sn: '77659', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-13', remark: 'New Hire' },
  { no: 14, name: 'Faisal', sn: '77660', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-13', remark: 'New Hire' },
  { no: 15, name: 'Abi Fitri Nur Rahdi', sn: '77661', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-13', remark: 'New Hire' },
  { no: 16, name: 'Aditya Ryonaldi', sn: '77662', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-14', remark: 'New Hire' },
  { no: 17, name: 'Ardy Triyono', sn: '77663', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-14', remark: 'New Hire' },
  { no: 18, name: 'Iraq', sn: '77694', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-17', remark: 'New Hire' },
  { no: 19, name: 'Rahmat Andes', sn: '77695', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-17', remark: 'New Hire' },
  { no: 20, name: 'Sayid Fauzan Faerus. AQ', sn: '77696', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-20', remark: 'New Hire' },
  { no: 21, name: 'Indra Okta Praditia', sn: '77711', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-27', remark: 'New Hire' },
  { no: 22, name: 'Gilang Ramadhan', sn: '77712', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-04-27', remark: 'New Hire' },
  { no: 23, name: 'Milham Firdaus', sn: '77664', position: 'Reporting & Budget Staff', section: 'Financial Business Partner', poh: 'Jakarta', joinDate: '2026-05-04', remark: 'New Hire' },
  { no: 24, name: 'Ilham', sn: '77790', position: 'HSE Officer', section: 'HSE', poh: 'Balikpapan', joinDate: '2026-05-11', remark: 'New Hire' },
  { no: 25, name: 'Faizal Zidan', sn: '77847', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Jakarta', joinDate: '2026-05-25', remark: 'New Hire' },
  { no: 26, name: 'Irfan Fadlurrahman', sn: '77891', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 27, name: 'Tyo Hadi Pranowo', sn: '77892', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 28, name: 'Alkhab Syech', sn: '77893', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 29, name: 'Nataniel Rombe', sn: '77894', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 30, name: 'Fabian Rizky Raditya', sn: '77895', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 31, name: 'Muhammad Nuh', sn: '77896', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 32, name: 'Irfan Zulfahmi', sn: '77897', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 33, name: 'Dody', sn: '77898', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 34, name: 'Riyan Thofik Mauliansyah', sn: '77899', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 35, name: 'Muhammad Dhinno Setyawan', sn: '77900', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 36, name: 'Ridwan Fauzi', sn: '77901', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-06-04', remark: 'New Hire' },
  { no: 37, name: 'Yoga Saputra', sn: '77961', position: 'Serviceman', section: 'Service Operation Others', poh: 'Tanah Bumbu', joinDate: '2026-06-19', remark: 'New Hire' },
  { no: 38, name: 'Fitria Aisla Putriani', sn: '78008', position: 'Billing & Inventory Staff', section: 'Supply Chain Management', poh: 'Jakarta', joinDate: '2026-07-07', remark: 'New Hire' },
  { no: 39, name: 'Rangga Prima Yudha', sn: '78116', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 40, name: 'Zudha Virnanda Putra', sn: '78117', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 41, name: 'Muhammad Fikri Rosadi', sn: '78119', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 42, name: 'Tantowi Eko Wahyudi', sn: '78120', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 43, name: 'Dhira Pratama Minata', sn: '78121', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 44, name: 'Miftahul Alfi Riski', sn: '78122', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 45, name: 'Ahmad Nur Faizun', sn: '78123', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-03', remark: 'New Hire' },
  { no: 46, name: 'Muhammad Galih Nugroho', sn: '78155', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-08-10', remark: 'New Hire' },
  { no: 47, name: 'Muhammad Ridwan', sn: '78156', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-10', remark: 'New Hire' },
  { no: 48, name: 'Sochib Ahwandi', sn: '78157', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', joinDate: '2026-08-11', remark: 'New Hire' },
  { no: 49, name: 'Arlita Priska Wongkar', sn: '78158', position: 'Sales Engineer', section: 'Sales Kalimantan 2', poh: 'Balikpapan', joinDate: '2026-08-11', remark: 'New Hire' },
  { no: 50, name: 'Ahmad Rizali', sn: '78184', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Tapin', joinDate: '2026-08-12', remark: 'New Hire' },
  { no: 51, name: 'Ahmad Khafi', sn: '78185', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Tapin', joinDate: '2026-08-12', remark: 'New Hire' },
  { no: 52, name: 'Dimas Aldita Wardana', sn: '78186', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', joinDate: '2026-08-18', remark: 'New Hire' },
  { no: 53, name: 'Sholihin Noorvalvin', sn: '78187', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Tapin', joinDate: '2026-08-17', remark: 'New Hire' },
  { no: 54, name: 'Ronaldo Dapot Tua Aritonang', sn: '78289', position: 'PA Staff', section: 'Product Accessories', poh: 'Balikpapan', joinDate: '2026-09-01', remark: 'New Hire' },
  { no: 55, name: 'Supryanto', sn: '78313', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', joinDate: '2026-09-07', remark: 'New Hire' },
  { no: 56, name: 'Muh Abi', sn: '78314', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Tapin', joinDate: '2026-09-07', remark: 'New Hire' },
  { no: 57, name: 'Aditia Maulana Saputra', sn: '78395', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', joinDate: '2026-10-01', remark: 'New Hire' },
  { no: 58, name: 'Muhammad Ramadhan', sn: '78409', position: 'Serviceman', section: 'Service Operation Others', poh: 'Meulaboh', joinDate: '2026-10-05', remark: 'New Hire' },
]

const OUTGOING_SEEDS_2026 = [
  { no: 1, name: 'Mulianto', sn: '73769', position: 'Serviceman', section: 'Service Operation Others', poh: 'Sorowako', outgoingDate: '2026-01-02', remark: 'Resign' },
  { no: 2, name: 'Ananda Ikhwan Hidayatullah', sn: '72784', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Sangatta', outgoingDate: '2026-01-02', remark: 'Contract Complete' },
  { no: 3, name: 'Hery Nyoto Wibakso', sn: '76792', position: 'Serviceman', section: 'Service Operation Others', poh: 'Tanah Bumbu', outgoingDate: '2026-01-22', remark: 'Resign' },
  { no: 4, name: 'Herlambang Wijaya Kusuma', sn: '75382', position: 'HSE', section: 'HSE', poh: 'Balikpapan', outgoingDate: '2026-01-25', remark: 'Resign' },
  { no: 5, name: 'Muhammad Harun', sn: '60852', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', outgoingDate: '2026-02-03', remark: 'Resign' },
  { no: 6, name: 'Muhammad Afif Yulian', sn: '72289', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', outgoingDate: '2026-02-05', remark: 'Contract Complete' },
  { no: 7, name: 'Roy Handika', sn: '74846', position: 'Technical Engineer', section: 'Technical', poh: 'Balikpapan', outgoingDate: '2026-02-24', remark: 'Resign' },
  { no: 8, name: 'Syarifuddin', sn: '7792', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', outgoingDate: '2026-02-28', remark: 'Pension' },
  { no: 9, name: 'Fadjar Ismail', sn: '75897', position: 'PA Coordinator', section: 'Product Accessories', poh: 'Jakarta', outgoingDate: '2026-02-28', remark: 'Contract Complete' },
  { no: 10, name: 'Deny Ashari', sn: '51395', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-03-04', remark: 'Resign' },
  { no: 11, name: 'Muhammad Rahman', sn: '72393', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-03-05', remark: 'Contract Complete' },
  { no: 12, name: 'Ahmad Ikbal', sn: '61748', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-03-21', remark: 'Contract Complete' },
  { no: 13, name: 'M Hasnan Gani', sn: '76723', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Rantau', outgoingDate: '2026-04-01', remark: 'Resign' },
  { no: 14, name: 'Randy Rovaldi', sn: '61276', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-04-21', remark: 'Resign' },
  { no: 15, name: 'Muhamad Diva Luter Randa', sn: '71872', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', outgoingDate: '2026-05-06', remark: 'Contract Complete' },
  { no: 16, name: 'Dimas Aldita Wardana', sn: '74543', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-02', remark: 'Contract Complete' },
  { no: 17, name: 'Indra Putra Harsono', sn: '74545', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-02', remark: 'Contract Complete' },
  { no: 18, name: 'Julianto', sn: '74551', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-02', remark: 'Contract Complete' },
  { no: 19, name: 'Zaiddan Maiadzanie', sn: '72706', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-05', remark: 'Contract Complete' },
  { no: 20, name: 'Muhammad Akbar', sn: '72710', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-11', remark: 'Contract Complete' },
  { no: 21, name: 'Nurul Ahmad Adhan', sn: '72711', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-06-11', remark: 'Contract Complete' },
  { no: 22, name: 'Maulani', sn: '76433', position: 'Warehouse Coordinator', section: 'Supply Chain Management', poh: 'Jakarta', outgoingDate: '2026-06-30', remark: 'Pension' },
  { no: 23, name: 'Tino Yoga Pratama Purwanto', sn: '75135', position: 'Warehouse Teams', section: 'Supply Chain Management', poh: 'Balikpapan', outgoingDate: '2026-07-02', remark: 'Resign' },
  { no: 24, name: 'Robbyannoor Raynald Aryatma', sn: '51103', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-07-11', remark: 'Resign' },
  { no: 25, name: 'Andri Febrianto', sn: '73198', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-07-15', remark: 'Resign' },
  { no: 26, name: 'Yogi Dwi Ananto', sn: '72082', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', outgoingDate: '2026-09-01', remark: 'Resign' },
  { no: 27, name: 'Muhammad Randi Saputra', sn: '73200', position: 'Serviceman', section: 'Service Operation Others', poh: 'Balikpapan', outgoingDate: '2026-09-03', remark: 'Resign' },
  { no: 28, name: 'Fauzy Muhammad Sahputra', sn: '72287', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-09-05', remark: 'Contract Complete' },
  { no: 29, name: 'Wahyu Farabi', sn: '77599', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Sangatta', outgoingDate: '2026-09-05', remark: 'Resign' },
  { no: 30, name: 'Faturrahman Said', sn: '51269', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Sangatta', outgoingDate: '2026-09-15', remark: 'Contract Complete' },
  { no: 31, name: 'Alip Suwandi', sn: '51323', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', outgoingDate: '2026-09-18', remark: 'Contract Complete' },
  { no: 32, name: 'Muh Abi', sn: '78314', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Tapin', outgoingDate: '2026-09-21', remark: 'Resign' },
  { no: 33, name: 'Muchamat Nurkolis Majid', sn: '72789', position: 'Technical Engineer', section: 'Technical Operation', poh: 'Balikpapan', outgoingDate: '2026-09-27', remark: 'Resign' },
  { no: 34, name: 'Febri Ferdian', sn: '76250', position: 'Repairman', section: 'Repair / Retread Operation', poh: 'Balikpapan', outgoingDate: '2026-09-30', remark: 'Resign' },
  { no: 35, name: 'Chrystofel Lasi', sn: '71727', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-10-02', remark: 'Contract Complete' },
  { no: 36, name: 'Afriza Rizky Naufal', sn: '77649', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-10-08', remark: 'Contract Complete' },
  { no: 37, name: 'Ismar Shahri', sn: '73762', position: 'Serviceman', section: 'Service Operation Others', poh: 'Sorowako', outgoingDate: '2026-10-09', remark: 'Resign' },
  { no: 38, name: 'Muhammad Alfat Ramadhan', sn: '61348', position: 'Serviceman', section: 'Service Operation MVC', poh: 'Balikpapan', outgoingDate: '2026-10-22', remark: 'Resign' },
]

async function main() {
  console.log('🚀 Running Labour Turn Over Schema Migration and Seed...')

  // 1. Create tables if not exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hc_turnover_settings (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL UNIQUE,
      initial_headcount INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  console.log('✅ hero_hc_turnover_settings table ready.')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hc_turnover_movements (
      id SERIAL PRIMARY KEY,
      movement_type TEXT NOT NULL,
      employee_id INTEGER,
      employee_sn TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      section TEXT NOT NULL DEFAULT '',
      point_of_hire TEXT NOT NULL DEFAULT '',
      movement_date DATE NOT NULL,
      remark TEXT NOT NULL,
      recruitment_id INTEGER,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  console.log('✅ hero_hc_turnover_movements table ready.')

  // 2. Set initial headcount for 2026
  await db.execute(sql`
    INSERT INTO hero_hc_turnover_settings (year, initial_headcount, notes, updated_at)
    VALUES (2026, 471, 'Initial Headcount JAN 2026 per verified spreadsheet', NOW())
    ON CONFLICT (year) DO UPDATE
    SET initial_headcount = 471, updated_at = NOW();
  `)
  console.log('✅ 2026 initial headcount set to 471.')

  // 3. Clear and seed movements for 2026
  await db.execute(sql`DELETE FROM hero_hc_turnover_movements WHERE EXTRACT(YEAR FROM movement_date) = 2026;`)

  for (const item of INCOMING_SEEDS_2026) {
    await db.execute(sql`
      INSERT INTO hero_hc_turnover_movements (
        movement_type, employee_sn, name, position, section, point_of_hire, movement_date, remark
      ) VALUES (
        'incoming', ${item.sn}, ${item.name}, ${item.position}, ${item.section}, ${item.poh}, ${item.joinDate}, ${item.remark}
      );
    `)
  }
  console.log(`✅ Seeded ${INCOMING_SEEDS_2026.length} incoming employees for 2026.`)

  for (const item of OUTGOING_SEEDS_2026) {
    await db.execute(sql`
      INSERT INTO hero_hc_turnover_movements (
        movement_type, employee_sn, name, position, section, point_of_hire, movement_date, remark
      ) VALUES (
        'outgoing', ${item.sn}, ${item.name}, ${item.position}, ${item.section}, ${item.poh}, ${item.outgoingDate}, ${item.remark}
      );
    `)
  }
  console.log(`✅ Seeded ${OUTGOING_SEEDS_2026.length} outgoing employees for 2026.`)

  // 4. Register Navbar Menu Item for Labour Turn Over
  const existingMenu = await db
    .select()
    .from(navbarMenuItems)
    .where(or(eq(navbarMenuItems.resource, 'hc_labour_turnover'), eq(navbarMenuItems.url, '/dashboard/hc/turnover')))
    .limit(1)

  let menuId: number
  if (existingMenu.length > 0) {
    menuId = existingMenu[0].id
    await db
      .update(navbarMenuItems)
      .set({
        section: 'HRGA',
        groupLabel: 'Data & Akses Karyawan',
        title: 'Labour Turn Over',
        url: '/dashboard/hc/turnover',
        iconName: 'trending-up',
        sortOrder: 6,
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, menuId))
    console.log(`✅ Updated existing navbar item for Labour Turn Over (id: ${menuId})`)
  } else {
    const [inserted] = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Data & Akses Karyawan',
        title: 'Labour Turn Over',
        url: '/dashboard/hc/turnover',
        iconName: 'trending-up',
        resource: 'hc_labour_turnover',
        sortOrder: 6,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id })
    menuId = inserted.id
    console.log(`✅ Created navbar item for Labour Turn Over (id: ${menuId})`)
  }

  // Grant permissions to all roles that have access to hc_safety / security_users
  const roles = await db.select().from(securityRoles)
  for (const role of roles) {
    const [existingPerm] = await db
      .select()
      .from(roleMenuPermissions)
      .where(sql`role_id = ${role.id} AND menu_item_id = ${menuId}`)
      .limit(1)

    if (!existingPerm) {
      await db.insert(roleMenuPermissions).values({
        roleId: role.id,
        menuItemId: menuId,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      })
    }
  }
  console.log('✅ Role permissions mapped for Labour Turn Over.')

  console.log('\n🎉 Labour Turn Over Database Setup & Seed Finished Successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration error:', err)
  process.exit(1)
})
