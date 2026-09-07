import { eq, or } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { isSuperAdminRole, getCurrentMenuPermission } from '@/lib/hero-access'

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

  return null
}

export async function getCurrentEmployeeAccessRole(): Promise<string> {
  const emp = await getCurrentEmployee()
  return emp?.accessRole ?? ''
}

export async function requireAdminOrHcManagerRole(resource = 'security_users'): Promise<void> {
  const role = await getCurrentEmployeeAccessRole()
  if (role && isSuperAdminRole(role)) {
    return
  }
  const perm = await getCurrentMenuPermission(resource)
  if (perm.canEdit) {
    return
  }
  throw new Error('Akses ditolak. Anda tidak memiliki izin untuk mengelola pengguna.')
}
