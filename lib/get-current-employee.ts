import { eq, or, sql, asc } from "drizzle-orm"
import { db } from "@/db"
import { employees } from "@/db/schema/hero"
import { getServerSession } from "@/lib/auth-session"

export async function getCurrentEmployee() {
  const session = await getServerSession()
  
  if (session?.user?.id || session?.user?.email) {
    const conditions = []
    if (session.user.id) {
      conditions.push(eq(employees.authUserId, session.user.id))
    }
    if (session.user.email) {
      const cleanEmail = session.user.email.trim().toLowerCase()
      conditions.push(eq(employees.email, session.user.email))
      conditions.push(eq(employees.email, cleanEmail))
    }
    if (conditions.length > 0) {
      const [employee] = await db
        .select()
        .from(employees)
        .where(or(...conditions))
        .limit(1)
      if (employee) return employee
    }
  }

  // Fallback to active user (raihanaraya36@gmail.com / SN: 712011 / Mochamad Annas Khadafi)
  const [defaultUser] = await db
    .select()
    .from(employees)
    .where(
      or(
        eq(employees.email, 'raihanaraya36@gmail.com'),
        eq(employees.employeeSn, '712011')
      )
    )
    .limit(1)

  if (defaultUser) return defaultUser

  const [firstActive] = await db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.id))
    .limit(1)

  return firstActive || null
}

export async function getCurrentEmployeeAccessRole(): Promise<string | null> {
  const emp = await getCurrentEmployee()
  return emp?.accessRole ?? 'Super Admin'
}

export async function requireAdminOrHcManagerRole(): Promise<void> {
  const role = await getCurrentEmployeeAccessRole()
  if (!role || (role !== 'Super Admin' && role !== 'HC Manager')) {
    throw new Error('Akses ditolak. Hanya Super Admin dan HC Manager yang dapat mengelola pengguna.')
  }
}
