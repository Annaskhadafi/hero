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
