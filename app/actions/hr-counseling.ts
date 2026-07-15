"use server";

import { db } from "@/db";
import { employees, masterSections } from "@/db/schema/hero";
import { hrCounselingSessions, hrCounselingMessages } from "@/db/schema/hr-counseling";
import { eq, desc, asc, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { alias } from "drizzle-orm/pg-core";
import { sendWorkflowEmailToMany } from "@/lib/workflow-email";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isHrTicketStatus } from "@/lib/hr-ticket-status";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

async function ensureHrTicketSchema() {
  // ponytail: lazy schema guard; replace with a tracked migration when deployment environments multiply.
  await db.execute(sql`ALTER TABLE hero_hr_counseling_sessions ADD COLUMN IF NOT EXISTS ticket_number text`);
  await db.execute(sql`UPDATE hero_hr_counseling_sessions SET ticket_number = 'HR-' || to_char(created_at, 'YYYY') || '-' || lpad(id::text, 6, '0') WHERE ticket_number IS NULL`);
}

export async function getCurrentEmployee() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.authUserId, session.user.id))
    .limit(1);

  return employee || null;
}

export async function getHrPersonnel() {
  const hrList = await db
    .select({
      id: employees.id,
      name: employees.name,
      department: employees.department,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(
      and(
        eq(employees.isActive, true),
        or(
          sql`regexp_replace(lower(${employees.section}), '[^a-z0-9]+', '', 'g') = 'hrga'`,
          sql`regexp_replace(lower(${masterSections.name}), '[^a-z0-9]+', '', 'g') = 'humancapital'`
        )
      )
    )
    .orderBy(employees.name);

  return hrList;
}

export async function getMySessions() {
  await ensureHrTicketSchema();
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const hrAlias = alias(employees, "hrAlias");

  const sessions = await db
    .select({
      id: hrCounselingSessions.id,
      hrId: hrCounselingSessions.hrId,
      hrName: hrAlias.name,
      userId: hrCounselingSessions.userId,
      userName: employees.name,
      category: hrCounselingSessions.category,
      ticketNumber: hrCounselingSessions.ticketNumber,
      status: hrCounselingSessions.status,
      createdAt: hrCounselingSessions.createdAt,
      updatedAt: hrCounselingSessions.updatedAt,
    })
    .from(hrCounselingSessions)
    .innerJoin(employees, eq(hrCounselingSessions.userId, employees.id))
    .innerJoin(hrAlias, eq(hrCounselingSessions.hrId, hrAlias.id))
    .where(eq(hrCounselingSessions.userId, employee.id))
    .orderBy(desc(hrCounselingSessions.updatedAt));

  return sessions;
}

export async function getHrSessions() {
  await ensureHrTicketSchema();
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const userAlias = alias(employees, "userAlias");

  const sessions = await db
    .select({
      id: hrCounselingSessions.id,
      hrId: hrCounselingSessions.hrId,
      hrName: employees.name,
      userId: hrCounselingSessions.userId,
      userName: userAlias.name,
      category: hrCounselingSessions.category,
      ticketNumber: hrCounselingSessions.ticketNumber,
      status: hrCounselingSessions.status,
      createdAt: hrCounselingSessions.createdAt,
      updatedAt: hrCounselingSessions.updatedAt,
    })
    .from(hrCounselingSessions)
    .innerJoin(employees, eq(hrCounselingSessions.hrId, employees.id))
    .innerJoin(userAlias, eq(hrCounselingSessions.userId, userAlias.id))
    .where(eq(hrCounselingSessions.hrId, employee.id))
    .orderBy(desc(hrCounselingSessions.updatedAt));

  return sessions;
}

export async function getTicketForwardOptions() {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const [sections, pics] = await Promise.all([
    db.select({ id: masterSections.id, name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(masterSections.name),
    db.select({ id: employees.id, name: employees.name, sectionId: employees.sectionId, sectionName: masterSections.name })
      .from(employees)
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.isActive, true))
      .orderBy(employees.name),
  ]);

  return { sections, pics };
}

export async function forwardTicket(sessionId: number, sectionId: number, picId: number, note: string) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const session = await getSessionDetail(sessionId);
  if (!session) throw new Error("Tiket tidak ditemukan");
  if (session.hrId !== employee.id) throw new Error("Hanya HR yang dapat meneruskan tiket");
  if (!Number.isInteger(sectionId) || !Number.isInteger(picId)) throw new Error("Section dan PIC wajib dipilih");

  const [target] = await db
    .select({ id: employees.id, name: employees.name, email: employees.email, sectionId: employees.sectionId, sectionName: masterSections.name })
    .from(employees)
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(and(eq(employees.id, picId), eq(employees.sectionId, sectionId), eq(employees.isActive, true)))
    .limit(1);

  if (!target || !target.email || !target.sectionName) throw new Error("PIC tidak valid atau belum memiliki email");
  const safeNote = String(note ?? "").trim().slice(0, 2000);
  const ticketNumber = session.ticketNumber ?? `HR-${session.id}`;

  await sendWorkflowEmailToMany({
    templateCode: "hr_counseling_forwarded",
    templateName: "HR Counseling Forwarded",
    actorEmail: employee.email,
    fallbackSubject: `Pengaduan ${ticketNumber} diteruskan ke ${target.sectionName}`,
    fallbackHtml: `<p>Halo ${escapeHtml(target.name)},</p><p>Pengaduan <strong>${escapeHtml(ticketNumber)}</strong> dari <strong>${escapeHtml(session.userName)}</strong> diteruskan kepada Section <strong>${escapeHtml(target.sectionName)}</strong>.</p><p>Kategori: ${escapeHtml(session.category)}</p>${safeNote ? `<p>Catatan HR: ${escapeHtml(safeNote)}</p>` : ""}<p>Silakan buka dashboard HERO untuk menindaklanjuti pengaduan ini.</p>`,
    fallbackText: `Pengaduan ${ticketNumber} dari ${session.userName} diteruskan ke ${target.sectionName}. Kategori: ${session.category}. ${safeNote}`,
    recipients: [target.email],
    variables: {
      ticketNumber,
      employeeName: session.userName,
      category: session.category,
      sectionName: target.sectionName,
      picName: target.name,
      note: safeNote,
      sessionId,
    },
  });

  await db.update(hrCounselingSessions).set({ status: "in_progress", updatedAt: new Date() }).where(eq(hrCounselingSessions.id, sessionId));
  revalidatePath("/dashboard/hr-counseling");
  revalidatePath(`/dashboard/hr-counseling/${sessionId}`);
  revalidatePath("/mobile/curhat");
  return { success: true, recipient: target.name, section: target.sectionName };
}

export async function getSessionDetail(sessionId: number) {
  await ensureHrTicketSchema();
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const hrAlias = alias(employees, "hrAlias");

  const [session] = await db
    .select({
      id: hrCounselingSessions.id,
      hrId: hrCounselingSessions.hrId,
      hrName: hrAlias.name,
      userId: hrCounselingSessions.userId,
      userName: employees.name,
      category: hrCounselingSessions.category,
      ticketNumber: hrCounselingSessions.ticketNumber,
      status: hrCounselingSessions.status,
      createdAt: hrCounselingSessions.createdAt,
      updatedAt: hrCounselingSessions.updatedAt,
    })
    .from(hrCounselingSessions)
    .innerJoin(employees, eq(hrCounselingSessions.userId, employees.id))
    .innerJoin(hrAlias, eq(hrCounselingSessions.hrId, hrAlias.id))
    .where(eq(hrCounselingSessions.id, sessionId))
    .limit(1);

  if (!session) return null;
  
  // Make sure only the HR or the User can access it
  if (session.userId !== employee.id && session.hrId !== employee.id) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function createSession(hrId: number, category: string) {
  await ensureHrTicketSchema();
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const [session] = await db
    .insert(hrCounselingSessions)
    .values({
      userId: employee.id,
      hrId,
      category,
      status: "open",
    })
    .returning();

  const ticketNumber = `HR-${new Date().getFullYear()}-${String(session.id).padStart(6, "0")}`;
  await db.update(hrCounselingSessions).set({ ticketNumber }).where(eq(hrCounselingSessions.id, session.id));

  // Send email to HR
  const [hrEmployee] = await db
    .select({ email: employees.email, name: employees.name })
    .from(employees)
    .where(eq(employees.id, hrId))
    .limit(1);

  if (hrEmployee && hrEmployee.email) {
    await sendWorkflowEmailToMany({
      templateCode: "hr_counseling_new_session",
      templateName: "HR Counseling New Session",
      fallbackSubject: `Sesi Konsultasi Baru: ${category}`,
      fallbackHtml: `<p>Halo ${hrEmployee.name},</p><p>Karyawan <strong>${employee.name}</strong> telah memulai sesi konsultasi curhat baru dengan Anda tentang <strong>${category}</strong>.</p><p>Silakan masuk ke dashboard untuk membalas.</p>`,
      fallbackText: `Halo ${hrEmployee.name},\nKaryawan ${employee.name} telah memulai sesi konsultasi curhat baru dengan Anda tentang ${category}.`,
      recipients: [hrEmployee.email],
      variables: {
        hrName: hrEmployee.name,
        employeeName: employee.name,
        category,
        sessionId: session.id,
      },
    });
  }

  revalidatePath("/dashboard/curhat");
  revalidatePath("/mobile/curhat");
  return { ...session, ticketNumber };
}

export async function updateTicketStatus(sessionId: number, status: string) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");
  if (!isHrTicketStatus(status)) throw new Error("Status tiket tidak valid");

  const session = await getSessionDetail(sessionId);
  if (!session) throw new Error("Tiket tidak ditemukan");
  if (session.hrId !== employee.id) throw new Error("Hanya HR yang dapat mengubah status tiket");

  await db.update(hrCounselingSessions).set({
    status,
    closedAt: status === "closed" || status === "cancelled" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(hrCounselingSessions.id, sessionId));

  revalidatePath("/mobile/curhat");
  revalidatePath("/mobile/hr-counseling");
  revalidatePath("/dashboard/curhat");
  revalidatePath("/dashboard/hr-counseling");
  revalidatePath(`/mobile/curhat/${sessionId}`);
  revalidatePath(`/mobile/hr-counseling/${sessionId}`);
}

export async function closeSession(sessionId: number) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const session = await getSessionDetail(sessionId);
  if (!session) throw new Error("Session not found");

  await db
    .update(hrCounselingSessions)
    .set({
      status: "closed",
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hrCounselingSessions.id, sessionId));

  revalidatePath("/dashboard/curhat");
  revalidatePath("/dashboard/hr-counseling");
  revalidatePath(`/dashboard/curhat/${sessionId}`);
  revalidatePath(`/dashboard/hr-counseling/${sessionId}`);
  revalidatePath("/mobile/curhat");
  revalidatePath("/mobile/hr-counseling");
  revalidatePath(`/mobile/curhat/${sessionId}`);
  revalidatePath(`/mobile/hr-counseling/${sessionId}`);
}

export async function getMessages(sessionId: number) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  // Verify access
  await getSessionDetail(sessionId);

  const messages = await db
    .select({
      id: hrCounselingMessages.id,
      sessionId: hrCounselingMessages.sessionId,
      senderId: hrCounselingMessages.senderId,
      senderName: employees.name,
      message: hrCounselingMessages.message,
      attachmentUrl: hrCounselingMessages.attachmentUrl,
      fileName: hrCounselingMessages.attachmentFileName,
      isRead: hrCounselingMessages.isRead,
      createdAt: hrCounselingMessages.createdAt,
    })
    .from(hrCounselingMessages)
    .innerJoin(employees, eq(hrCounselingMessages.senderId, employees.id))
    .where(eq(hrCounselingMessages.sessionId, sessionId))
    .orderBy(asc(hrCounselingMessages.createdAt));

  const resolvedMessages = await Promise.all(
    messages.map(async (msg) => {
      let readableUrl: string | null = null;
      if (msg.attachmentUrl) {
        try {
          readableUrl = await getS3ObjectReadUrl(msg.attachmentUrl);
        } catch (e) {
          console.error("Failed to resolve read URL", e);
        }
      }
      return { ...msg, readableUrl };
    })
  );

  return resolvedMessages;
}

export async function sendMessage(
  sessionId: number,
  message: string,
  attachmentUrl?: string | null,
  attachmentFileName?: string | null
) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const session = await getSessionDetail(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status === "closed") {
    throw new Error("Cannot send message to a closed session");
  }

  const [newMessage] = await db
    .insert(hrCounselingMessages)
    .values({
      sessionId,
      senderId: employee.id,
      message,
      attachmentUrl,
      attachmentFileName,
    })
    .returning();

  // update session updated_at
  await db
    .update(hrCounselingSessions)
    .set({ updatedAt: new Date() })
    .where(eq(hrCounselingSessions.id, sessionId));

  revalidatePath(`/dashboard/curhat/${sessionId}`);
  revalidatePath(`/dashboard/hr-counseling/${sessionId}`);
  revalidatePath(`/mobile/curhat/${sessionId}`);
  revalidatePath(`/mobile/hr-counseling/${sessionId}`);
  
  return newMessage;
}
