import 'server-only'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'

export async function getPublicEmployeeEcard(identifier: string) {
  const legacy = /^[A-Za-z0-9_-]{64}$/.test(identifier)
  if (!legacy && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier)) return null
  if (!legacy && identifier.length > 24) return null
  const [employee] = await db.select({
    name: employees.name,
    jobTitle: employees.jobTitle,
    role: employees.role,
    email: employees.email,
    phoneNumber: employees.phoneNumber,
    alias: employees.businessCardPublicAlias,
  }).from(employees).where(and(
    legacy ? eq(employees.businessCardPublicToken, identifier) : eq(employees.businessCardPublicAlias, identifier),
    eq(employees.businessCardPublicEnabled, true),
    eq(employees.isActive, true),
    ne(employees.employmentStatus, 'inactive'),
  )).limit(1)
  return employee ? { ...employee, publicIdentifier: employee.alias || identifier } : null
}
