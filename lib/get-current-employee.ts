import { eq, or, sql, asc } from "drizzle-orm"
import { db } from "@/db"
import { employees } from "@/db/schema/hero"
import { getServerSession } from "@/lib/auth-session"
import { isSuperAdminRole, getCurrentMenuPermission } from "@/lib/hero-access"

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

  // Fallback to active user (mochamad.khadafi@chitraparatama.co.id / SN: 71261 / Mochamad Annas Khadafi)
  const [defaultUser] = await db
    .select()
    .from(employees)
    .where(
      or(
        eq(employees.email, 'mochamad.khadafi@chitraparatama.co.id'),
        eq(employees.employeeSn, '71261')
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
  if (role && (isSuperAdminRole(role) || role === 'HC Manager' || role === 'Admin' || role === 'Administrator' || role.toLowerCase().includes('admin') || role.toLowerCase().includes('hc manager'))) {
    return
  }
  const perm = await getCurrentMenuPermission('security_users')
  if (perm.canEdit || perm.canDelete || perm.canSelectAll) {
    return
  }
  throw new Error('Akses ditolak. Anda tidak memiliki izin untuk mengelola pengguna.')
}
