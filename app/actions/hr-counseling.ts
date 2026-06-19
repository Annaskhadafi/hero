"use server";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { hrCounselingSessions, hrCounselingMessages } from "@/db/schema/hr-counseling";
import { eq, desc, asc, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { alias } from "drizzle-orm/pg-core";
import { sendWorkflowEmailToMany } from "@/lib/workflow-email";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
  // Fetch employees whose department is Human Capital or HR
  const hrList = await db
    .select({
      id: employees.id,
      name: employees.name,
      department: employees.department,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        or(
          sql`lower(${employees.department}) like '%human capital%'`,
          sql`lower(${employees.department}) like '%hr%'`,
          sql`lower(${employees.department}) like '%hc%'`,
          sql`lower(${employees.department}) = 'hc'`
        )
      )
    )
    .orderBy(employees.name);

  return hrList;
}

export async function getMySessions() {
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

export async function getSessionDetail(sessionId: number) {
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
      status: hrCounselingSessions.status,
      createdAt: hrCounselingSessions.createdAt,
      updatedAt: hrCounselingSessions.updatedAt,
    })
    .from(hrCounselingSessions)
    .innerJoin(employees, eq(hrCounselingSessions.userId, employees.id))
    .innerJoin(hrAlias, eq(hrCounselingSessions.hrId, hrAlias.id))
    .where(eq(hrCounselingSessions.id, sessionId))
    .limit(1);

  if (!session) throw new Error("Session not found");
  
  // Make sure only the HR or the User can access it
  if (session.userId !== employee.id && session.hrId !== employee.id) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function createSession(hrId: number, category: string) {
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
      to: [hrEmployee.email],
      variables: {
        hrName: hrEmployee.name,
        employeeName: employee.name,
        category,
        sessionId: session.id,
      },
    });
  }

  revalidatePath("/dashboard/curhat");
  return session;
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

export async function sendMessage(sessionId: number, message: string, attachmentUrl?: string | null) {
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error("Unauthorized");

  const session = await getSessionDetail(sessionId);
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
    })
    .returning();

  // update session updated_at
  await db
    .update(hrCounselingSessions)
    .set({ updatedAt: new Date() })
    .where(eq(hrCounselingSessions.id, sessionId));

  revalidatePath(`/dashboard/curhat/${sessionId}`);
  revalidatePath(`/dashboard/hr-counseling/${sessionId}`);
  
  return newMessage;
}
