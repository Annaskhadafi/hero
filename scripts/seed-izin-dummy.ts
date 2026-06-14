/**
 * Seed dummy attendance permission requests for dashboard visualization
 * Based on existing employees in the database
 *
 * Run: npx tsx scripts/seed-izin-dummy.ts
 */

import { db } from "@/db";
import { employees, sites } from "@/db/schema/hero";
import { attendancePermissionRequests } from "@/db/schema/timesheet";
import { eq, inArray, asc } from "drizzle-orm";

const SICK_CATEGORIES = [
  "Demam",
  "Flu & Batuk",
  "Sakit Kepala",
  "Sakit Perut",
  "Diare",
  "Masuk Angina",
  "Pilek",
  "Vertigo",
  "Sakit Gigi",
  "Alergi",
  "Kelelahan",
  "Sakit Tenggorokan",
]

const LATE_REASONS = [
  "Macet di jalan",
  "Kendaraan mogok",
  "Ban bocor",
  "Hujan deras",
  "Urusan keluarga",
  "Anak sakit",
  "Alarm tidak bunyi",
  "Lupa bawa dokumen",
  "Posisi rumah jauh",
  "Kemacetan fatal",
]

const STATUSES = ["pending", "approved", "approved", "approved", "approved"]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(year: number, month: number): string {
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function randomTime(): string {
  const h = Math.floor(Math.random() * 3) + 7
  const m = Math.floor(Math.random() * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

async function seed() {
  console.log("Seeding dummy izin data...\n")

  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      siteId: employees.siteId,
    })
    .from(employees)
    .orderBy(asc(employees.id))
    .limit(50)

  if (allEmployees.length === 0) {
    console.log("No employees found. Seed employees first.")
    return
  }

  const employeeSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)

  const siteMap = new Map(employeeSites.map((s) => [s.id, s.name]))

  console.log(`Found ${allEmployees.length} employees, ${employeeSites.length} sites`)

  const rows: (typeof attendancePermissionRequests.$inferInsert)[] = []

  const months = [
    { year: 2025, month: 11 },
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
  ]

  const usedKeys = new Set<string>()

  for (const emp of allEmployees) {
    const sickCount = Math.floor(Math.random() * 4) + 1
    const lateCount = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < sickCount; i++) {
      const { year, month } = randomFrom(months)
      const date = randomDate(year, month)
      const key = `${emp.id}:${date}:sick`
      if (usedKeys.has(key)) continue
      usedKeys.add(key)

      rows.push({
        siteId: emp.siteId || employeeSites[0]?.id || 1,
        employeeId: emp.id,
        permissionType: "sick",
        startDate: date,
        endDate: date,
        sickCategory: randomFrom(SICK_CATEGORIES),
        lateReason: "",
        returnTime: randomTime(),
        reason: `Sakit ${randomFrom(SICK_CATEGORIES).toLowerCase()}, istirahat di rumah.`,
        attachmentUrl: "",
        status: randomFrom(STATUSES),
        createdAt: new Date(`${date}T08:00:00`),
      })
    }

    for (let i = 0; i < lateCount; i++) {
      const { year, month } = randomFrom(months)
      const date = randomDate(year, month)
      const key = `${emp.id}:${date}:late`
      if (usedKeys.has(key)) continue
      usedKeys.add(key)

      rows.push({
        siteId: emp.siteId || employeeSites[0]?.id || 1,
        employeeId: emp.id,
        permissionType: "late",
        startDate: date,
        endDate: date,
        sickCategory: "",
        lateReason: randomFrom(LATE_REASONS),
        returnTime: randomTime(),
        reason: `Terlambat karena ${randomFrom(LATE_REASONS).toLowerCase()}.`,
        attachmentUrl: "",
        status: randomFrom(STATUSES),
        createdAt: new Date(`${date}T08:00:00`),
      })
    }
  }

  console.log(`Generated ${rows.length} dummy records`)

  const batchSize = 50
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await db.insert(attendancePermissionRequests).values(batch)
    console.log(`  Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length}`)
  }

  console.log(`\nDone! ${rows.length} dummy izin records seeded.`)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
