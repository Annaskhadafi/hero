import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
  buildInternalLmsComplianceRows,
  buildInternalLmsRoleMatrix,
  getInternalLmsEmployeeOptions,
  getInternalLmsWorkspaceData,
} from "@/lib/chitralearning-lms";
import { getServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = {
    site: url.searchParams.get("site"),
    department: url.searchParams.get("department"),
    section: url.searchParams.get("section"),
    role: url.searchParams.get("role"),
  };
  const [workspace, employees] = await Promise.all([
    getInternalLmsWorkspaceData(),
    getInternalLmsEmployeeOptions(),
  ]);
  const complianceRows = buildInternalLmsComplianceRows(workspace, employees, filters);
  const matrixRows = buildInternalLmsRoleMatrix(complianceRows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      complianceRows.map((row) => ({
        Course: row.courseTitle,
        Employee: row.employeeName,
        SN: row.employeeSn,
        Email: row.email,
        Site: row.site,
        Department: row.department,
        Section: row.section,
        Role: row.role,
        JobTitle: row.jobTitle,
        Status: row.status,
        Progress: row.progress,
        Score: row.score ?? "",
        DueAt: new Date(row.dueAt).toISOString().slice(0, 10),
        Certificate: row.certificateNumber,
        CertificateStatus: row.certificateStatus,
        CertificateExpiresAt: row.certificateExpiresAt
          ? new Date(row.certificateExpiresAt).toISOString().slice(0, 10)
          : "",
      }))
    ),
    "Compliance"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      matrixRows.map((row) => ({
        Role: row.role,
        Course: row.courseTitle,
        Total: row.total,
        BelumMulai: row.notStarted,
        Belajar: row.learning,
        Gagal: row.failed,
        Lulus: row.passed,
        Compliance: `${row.compliance}%`,
      }))
    ),
    "Matrix Role"
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chitralearning-compliance-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
