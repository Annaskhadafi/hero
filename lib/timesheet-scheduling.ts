export type ScheduleCode = "IN" | "DS" | "NS" | "OFF" | "FB" | "Libur" | "Sakit" | "Emergency";
export type OvertimeDayType = "work" | "off";
export type RosterType = "5:2" | "6:1" | string;

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

export function hoursFromCode(code: ScheduleCode) {
  return code === "IN" || code === "DS" || code === "NS" || code === "FB" ? 5 : 0;
}

export function classifyOvertimeDay(schedule: ScheduleCode[], period: string, dayIndex: number, rosterType: RosterType, holidays: HolidayLike[] = []): OvertimeDayType {
  const day = dayIndex + 1;
  const code = schedule[dayIndex];
  if (code === "OFF" || code === "Libur") return "off";
  if (isHoliday(period, day, holidays)) return "off";
  if (rosterType !== "6:1" && isWeekend(period, day)) return "off";

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
  const v = (value || '').trim().toLowerCase()
  if (v.includes('service operation')) return 'Service Operation'
  if (v.includes('repair retread') || v.includes('repair / retread') || v.includes('repair/retread') || v.includes('repair')) return 'Repair Retread'
  return 'Crew Office'
}

export function canSwapOff(codeA?: ScheduleCode, codeB?: ScheduleCode) {
  return codeA === "OFF" || codeB === "OFF";
}

export function swapScheduleCodes(codeA: ScheduleCode, codeB: ScheduleCode): [ScheduleCode, ScheduleCode] | null {
  if (!canSwapOff(codeA, codeB)) return null;
  return [codeB, codeA];
}
