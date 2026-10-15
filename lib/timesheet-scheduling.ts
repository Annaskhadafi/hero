export type ScheduleCode = "IN" | "DS" | "NS" | "OFF" | "FB" | "Libur" | "Sakit" | "Emergency" | "ST";
export type OvertimeDayType = "work" | "off";
export type RosterType = "5:2" | "6:1" | "13:1" | string;

export type HolidayLike = {
  date: string;
  day?: number;
  name?: string;
  localName?: string;
};

export function daysInMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function dateKey(period: string, day: number) {
  return `${period}-${String(day).padStart(2, "0")}`;
}

export function isWeekend(period: string, day: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

export function isHoliday(period: string, day: number, holidays: HolidayLike[] = []) {
  const key = dateKey(period, day);
  return holidays.some((holiday) => holiday.date === key || holiday.day === day);
}

export function isThirteenOneOffDay(period: string, day: number, cycleStart = '2026-01-01') {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const anchor = new Date(`${cycleStart}T00:00:00Z`).getTime();
  const safeAnchor = Number.isFinite(anchor) ? anchor : Date.UTC(2026, 0, 1);
  const elapsedDays = Math.floor((date.getTime() - safeAnchor) / (24 * 60 * 60 * 1000));
  if (elapsedDays < 0) return false;
  const cycleDay = ((elapsedDays % 14) + 14) % 14;
  return cycleDay === 13;
}

export function hoursFromCode(code: ScheduleCode) {
  return code === "IN" || code === "DS" || code === "NS" || code === "FB" || code === "ST" ? 5 : 0;
}

export function classifyOvertimeDay(schedule: ScheduleCode[], period: string, dayIndex: number, rosterType: RosterType, holidays: HolidayLike[] = []): OvertimeDayType {
  const day = dayIndex + 1;
  const code = schedule[dayIndex];
  if (code === "OFF" || code === "Libur") return "off";
  if (isHoliday(period, day, holidays)) return "off";
  if (rosterType === "office" && isWeekend(period, day)) return "off";

  if (rosterType === "6:1") {
    let workingDaysSinceOff = 0;
    for (let index = 0; index <= dayIndex; index += 1) {
      const currentCode = schedule[index];
      if (currentCode === "OFF" || currentCode === "Libur") {
        workingDaysSinceOff = 0;
        continue;
      }
      if (hoursFromCode(currentCode) > 0) workingDaysSinceOff += 1;
    }
    if (workingDaysSinceOff > 0 && workingDaysSinceOff % 6 === 0) return "off";
  }

  return "work";
}

export function applyHolidayPolicy(code: ScheduleCode, context: { scheduleType: "office" | "shift" | string; rosterType: RosterType; isHoliday: boolean }): ScheduleCode {
  if (!context.isHoliday) return code;
  if (context.scheduleType === "office" || context.rosterType === "5:2") return "Libur";
  return code;
}

export function normalizeRosterSection(value?: string | null) {
  const v = (value || '').trim().toLowerCase();
  if (v.includes('service operation')) return 'Service Operation';
  if (v.includes('repair retread') || v.includes('repair / retread') || v.includes('repair/retread') || v.includes('repair')) return 'Repair Retread';
  return 'Crew Office';
}

export function canSwapOff(codeA?: ScheduleCode, codeB?: ScheduleCode) {
  return codeA === "OFF" || codeB === "OFF";
}

export function swapScheduleCodes(codeA: ScheduleCode, codeB: ScheduleCode): [ScheduleCode, ScheduleCode] | null {
  if (!canSwapOff(codeA, codeB)) return null;
  return [codeB, codeA];
}

export type SiteRosterType = '5:2' | '6:1' | '13:1' | 'vale' | string;

export type OvertimeVariable = {
  roster: SiteRosterType;
  dayType: 'work' | 'off';
  totalHours: number;
  overtimeHours: number;
};

/**
 * Konversi jam lembur ke nilai hitungan lembur payroll berdasarkan setup konfigurasi.
 * Jika terdapat exact match di overtimeVariables, gunakan nilai tersebut.
 * Jika desimal atau melebihi batas tabel, gunakan interpolasi / rumus standar ketenagakerjaan:
 * - Hari Kerja: 1.5x untuk jam ke-1, 2x untuk jam berikutnya.
 * - Hari Libur: 2x untuk 1-8 jam, 3x untuk jam ke-9, 4x untuk jam ke-10 dst.
 */
export function calculatePayrollOvertimeValue(
  roster: string,
  dayType: 'work' | 'off',
  otHours: number,
  overtimeVariables: OvertimeVariable[] = []
): number {
  if (otHours <= 0) return 0;

  // 1. Exact match di overtimeVariables
  const match = overtimeVariables.find(
    (item) => item.roster === roster && item.dayType === dayType && item.totalHours === otHours
  );
  if (match) return match.overtimeHours;

  // 2. Jika pecahan (misal 2.5), coba cek apakah ada integer di bawah dan di atasnya untuk interpolasi linier
  const lowerInt = Math.floor(otHours);
  const upperInt = Math.ceil(otHours);
  if (lowerInt !== upperInt) {
    const lowerMatch = overtimeVariables.find(
      (item) => item.roster === roster && item.dayType === dayType && item.totalHours === lowerInt
    );
    const upperMatch = overtimeVariables.find(
      (item) => item.roster === roster && item.dayType === dayType && item.totalHours === upperInt
    );
    if (lowerMatch && upperMatch) {
      const fraction = otHours - lowerInt;
      const interpolated = lowerMatch.overtimeHours + fraction * (upperMatch.overtimeHours - lowerMatch.overtimeHours);
      return Math.round(interpolated * 100) / 100;
    }
  }

  // 3. Fallback rumus standar ketenagakerjaan (PP 35/2021)
  if (dayType === 'work') {
    // 1.5x jam pertama + 2x jam berikutnya
    if (otHours <= 1) return otHours * 1.5;
    return 1.5 + (otHours - 1) * 2;
  } else {
    // Hari libur / OFF
    if (otHours <= 8) return otHours * 2;
    if (otHours <= 9) return 16 + (otHours - 8) * 3;
    return 19 + (otHours - 9) * 4;
  }
}

/**
 * Menentukan apakah kehadiran di hari tertentu masuk kategori Hari Kerja (HK) atau Hari Libur (HL).
 * Hari Libur (HL) jika:
 * 1. Tanggal merah resmi (isHoliday)
 * 2. Jadwal OFF / Libur
 * 3. Hari ke-7 kerja pada roster 13:1
 * 4. Atau hari off sesuai perputaran roster 6:1 / weekend office
 */
export function classifyPayrollAttendanceDay(
  schedule: ScheduleCode[] | string[],
  period: string,
  dayIndex: number,
  rosterType: string,
  holidays: HolidayLike[] = []
): 'work' | 'off' {
  const day = dayIndex + 1;
  const code = schedule[dayIndex];
  if (code === 'OFF' || code === 'Libur') return 'off';
  if (isHoliday(period, day, holidays)) return 'off';
  if (rosterType === 'office' && isWeekend(period, day)) return 'off';

  if (rosterType === '13:1') {
    let workingDays = 0;
    for (let i = 0; i <= dayIndex; i++) {
      const c = schedule[i];
      if (c === 'OFF' || c === 'Libur') {
        workingDays = 0;
      } else if (hoursFromCode(c as ScheduleCode) > 0 || c === 'IN' || c === 'DS' || c === 'NS') {
        workingDays++;
      }
    }
    if (workingDays > 0 && workingDays % 7 === 0) return 'off';
  }

  if (rosterType === '6:1') {
    let workingDaysSinceOff = 0;
    for (let index = 0; index <= dayIndex; index += 1) {
      const currentCode = schedule[index];
      if (currentCode === 'OFF' || currentCode === 'Libur') {
        workingDaysSinceOff = 0;
        continue;
      }
      if (hoursFromCode(currentCode as ScheduleCode) > 0 || currentCode === 'IN' || currentCode === 'DS' || currentCode === 'NS') {
        workingDaysSinceOff += 1;
      }
    }
    if (workingDaysSinceOff > 0 && workingDaysSinceOff % 6 === 0) return 'off';
  }

  return 'work';
}
