"use server";

import { db } from "@/db";
import {
  hcOffboardingRequests,
  hcClearanceItems,
  employees,
  masterDepartments,
  hrPositions,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  buildWorkflowEmailContent,
  getAppUrl,
  getHrEmployeeContactById,
  getHumanCapitalRecipientEmails,
  sendWorkflowEmail,
  sendWorkflowEmailToMany,
} from "@/lib/workflow-email";
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";
import { createLegacyApprovalRequest } from "@/lib/legacy-approval-engine";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployeeAccessRole } from "@/lib/hero-access";
import { getEmployeeTargetByEmail } from "@/lib/push-notifications";

async function requireSuperAdminOrHcManager() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized: Sesi login diperlukan.");
  }

  const role = await getCurrentEmployeeAccessRole();
  const isAuthorized =
    role === "Super Admin" ||
    role === "HC Manager" ||
    role === "Khusus Mas Rendi" ||
    role === "System Administrator" ||
    Boolean(role?.toLowerCase().includes("admin"));

  if (!isAuthorized) {
    throw new Error("Akses ditolak: Hanya Super Admin dan HC Manager yang diizinkan untuk melakukan aksi ini.");
  }

  return { session, role };
}

// ─── Default Clearance Checklist Items ────────────────────────────────────────

const DEFAULT_CLEARANCE_ITEMS = [
  {
    category: "IT",
    title: "Kembalikan Laptop & Aksesoris",
    description: "Kembalikan laptop, charger, mouse, dan aksesoris IT lainnya",
    assignedTo: "IT",
  },
  {
    category: "IT",
    title: "Nonaktifkan Akun Sistem",
    description: "Nonaktifkan email, VPN, dan akses sistem lainnya",
    assignedTo: "IT",
  },
  {
    category: "Finance",
    title: "Lunasi Klaim yang Tertunda",
    description: "Selesaikan semua klaim pengeluaran dan pinjaman karyawan",
    assignedTo: "Finance",
  },
  {
    category: "Finance",
    title: "Perhitungan Gaji Terakhir",
    description: "Hitung gaji terakhir, pesangon, dan kompensasi lainnya",
    assignedTo: "Finance",
  },
  {
    category: "HR",
    title: "Kembalikan Kartu Karyawan",
    description: "Kembalikan ID card dan kartu akses karyawan",
    assignedTo: "HR",
  },
  {
    category: "HR",
    title: "Kembalikan Kartu Parkir",
    description: "Kembalikan kartu parkir dan akses kendaraan",
    assignedTo: "HR",
  },
  {
    category: "HSE",
    title: "Kembalikan Peralatan Keselamatan",
    description: "Kembalikan helm, sepatu safety, rompi, dan APD lainnya",
    assignedTo: "HSE",
  },
  {
    category: "Warehouse",
    title: "Kembalikan Alat & Peralatan",
    description: "Kembalikan semua peralatan dan inventaris gudang yang dipinjam",
    assignedTo: "Warehouse",
  },
  {
    category: "Department",
    title: "Dokumentasi Transfer Pengetahuan",
    description: "Dokumentasikan proses kerja, SOP, dan pengetahuan penting",
    assignedTo: "Department",
  },
  {
    category: "Department",
    title: "Serah Terima Proyek",
    description: "Serahkan semua proyek dan tanggung jawab yang sedang berjalan",
    assignedTo: "Department",
  },
];

// ─── Get Offboarding Records ─────────────────────────────────────────────────

export async function getOffboardingRecords(filters?: {
  status?: string;
  requestType?: string;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcOffboardingRequests.status, filters.status));
  }
  if (filters?.requestType) {
    conditions.push(eq(hcOffboardingRequests.requestType, filters.requestType));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: hcOffboardingRequests.id,
      employeeId: hcOffboardingRequests.employeeId,
      employeeCode: employees.employeeSn,
      employeeName: employees.name,
      departmentName: masterDepartments.name,
      positionName: hrPositions.rankName,
      requestType: hcOffboardingRequests.requestType,
      reason: hcOffboardingRequests.reason,
      requestedLastWorkingDay: hcOffboardingRequests.requestedLastWorkingDay,
      actualLastWorkingDay: hcOffboardingRequests.actualLastWorkingDay,
      status: hcOffboardingRequests.status,
      approvedBy: hcOffboardingRequests.approvedBy,
      approvedAt: hcOffboardingRequests.approvedAt,
      exitInterviewNotes: hcOffboardingRequests.exitInterviewNotes,
      exitInterviewDate: hcOffboardingRequests.exitInterviewDate,
      exitInterviewBy: hcOffboardingRequests.exitInterviewBy,
      createdAt: hcOffboardingRequests.createdAt,
      updatedAt: hcOffboardingRequests.updatedAt,
    })
    .from(hcOffboardingRequests)
    .leftJoin(employees, eq(hcOffboardingRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .where(where)
    .orderBy(desc(hcOffboardingRequests.createdAt));

  // Attach clearance progress to each row
  const result = await Promise.all(
    rows.map(async (row) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(hcClearanceItems)
        .where(eq(hcClearanceItems.offboardingId, row.id));

      const [{ completed }] = await db
        .select({ completed: count() })
        .from(hcClearanceItems)
        .where(
          and(
            eq(hcClearanceItems.offboardingId, row.id),
            eq(hcClearanceItems.isCompleted, true)
          )
        );

      return {
        ...row,
        clearanceTotal: Number(total),
        clearanceCompleted: Number(completed),
      };
    })
  );

  return result;
}

// ─── Get Offboarding Stats ───────────────────────────────────────────────────

export async function getOffboardingStats() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [pending] = await db
    .select({ cnt: count() })
    .from(hcOffboardingRequests)
    .where(eq(hcOffboardingRequests.status, "pending"));

  const [inClearance] = await db
    .select({ cnt: count() })
    .from(hcOffboardingRequests)
    .where(eq(hcOffboardingRequests.status, "in_clearance"));

  const [completedThisMonth] = await db
    .select({ cnt: count() })
    .from(hcOffboardingRequests)
    .where(
      and(
        eq(hcOffboardingRequests.status, "completed"),
        sql`${hcOffboardingRequests.updatedAt} >= ${monthStart}`
      )
    );

  const [total] = await db
    .select({ cnt: count() })
    .from(hcOffboardingRequests);

  return {
    pending: Number(pending.cnt),
    inClearance: Number(inClearance.cnt),
    completedThisMonth: Number(completedThisMonth.cnt),
    total: Number(total.cnt),
  };
}

// ─── Get Offboarding by ID ───────────────────────────────────────────────────

export async function getOffboardingById(id: number) {
  const [record] = await db
    .select({
      id: hcOffboardingRequests.id,
      employeeId: hcOffboardingRequests.employeeId,
      employeeCode: employees.employeeSn,
      employeeName: employees.name,
      departmentName: masterDepartments.name,
      positionName: hrPositions.rankName,
      requestType: hcOffboardingRequests.requestType,
      reason: hcOffboardingRequests.reason,
      requestedLastWorkingDay: hcOffboardingRequests.requestedLastWorkingDay,
      actualLastWorkingDay: hcOffboardingRequests.actualLastWorkingDay,
      status: hcOffboardingRequests.status,
      approvedBy: hcOffboardingRequests.approvedBy,
      approvedAt: hcOffboardingRequests.approvedAt,
      exitInterviewNotes: hcOffboardingRequests.exitInterviewNotes,
      exitInterviewDate: hcOffboardingRequests.exitInterviewDate,
      exitInterviewBy: hcOffboardingRequests.exitInterviewBy,
      createdAt: hcOffboardingRequests.createdAt,
      updatedAt: hcOffboardingRequests.updatedAt,
    })
    .from(hcOffboardingRequests)
    .leftJoin(employees, eq(hcOffboardingRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .where(eq(hcOffboardingRequests.id, id));

  if (!record) return null;

  const clearanceItems = await db
    .select()
    .from(hcClearanceItems)
    .where(eq(hcClearanceItems.offboardingId, id))
    .orderBy(hcClearanceItems.sortOrder);

  return { ...record, clearanceItems };
}

// ─── Create Offboarding Request ──────────────────────────────────────────────

async function notifyOffboardingUpdate(input: {
  employeeId: number;
  title: string;
  intro: string;
  details: Array<string | null | undefined>;
  status: string;
}) {
  const employeeContact = await getHrEmployeeContactById(input.employeeId);
  const hcRecipients = await getHumanCapitalRecipientEmails();
  const emailContent = buildWorkflowEmailContent({
    title: input.title,
    greeting: `Halo ${employeeContact.name},`,
    intro: input.intro,
    details: input.details,
    ctaLabel: "Buka Offboarding",
    ctaUrl: getAppUrl("/dashboard/hc/offboarding"),
  });

  if (employeeContact.email) {
    await sendWorkflowEmail({
      to: employeeContact.email,
      templateCode: "offboarding_update",
      templateName: "Offboarding Update",
      variables: {
        employeeName: employeeContact.name,
        title: input.title,
        intro: input.intro,
        status: input.status,
        detailsSummary: input.details.filter(Boolean).join(" | "),
      },
      fallbackSubject: input.title,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    });
  }

  if (hcRecipients.length > 0) {
    await sendWorkflowEmailToMany({
      recipients: hcRecipients,
      templateCode: "offboarding_update",
      templateName: "Offboarding Update",
      variables: {
        employeeName: employeeContact.name,
        title: input.title,
        intro: input.intro,
        status: input.status,
        detailsSummary: input.details.filter(Boolean).join(" | "),
      },
      fallbackSubject: `${input.title} [${input.status}]`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    });
  }
}

async function notifyOffboardingBell(input: {
  recipientEmails: string[];
  eventType: string;
  title: string;
  body: string;
  url: string;
  metadata?: Record<string, unknown>;
}) {
  await notifyWorkflowBellRecipients({
    recipientEmails: input.recipientEmails,
    eventType: input.eventType,
    category: "approval_requests",
    title: input.title,
    body: input.body,
    url: input.url,
    tagPrefix: "offboarding",
    metadata: input.metadata,
  });
}

export async function createOffboardingRequest(data: {
  employeeId: string;
  requestType: string;
  reason: string;
  requestedLastWorkingDay: string;
}) {
  const empId = parseInt(data.employeeId, 10);

  const [record] = await db
    .insert(hcOffboardingRequests)
    .values({
      employeeId: empId,
      approvalSubmissionId: null,
      requestType: data.requestType,
      reason: data.reason,
      requestedLastWorkingDay: data.requestedLastWorkingDay,
      status: "pending",
    })
    .returning();

  const employeeContact = await getHrEmployeeContactById(empId);
  const requesterEmployee = employeeContact.email
    ? await getEmployeeTargetByEmail(employeeContact.email)
    : null;

  if (requesterEmployee) {
    const { submission } = await createLegacyApprovalRequest({
      templateKey: "offboarding-request",
      requesterEmployeeId: requesterEmployee.id,
      siteId: null,
      activityType: "offboarding-request",
      transactionType: "offboarding_request",
      referenceId: record.id,
      payloadSnapshot: {
        legacyRecordId: record.id,
        employeeId: empId,
        employeeName: employeeContact.name,
        requestType: data.requestType,
        reason: data.reason,
        requestedLastWorkingDay: data.requestedLastWorkingDay,
      },
      previewSnapshot: {
        title: `Offboarding Request - ${employeeContact.name}`,
        summary: `${employeeContact.name} mengajukan offboarding tipe ${data.requestType}.`,
        workDate: data.requestedLastWorkingDay,
      },
    });

    await db
      .update(hcOffboardingRequests)
      .set({
        approvalSubmissionId: submission.id,
        updatedAt: new Date(),
      })
      .where(eq(hcOffboardingRequests.id, record.id));
  }

  // Auto-generate default clearance checklist
  const clearanceToInsert = DEFAULT_CLEARANCE_ITEMS.map((item, index) => ({
    offboardingId: record.id,
    sortOrder: index + 1,
    category: item.category,
    title: item.title,
    description: item.description,
    assignedTo: item.assignedTo,
    isCompleted: false,
    completedBy: "",
    notes: "",
  }));

  await db.insert(hcClearanceItems).values(clearanceToInsert);

  revalidatePath("/dashboard/hc/offboarding");

  try {
    await notifyOffboardingUpdate({
      employeeId: empId,
      title: "Request offboarding baru",
      intro: "Request offboarding telah dibuat dan menunggu review tim HC.",
      details: [
        `Tipe: ${data.requestType}`,
        `Last working day: ${data.requestedLastWorkingDay}`,
        data.reason ? `Alasan: ${data.reason}` : null,
      ],
      status: "pending",
    });
  } catch (emailError) {
    console.error("Offboarding create email error:", emailError);
  }

  try {
    await notifyOffboardingBell({
      recipientEmails: await getHumanCapitalRecipientEmails(),
      eventType: "offboarding_request_submitted",
      title: "Request offboarding baru",
      body: `Pengajuan offboarding baru untuk employee #${empId} menunggu review HC.`,
      url: "/dashboard/hc/offboarding",
      metadata: {
        employeeId: empId,
        requestType: data.requestType,
      },
    });
  } catch (notificationError) {
    console.error("Offboarding create bell error:", notificationError);
  }

  return record;
}

// ─── Update Offboarding Request ──────────────────────────────────────────────

export async function updateOffboardingRequest(
  id: number,
  data: {
    requestType?: string;
    reason?: string;
    requestedLastWorkingDay?: string;
    actualLastWorkingDay?: string;
    status?: string;
    approvedBy?: string;
  }
) {
  const [updated] = await db
    .update(hcOffboardingRequests)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hcOffboardingRequests.id, id))
    .returning();

  revalidatePath("/dashboard/hc/offboarding");

  if (updated) {
    try {
      await notifyOffboardingUpdate({
        employeeId: updated.employeeId,
        title: "Offboarding masuk tahap clearance",
        intro: "Request offboarding Anda sudah disetujui dan sekarang masuk proses clearance.",
        details: [
          updated.approvedBy ? `Approved by: ${updated.approvedBy}` : null,
        ],
        status: "in_clearance",
      });
    } catch (emailError) {
      console.error("Offboarding approve email error:", emailError);
    }

    try {
      const employeeContact = await getHrEmployeeContactById(updated.employeeId);
      await notifyOffboardingBell({
        recipientEmails: [employeeContact.email, ...(await getHumanCapitalRecipientEmails())],
        eventType: "offboarding_status_updated",
        title: "Offboarding masuk tahap clearance",
        body: `${employeeContact.name} masuk proses clearance offboarding.`,
        url: "/dashboard/hc/offboarding",
        metadata: {
          employeeId: updated.employeeId,
          status: "in_clearance",
        },
      });
    } catch (notificationError) {
      console.error("Offboarding approve bell error:", notificationError);
    }
  }

  return updated;
}

// ─── Approve Offboarding ─────────────────────────────────────────────────────

export async function approveOffboarding(id: number, approvedBy: string) {
  await requireSuperAdminOrHcManager();
  const [updated] = await db
    .update(hcOffboardingRequests)
    .set({
      status: "in_clearance",
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hcOffboardingRequests.id, id))
    .returning();

  revalidatePath("/dashboard/hc/offboarding");
  return updated;
}

// ─── Complete Clearance Item ─────────────────────────────────────────────────

export async function completeClearanceItem(
  itemId: number,
  completedBy: string,
  notes?: string
) {
  await requireSuperAdminOrHcManager();
  const [updated] = await db
    .update(hcClearanceItems)
    .set({
      isCompleted: true,
      completedAt: new Date(),
      completedBy,
      notes: notes || "",
    })
    .where(eq(hcClearanceItems.id, itemId))
    .returning();

  revalidatePath("/dashboard/hc/offboarding");
  return updated;
}

// ─── Uncomplete Clearance Item ───────────────────────────────────────────────

export async function uncompleteClearanceItem(itemId: number) {
  await requireSuperAdminOrHcManager();
  const [updated] = await db
    .update(hcClearanceItems)
    .set({
      isCompleted: false,
      completedAt: null,
      completedBy: "",
      notes: "",
    })
    .where(eq(hcClearanceItems.id, itemId))
    .returning();

  revalidatePath("/dashboard/hc/offboarding");
  return updated;
}

// ─── Complete Offboarding ────────────────────────────────────────────────────

export async function completeOffboarding(id: number) {
  await requireSuperAdminOrHcManager();
  const [record] = await db
    .select({ employeeId: hcOffboardingRequests.employeeId })
    .from(hcOffboardingRequests)
    .where(eq(hcOffboardingRequests.id, id));

  if (!record) throw new Error("Offboarding record not found");

  const [updated] = await db
    .update(hcOffboardingRequests)
    .set({
      status: "completed",
      actualLastWorkingDay: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(hcOffboardingRequests.id, id))
    .returning();

  // Deactivate the employee
  await db
    .update(employees)
    .set({ isActive: false })
    .where(eq(employees.id, record.employeeId));

  revalidatePath("/dashboard/hc/offboarding");
  revalidatePath("/dashboard/hc/employee");

  try {
    await notifyOffboardingUpdate({
      employeeId: record.employeeId,
      title: "Offboarding selesai",
      intro: "Proses offboarding telah diselesaikan dan status karyawan sudah dinonaktifkan.",
      details: [
        `Tanggal efektif: ${new Date().toISOString().split("T")[0]}`,
      ],
      status: "completed",
    });
  } catch (emailError) {
    console.error("Offboarding completion email error:", emailError);
  }

  try {
    const employeeContact = await getHrEmployeeContactById(record.employeeId);
    await notifyOffboardingBell({
      recipientEmails: [employeeContact.email, ...(await getHumanCapitalRecipientEmails())],
      eventType: "offboarding_completed",
      title: "Offboarding selesai",
      body: `Proses offboarding ${employeeContact.name} telah selesai.`,
      url: "/dashboard/hc/offboarding",
      metadata: {
        employeeId: record.employeeId,
        status: "completed",
      },
    });
  } catch (notificationError) {
    console.error("Offboarding completion bell error:", notificationError);
  }

  return updated;
}

// ─── Delete Offboarding ──────────────────────────────────────────────────────

export async function deleteOffboarding(id: number) {
  await requireSuperAdminOrHcManager();
  // Clearance items are cascade-deleted by FK constraint
  await db
    .delete(hcOffboardingRequests)
    .where(eq(hcOffboardingRequests.id, id));

  revalidatePath("/dashboard/hc/offboarding");
  return { success: true };
}

// ─── Update Exit Interview ───────────────────────────────────────────────────

export async function updateExitInterview(
  id: number,
  data: {
    exitInterviewDate?: string;
    exitInterviewBy?: string;
    exitInterviewNotes?: string;
  }
) {
  const [updated] = await db
    .update(hcOffboardingRequests)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hcOffboardingRequests.id, id))
    .returning();

  revalidatePath("/dashboard/hc/offboarding");
  return updated;
}

// ─── Get Active Employees ────────────────────────────────────────────────────

export async function getActiveEmployees() {
  return await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      positionName: hrPositions.rankName,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .where(eq(employees.isActive, true))
    .orderBy(employees.name);
}
