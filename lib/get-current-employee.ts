import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { employees } from "@/db/schema/hero"
import { auth } from "@/lib/auth"

export async function getCurrentEmployee() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.authUserId, session.user.id))
    .limit(1)
  return employee || null
}

export async function getCurrentEmployeeAccessRole(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) return null
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)
  return employee?.accessRole ?? null
}

export async function requireAdminOrHcManagerRole(): Promise<void> {
  const role = await getCurrentEmployeeAccessRole()
  if (!role || (role !== 'Super Admin' && role !== 'HC Manager')) {
    throw new Error('Akses ditolak. Hanya Super Admin dan HC Manager yang dapat mengelola pengguna.')
  }
}
