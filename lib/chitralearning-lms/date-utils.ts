/**
 * ChitraLearning LMS Date & Cooldown Utilities
 * Client-safe helper functions (pure, zero dependencies on DB or next/headers)
 */

export const MAX_POSTTEST_ATTEMPTS = 3;

export function getNextMonthFirstDay(fromDate: Date = new Date()): Date {
  const d = new Date(fromDate);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatIndonesianDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = INDONESIAN_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function isEnrollmentInCooldown(
  enrollment: { status?: string | null; cooldownUntil?: Date | string | null } | null | undefined
): boolean {
  if (!enrollment || enrollment.status !== 'failed' || !enrollment.cooldownUntil) {
    return false;
  }
  const cooldownTime = new Date(enrollment.cooldownUntil).getTime();
  if (isNaN(cooldownTime)) return false;
  return Date.now() < cooldownTime;
}
