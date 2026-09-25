export const BLOCKED_MINE_PERMIT_EMAILS = [
  'abdul.rajab@chitraparatama.co.id',
] as const

export function isBlockedMinePermitEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return BLOCKED_MINE_PERMIT_EMAILS.some((blocked) => blocked.toLowerCase() === normalized)
}
