import { boolean, date, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { employees } from './hero'

// ─── HRGA Kerjasama Rumah Sakit & Faskes ───
export const hrgaKerjasamaRs = pgTable('hero_hrga_kerjasama_rs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  address: text('address').notNull().default(''),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: text('status').notNull().default('active'), // 'active', 'expiring_soon', 'expired', 'no_partnership'
  contactPerson: text('contact_person').notNull().default(''),
  contactPhone: text('contact_phone').notNull().default(''),
  contractDocumentUrl: text('contract_document_url'),
  contractDocumentName: text('contract_document_name'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HRGA Data Siswa & Mahasiswa PKL / Magang ───
export const hrgaPklStudents = pgTable('hero_hrga_pkl_students', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  institution: text('institution').notNull(), // Asal Sekolah / Kampus
  major: text('major').notNull(), // Jurusan
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  durationMonths: integer('duration_months').notNull().default(0),
  durationDays: integer('duration_days').notNull().default(0),
  durationDisplay: text('duration_display').notNull().default(''),
  mentorName: text('mentor_name').notNull(), // Pembimbing Industri
  mentorEmployeeId: integer('mentor_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'), // 'active', 'completed', 'upcoming'
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
