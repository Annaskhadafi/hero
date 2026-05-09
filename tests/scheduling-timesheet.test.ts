import fs from "fs";
import path from "path";
import { buildAttendanceImportPreview } from "@/lib/timesheet/attendance-import";

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
});
