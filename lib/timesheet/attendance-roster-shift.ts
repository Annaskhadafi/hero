type ShiftOption = { value: string; label: string }

const ROSTER_SHIFT_MATCHES: Record<string, string[]> = {
  DS: ['day', 'morning', 'pagi'],
  NS: ['night', 'malam'],
  ST: ['standby', 'stand-by', 'on-call'],
}

export function resolveAttendanceShiftFromRoster(
  rosterCode: string | null | undefined,
  shiftOptions: ShiftOption[]
) {
  const code = rosterCode?.trim().toUpperCase()
  const matches = code ? ROSTER_SHIFT_MATCHES[code] : undefined
  if (!matches) return undefined

  return shiftOptions.find((option) => {
    const value = option.value.trim().toLowerCase()
    const label = option.label.trim().toLowerCase()
    return matches.some((match) => value.includes(match) || label.includes(match))
  })
}
