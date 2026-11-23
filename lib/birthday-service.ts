import { db } from '@/db'
import { employees, sites } from '@/db/schema/hero'
import { user as authUser } from '@/db/schema/auth'
import { eq, and, ne, sql, or } from 'drizzle-orm'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { isBirthdayCelebrationTimeWindow } from '@/lib/birthday-time'

export interface BirthdayPerson {
  id: number
  name: string
  email: string
  jobTitle?: string | null
  department?: string | null
  siteName?: string | null
  workLocation?: string | null
  avatar?: string | null
  birthDate?: string | null
}

export interface TodayBirthdayResponse {
  isSelfBirthday: boolean
  self?: BirthdayPerson | null
  colleagues: BirthdayPerson[]
  currentDateStr: string // "YYYY-MM-DD"
  siteName?: string | null
}

export async function getTodayBirthdayData(
  userEmail: string,
  authUserId?: string | null,
  previewMode?: 'self' | 'colleagues' | null
): Promise<TodayBirthdayResponse | null> {
  try {
    const normalizedEmail = (userEmail || '').trim().toLowerCase()
    if (!normalizedEmail) return null

    // Cari data karyawan aktif saat ini
    const currentEmployeeRows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        siteId: employees.siteId,
        workLocation: employees.workLocation,
        department: employees.department,
        jobTitle: employees.jobTitle,
        birthDate: employees.birthDate,
        authUserId: employees.authUserId,
        userImage: authUser.image,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(authUser, eq(employees.authUserId, authUser.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(
        or(
          sql`LOWER(${employees.email}) = ${normalizedEmail}`,
          authUserId ? eq(employees.authUserId, authUserId) : sql`1=0`
        )
      )
      .limit(1)

    const currentEmployee = currentEmployeeRows[0]
    if (!currentEmployee) return null

    // Dapatkan tanggal dan jam hari ini dalam timezone Indonesia (WITA / Asia/Makassar)
    const now = new Date()

    // Batasan Waktu: Popup ulang tahun HANYA boleh muncul pada jam 08.00 - 10.00 pagi
    const isWithinTimeWindow = isBirthdayCelebrationTimeWindow(now, 'Asia/Makassar')
    if (!isWithinTimeWindow && !previewMode) {
      return null
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const formattedDate = formatter.format(now) // e.g. "2026-11-23"
    const parts = formattedDate.split('-')
    const targetMMDD = `${parts[1]}-${parts[2]}`

    // Mode Preview / Testing
    if (previewMode === 'self') {
      return {
        isSelfBirthday: true,
        self: {
          id: currentEmployee.id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          jobTitle: currentEmployee.jobTitle || 'Staff Operations',
          department: currentEmployee.department || 'Operations',
          siteName: currentEmployee.siteName || 'Head Office',
          workLocation: currentEmployee.workLocation || 'Balikpapan',
          avatar: currentEmployee.userImage ? resolveUploadUrl(currentEmployee.userImage) : null,
          birthDate: formattedDate,
        },
        colleagues: [],
        currentDateStr: formattedDate,
        siteName: currentEmployee.siteName || currentEmployee.workLocation || 'Head Office',
      }
    }

    if (previewMode === 'colleagues') {
      return {
        isSelfBirthday: false,
        self: null,
        colleagues: [
          {
            id: 99991,
            name: 'Ahmad Fauzi',
            email: 'ahmad.fauzi@chitraparatama.com',
            jobTitle: 'Senior Technician',
            department: 'Technical & Maintenance',
            siteName: currentEmployee.siteName || 'Site Balikpapan',
            workLocation: currentEmployee.workLocation || 'Balikpapan',
            avatar: null,
            birthDate: formattedDate,
          },
          {
            id: 99992,
            name: 'Siti Rahmawati',
            email: 'siti.rahmawati@chitraparatama.com',
            jobTitle: 'Logistics Officer',
            department: 'Supply Chain & Warehouse',
            siteName: currentEmployee.siteName || 'Site Balikpapan',
            workLocation: currentEmployee.workLocation || 'Balikpapan',
            avatar: null,
            birthDate: formattedDate,
          },
        ],
        currentDateStr: formattedDate,
        siteName: currentEmployee.siteName || currentEmployee.workLocation || 'Site Balikpapan',
      }
    }

    // Cek apakah user yang sedang login berulang tahun hari ini
    let isSelfBirthday = false
    let selfBirthdayData: BirthdayPerson | null = null

    if (currentEmployee.birthDate) {
      const empBirthMMDD = String(currentEmployee.birthDate).slice(5, 10)
      if (empBirthMMDD === targetMMDD) {
        isSelfBirthday = true
        selfBirthdayData = {
          id: currentEmployee.id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          jobTitle: currentEmployee.jobTitle,
          department: currentEmployee.department,
          siteName: currentEmployee.siteName,
          workLocation: currentEmployee.workLocation,
          avatar: currentEmployee.userImage ? resolveUploadUrl(currentEmployee.userImage) : null,
          birthDate: currentEmployee.birthDate,
        }
      }
    }

    // Cari rekan kerja di site / work location yang sama yang berulang tahun hari ini
    const locationCondition = currentEmployee.siteId
      ? eq(employees.siteId, currentEmployee.siteId)
      : currentEmployee.workLocation
        ? eq(employees.workLocation, currentEmployee.workLocation)
        : sql`1=1`

    const colleaguesRows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        department: employees.department,
        siteId: employees.siteId,
        workLocation: employees.workLocation,
        birthDate: employees.birthDate,
        userImage: authUser.image,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(authUser, eq(employees.authUserId, authUser.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(
        and(
          ne(employees.id, currentEmployee.id),
          eq(employees.isActive, true),
          sql`to_char(${employees.birthDate}, 'MM-DD') = ${targetMMDD}`,
          locationCondition
        )
      )
      .limit(10)

    const colleagues: BirthdayPerson[] = colleaguesRows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      jobTitle: c.jobTitle,
      department: c.department,
      siteName: c.siteName,
      workLocation: c.workLocation,
      avatar: c.userImage ? resolveUploadUrl(c.userImage) : null,
      birthDate: c.birthDate,
    }))

    // Jika bukan ultah user sendiri dan tidak ada rekan yang ultah, kembalikan null
    if (!isSelfBirthday && colleagues.length === 0) {
      return null
    }

    return {
      isSelfBirthday,
      self: selfBirthdayData,
      colleagues,
      currentDateStr: formattedDate,
      siteName: currentEmployee.siteName || currentEmployee.workLocation || 'PT Chitra Paratama',
    }
  } catch (error) {
    console.error('[getTodayBirthdayData] Error checking birthdays:', error)
    return null
  }
}
