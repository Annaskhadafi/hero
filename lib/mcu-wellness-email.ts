// MCU Wellness email + bell notification helpers.
// Follows centralized Email Settings pattern: runtime template override via
// resolveWorkflowTemplateContent + Human Capital policy CC + delivery logging
// via sendEmailViaSmtp + bell event via createNotificationEventForEmployee.

import { db } from "@/db";
import { employees, masterDepartments } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { resolveWorkflowTemplateContent } from "@/lib/workflow-email";
import {
  getHumanCapitalPolicyCcRecipients,
  buildHumanCapitalEmail,
} from "@/lib/human-capital-email";
import { createNotificationEventForEmployee } from "@/lib/push-notifications";

async function getEmployeeWithDept(employeeId: number) {
  const [emp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(eq(employees.id, employeeId))
    .limit(1);
  return emp ?? null;
}

// ─── Annual Reminder ────────────────────────────────────────────────────

export async function sendMcuAnnualReminderEmail(
  employeeId: number,
  dueDate: string,
  daysUntilDue: number,
): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const emp = await getEmployeeWithDept(employeeId);
  if (!emp || !emp.email) {
    return { status: "skipped", reason: "Employee email missing" };
  }

  const smtpSettings = await getEmailSmtpSettingsData();
  if (!smtpSettings.host || !smtpSettings.fromEmail) {
    return { status: "skipped", reason: "SMTP not configured" };
  }

  const dueDateStr = (() => {
    try {
      return format(parseISO(dueDate), "EEEE, dd MMMM yyyy");
    } catch {
      return dueDate;
    }
  })();

  const variables = {
    employeeName: emp.name,
    employeeSn: emp.employeeSn,
    departmentName: emp.departmentName || "-",
    dueDate: dueDateStr,
    daysUntilDue: String(daysUntilDue),
  };

  const fallback = buildHumanCapitalEmail({
    title: "Pengingat MCU Tahunan",
    intro: `Halo ${emp.name}, MCU tahunan Anda jatuh tempo pada ${dueDateStr} (${daysUntilDue} hari lagi). Mohon koordinasi dengan HC untuk penjadwalan.`,
  });
  const hcPolicyCc = await getHumanCapitalPolicyCcRecipients();

  const resolved = await resolveWorkflowTemplateContent({
    templateCode: "mcu_annual_reminder",
    cc: hcPolicyCc,
    variables,
    fallbackSubject: `[HERO] Pengingat MCU Tahunan - ${emp.name}`,
    fallbackHtml: fallback.html,
    fallbackText: fallback.text,
  });

  try {
    await sendEmailViaSmtp(smtpSettings, {
      to: emp.email,
      cc: resolved.ccList,
      subject: resolved.subject,
      html: resolved.html,
      text: resolved.text,
      format: resolved.template ? null : "html",
      templateName: "MCU Annual Reminder",
      templateCode: "mcu_annual_reminder",
    });
  } catch (err) {
    console.error("[mcu-wellness-email] reminder send failed:", err);
    return { status: "failed", reason: err instanceof Error ? err.message : "SMTP error" };
  }

  // Bell notification
  try {
    await createNotificationEventForEmployee({
      employeeId: emp.id,
      eventType: "mcu_reminder_due",
      category: "shift_reminders",
      title: "Pengingat MCU Tahunan",
      body: `MCU Anda jatuh tempo ${dueDateStr} (${daysUntilDue} hari). Segera koordinasi dengan HC.`,
      url: "/mobile/wellness",
    });
  } catch (err) {
    console.error("[mcu-wellness-email] bell event failed:", err);
  }

  return { status: "sent" };
}

// ─── Result Notification (Fit / Unfit) ──────────────────────────────────

export async function sendMcuResultEmail(
  employeeId: number,
  data: {
    kategori: string;
    kesimpulan: string;
    saran: string;
    mcuDate: string;
  },
): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const emp = await getEmployeeWithDept(employeeId);
  if (!emp || !emp.email) {
    return { status: "skipped", reason: "Employee email missing" };
  }

  const smtpSettings = await getEmailSmtpSettingsData();
  if (!smtpSettings.host || !smtpSettings.fromEmail) {
    return { status: "skipped", reason: "SMTP not configured" };
  }

  const mcuDateStr = (() => {
    try {
      return format(parseISO(data.mcuDate), "EEEE, dd MMMM yyyy");
    } catch {
      return data.mcuDate;
    }
  })();

  const isFit = data.kategori.toLowerCase() === "fit";
  const templateCode = isFit ? "mcu_result_fit" : "mcu_result_unfit";
  const variables = {
    employeeName: emp.name,
    mcuDate: mcuDateStr,
    kategori: data.kategori,
    kesimpulan: data.kesimpulan,
    saran: data.saran,
  };

  const fallback = buildHumanCapitalEmail({
    title: `Hasil MCU: ${data.kategori}`,
    intro: `Halo ${emp.name}, hasil MCU tanggal ${mcuDateStr} dikategorikan ${data.kategori}. Kesimpulan: ${data.kesimpulan}. Saran: ${data.saran}`,
  });
  const hcPolicyCc = await getHumanCapitalPolicyCcRecipients();

  const resolved = await resolveWorkflowTemplateContent({
    templateCode,
    cc: hcPolicyCc,
    variables,
    fallbackSubject: `[HERO] Hasil MCU ${data.kategori} - ${emp.name}`,
    fallbackHtml: fallback.html,
    fallbackText: fallback.text,
  });

  try {
    await sendEmailViaSmtp(smtpSettings, {
      to: emp.email,
      cc: resolved.ccList,
      subject: resolved.subject,
      html: resolved.html,
      text: resolved.text,
      format: resolved.template ? null : "html",
      templateName: `MCU Result ${data.kategori}`,
      templateCode,
    });
  } catch (err) {
    console.error("[mcu-wellness-email] result send failed:", err);
    return { status: "failed", reason: err instanceof Error ? err.message : "SMTP error" };
  }

  // Bell notification
  try {
    await createNotificationEventForEmployee({
      employeeId: emp.id,
      eventType: isFit ? "mcu_status_fit" : "mcu_status_unfit",
      category: "info",
      title: `Hasil MCU: ${data.kategori}`,
      body: `Hasil MCU tanggal ${mcuDateStr}: ${data.kategori}. ${data.kesimpulan}`,
      url: "/mobile/wellness",
    });
  } catch (err) {
    console.error("[mcu-wellness-email] bell event failed:", err);
  }

  return { status: "sent" };
}
