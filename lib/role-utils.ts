/**
 * Lightweight, client-safe role utilities
 * Contains zero server-only dependencies (no next/headers, no database drivers)
 */

export function isSuperAdminRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false
  const trimmed = roleName.trim()
  const lower = trimmed.toLowerCase()
  return (
    trimmed === 'Super Admin' ||
    lower === 'super admin' ||
    lower === 'superadmin' ||
    lower === 'super_admin' ||
    lower === 'administrator' ||
    lower === 'admin'
  )
}

export function isSuperAdminUser(
  employee?: {
    id?: number
    employeeSn?: string | null
    email?: string | null
    accessRole?: string | null
    name?: string | null
  } | null,
  sessionUser?: { email?: string | null; role?: string | null } | null
): boolean {
  if (!employee && !sessionUser) return false

  // 1. Role-based check
  const role = employee?.accessRole || (sessionUser as any)?.role
  if (role && isSuperAdminRole(role)) return true

  // 2. Specific employee identification for Gilang & Annas
  const empId = employee?.id
  const empSn = employee?.employeeSn
  const email = (employee?.email || sessionUser?.email || '').toLowerCase()
  const name = (employee?.name || '').toLowerCase()

  // Mochamad Annas Khadafi (ID: 5, SN: 71261)
  const isAnnas =
    empId === 5 ||
    empSn === '71261' ||
    email.includes('khadafi') ||
    email === 'mochamad.khadafi@chitraparatama.co.id' ||
    name.includes('annas khadafi')

  // Gilang Suryo Wirawan (ID: 1255, SN: 74131)
  const isGilang =
    empId === 1255 ||
    empSn === '74131' ||
    email.includes('gilang.suryo') ||
    email === 'gilang.suryo@chitraparatama.co.id' ||
    name.includes('gilang suryo')

  return Boolean(isAnnas || isGilang)
}
