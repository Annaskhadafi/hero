import { db } from "@/db";
import { apdRequests, apdRequestItems, employees, masterDepartments, sites, approvals } from "@/db/schema/hero";
import { eq, desc, and } from "drizzle-orm";

export async function fetchApdRequests(currentEmployeeId?: number) {
  const query = db
    .select({
      id: apdRequests.id,
      requestNumber: apdRequests.requestNumber,
      requestDate: apdRequests.requestDate,
      status: apdRequests.status,
      notes: apdRequests.notes,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      siteName: sites.name,
      employeeId: apdRequests.employeeId,
    })
    .from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id));
    
  if (currentEmployeeId != null) {
    query.where(eq(apdRequests.employeeId, currentEmployeeId));
  }

  const rows = await query.orderBy(desc(apdRequests.createdAt));
  
  return rows;
}

export async function fetchApdRequestById(id: number) {
  const [request] = await db
    .select({
      id: apdRequests.id,
      requestNumber: apdRequests.requestNumber,
      requestDate: apdRequests.requestDate,
      status: apdRequests.status,
      notes: apdRequests.notes,
      signatureUrl: apdRequests.signatureUrl,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      siteName: sites.name,
      employeeId: apdRequests.employeeId,
    })
    .from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(eq(apdRequests.id, id));

  if (!request) return null;

  const items = await db
    .select()
    .from(apdRequestItems)
    .where(eq(apdRequestItems.requestId, id));

  const approvalHistory = await db
    .select()
    .from(approvals)
    .where(eq(approvals.apdRequestId, id))
    .orderBy(desc(approvals.level));

  return { ...request, items, approvalHistory };
}
