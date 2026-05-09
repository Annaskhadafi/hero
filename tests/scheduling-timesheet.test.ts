import fs from "fs";
import path from "path";
import { buildAttendanceImportPreview } from "@/lib/timesheet/attendance-import";
import { applyHolidayPolicy, canSwapOff, classifyOvertimeDay, swapScheduleCodes, type ScheduleCode } from "@/lib/timesheet-scheduling";
import { normalizeOpenHolidayResponse } from "@/lib/openholiday";

describe("scheduling timesheet workflow", () => {
  it("does not use localStorage scheduling persistence", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scheduling-timesheet-workspace.tsx"), "utf8");
    expect(source).not.toMatch(/localStorage\.(getItem|setItem|removeItem)/);
    expect(source).not.toContain("hero-scheduling");
  });

  it("validates attendance import matching duplicates unmatched cross-site and conflicts", () => {
    const preview = buildAttendanceImportPreview({
      siteId: 1,
      employees: [
        { id: 10, name: "Ani Wijaya", employeeSn: "SN-10", siteId: 1 },
        { id: 11, name: "Budi Santoso", employeeSn: "", siteId: 2 },
      ],
      fixedSchedule: [{ employeeId: 10, schedule: ["OFF", "DS"] }],
      rows: [
        { employeeSn: "SN-10", employeeName: "Wrong Name", siteName: "", day: 1, status: "present", clockIn: "08:00", clockOut: "17:00", note: "" },
        { employeeSn: "", employeeName: "Ani Wijaya", siteName: "", day: 1, status: "present", clockIn: "08:00", clockOut: "17:00", note: "" },
        { employeeSn: "", employeeName: "Missing", siteName: "", day: 2, status: "present", clockIn: "08:00", clockOut: "17:00", note: "" },
        { employeeSn: "", employeeName: "Budi Santoso", siteName: "", day: 2, status: "present", clockIn: "08:00", clockOut: "17:00", note: "" },
      ],
    });

    expect(preview.previewRows[0].employeeId).toBe(10);
    expect(preview.previewRows[1].duplicate).toBe(true);
    expect(preview.previewRows[2].unmatched).toBe(true);
    expect(preview.previewRows[3].crossSite).toBe(true);
    expect(preview.conflicts).toHaveLength(2);
  });

  it("does not use native prompts in scheduling workspace", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scheduling-timesheet-workspace.tsx"), "utf8");
    expect(source).not.toContain("window.prompt");
  });

  it("exposes same-section OFF swap UI without native prompts", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scheduling-timesheet-workspace.tsx"), "utf8");
    expect(source).toContain("swapSelectedScheduleCell");
    expect(source).toContain("Tukar OFF satu section");
    expect(source).toContain("rosterSection !== selectedRow.rosterSection");
    expect(source).not.toContain("window.prompt");
  });

  it("keeps import preview close separate from discard", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/timesheet/attendance-import-preview-dialog.tsx"), "utf8");
    expect(source).toContain("onRequestClose");
    expect(source).toContain("onOpenChange={(next) => !next && onRequestClose()}");
  });

  it("labels CSV export accurately", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scheduling-timesheet-workspace.tsx"), "utf8");
    expect(source).toContain("Export CSV");
    expect(source).not.toContain("Export Excel");
  });

  it("keeps DB status serialization keys stable", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/hero-admin.ts"), "utf8");
    for (const key of ["scheduleStatus", "attendanceStatus", "importStatus", "conflictCount", "finalizedAt", "metadata"]) {
      expect(source).toContain(key);
    }
  });

  it("swaps only schedules where one side is OFF", () => {
    expect(canSwapOff("OFF", "DS")).toBe(true);
    expect(swapScheduleCodes("OFF", "DS")).toEqual(["DS", "OFF"]);
    expect(canSwapOff("DS", "NS")).toBe(false);
    expect(swapScheduleCodes("DS", "NS")).toBeNull();
  });

  it("shows holiday labels in schedule and attendance views", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scheduling-timesheet-workspace.tsx"), "utf8");
    expect(source).toContain("holidaysByDay");
    expect(source).toContain("attendance-${holiday.date}");
    expect(source).toContain("bg-amber-100/70");
  });

  it("applies holiday policy for office and 5:2 but preserves 6:1 code", () => {
    expect(applyHolidayPolicy("IN", { scheduleType: "office", rosterType: "5:2", isHoliday: true })).toBe("Libur");
    expect(applyHolidayPolicy("DS", { scheduleType: "shift", rosterType: "5:2", isHoliday: true })).toBe("Libur");
    expect(applyHolidayPolicy("DS", { scheduleType: "shift", rosterType: "6:1", isHoliday: true })).toBe("DS");
  });

  it("classifies 6:1 holidays and sixth workday as off overtime day", () => {
    const schedule: ScheduleCode[] = ["OFF", "DS", "DS", "DS", "DS", "DS", "DS"];
    expect(classifyOvertimeDay(["DS"], "2026-05", 0, "6:1", [{ date: "2026-05-01", day: 1 }])).toBe("off");
    expect(classifyOvertimeDay(schedule, "2026-05", 6, "6:1", [])).toBe("off");
  });

  it("normalizes OpenHoliday multi-day ranges", () => {
    const holidays = normalizeOpenHolidayResponse([{ id: "x", startDate: "2026-05-01", endDate: "2026-05-03", name: [{ language: "ID", text: "Libur Nasional" }], nationwide: true }]);
    expect(holidays.map((holiday) => holiday.date)).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
  });
});
