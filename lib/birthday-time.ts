/**
 * Helper untuk memvalidasi rentang waktu kemunculan perayaan ulang tahun:
 * Hanya boleh muncul di jam pagi 08.00 - 10.00 (WITA / Asia/Makassar).
 */
export function isBirthdayCelebrationTimeWindow(
  now: Date = new Date(),
  timeZone: string = 'Asia/Makassar'
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
    const totalMinutes = hour * 60 + minute

    // 08:00 (480 menit) s.d. 10:00 (600 menit)
    return totalMinutes >= 8 * 60 && totalMinutes <= 10 * 60
  } catch {
    // Fallback ke local time jika format timeZone bermasalah
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const total = hours * 60 + minutes
    return total >= 8 * 60 && total <= 10 * 60
  }
}

export default isBirthdayCelebrationTimeWindow;
