"use server";

import { db } from "@/db";
import {
  hcLeaderPerformance,
  employees,
  masterSections,
} from "@/db/schema/hero";
import { aliasedTable } from "drizzle-orm/alias";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  sendHumanCapitalEmail,
  buildHumanCapitalEmail,
} from "@/lib/human-capital-email";
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";

const LEADER_PERFORMANCE_PATH = "/dashboard/hc/leader-performance";

export type LeaderPerformanceReviewData = {
  leaderId: string; // Stored as leaderSn string
  reviewerId?: string | null; // Stored as reviewerSn string
  period: string;
  surveyScore: number;
  responseTimeScore: number;
  leadershipScore: number;
  overallScore?: number | string | null;
  feedback?: string;
  status?: string;
};

export async function getLeaderPerformanceReviews() {
  const leader = aliasedTable(employees, "leader");
  const reviewer = aliasedTable(employees, "reviewer");

  return db
    .select({
      id: hcLeaderPerformance.id,
      leaderId: hcLeaderPerformance.leaderSn, // Map leaderSn to leaderId prop
      reviewerId: hcLeaderPerformance.reviewerSn, // Map reviewerSn to reviewerId prop
      period: hcLeaderPerformance.period,
      surveyScore: hcLeaderPerformance.surveyScore,
      responseTimeScore: hcLeaderPerformance.responseTimeScore,
      leadershipScore: hcLeaderPerformance.leadershipScore,
      overallScore: hcLeaderPerformance.overallScore,
      feedback: hcLeaderPerformance.feedback,
      status: hcLeaderPerformance.status,
      createdAt: hcLeaderPerformance.createdAt,
      leaderName: leader.name,
      leaderEmail: leader.email,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
    })
    .from(hcLeaderPerformance)
    .leftJoin(leader, eq(hcLeaderPerformance.leaderSn, leader.employeeSn))
    .leftJoin(reviewer, eq(hcLeaderPerformance.reviewerSn, reviewer.employeeSn))
    .orderBy(desc(hcLeaderPerformance.createdAt));
}

export async function getLeaderPerformanceStats() {
  const [result] = await db
    .select({
      totalReviews: count(hcLeaderPerformance.id),
      avgSurvey: avg(hcLeaderPerformance.surveyScore),
      avgResponseTime: avg(hcLeaderPerformance.responseTimeScore),
      avgLeadership: avg(hcLeaderPerformance.leadershipScore),
    })
    .from(hcLeaderPerformance);

  return {
    totalReviews: result?.totalReviews ?? 0,
    avgSurvey: result?.avgSurvey ? Number(result.avgSurvey) : 0,
    avgResponseTime: result?.avgResponseTime ? Number(result.avgResponseTime) : 0,
    avgLeadership: result?.avgLeadership ? Number(result.avgLeadership) : 0,
  };
}

export async function getLeadersForReviewer(reviewerEmail: string, limitToSection = false) {
  // 1. Get reviewer credentials, access role, section, workLocation, directManagerId, sectionId
  const [reviewerEmp] = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
      section: employees.section,
      sectionId: employees.sectionId,
      workLocation: employees.workLocation,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .where(eq(sql`lower(${employees.email})`, reviewerEmail.toLowerCase()))
    .limit(1);

  console.log(`[getLeadersForReviewer] reviewerEmail: ${reviewerEmail}, limitToSection: ${limitToSection}`);
  console.log(`[getLeadersForReviewer] resolved reviewerEmp:`, reviewerEmp);

  // 2. Fetch all active unified employees with jobTitle as positionName
  const allEmployeesRaw = await db
    .select({
      id: employees.employeeSn, // Map employeeSn to id prop for client page mapping
      fullName: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      departmentName: employees.department,
      positionName: employees.jobTitle,
      directManagerId: employees.directManagerId,
      section: employees.section,
      workLocation: employees.workLocation,
      empId: employees.id, // Keep the numeric database id for section head checks
    })
    .from(employees)
    .where(eq(employees.isActive, true));

  // 3. Fetch all active section head mappings from masterSections
  const sectionsWithHead = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
      headEmployeeId: masterSections.headEmployeeId,
    })
    .from(masterSections)
    .where(sql`${masterSections.headEmployeeId} IS NOT NULL`);

  const sectionHeadEmployeeIds = new Set(
    sectionsWithHead
      .map((s) => s.headEmployeeId)
      .filter((id): id is number => id !== null)
  );

  // Filter active employees list to only those who are designated as Section Heads in masterSections
  const allSectionHeads = allEmployeesRaw.filter((emp) => {
    return emp.empId !== null && sectionHeadEmployeeIds.has(emp.empId);
  });

  // 4. Super Admin & HC Manager can evaluate any Section Head (unless limitToSection is true)
  if (
    !limitToSection &&
    (reviewerEmp?.accessRole === "Super Admin" ||
     reviewerEmp?.accessRole === "HC Manager")
  ) {
    console.log(`[getLeadersForReviewer] returning allSectionHeads count: ${allSectionHeads.length}`);
    return allSectionHeads;
  }

  // 5. For regular employees, look up the Section Head of their section in masterSections
  let reviewerSectionHeadEmpId: number | null = null;
  if (reviewerEmp) {
    const reviewerSectionId = reviewerEmp.sectionId;
    const reviewerSectionName = (reviewerEmp.section || "").trim().toLowerCase();

    // Try finding by section ID first
    let match = reviewerSectionId
      ? sectionsWithHead.find((s) => s.id === reviewerSectionId)
      : null;

    // Fallback to name match if ID didn't resolve
    if (!match && reviewerSectionName) {
      match = sectionsWithHead.find(
        (s) => s.name.trim().toLowerCase() === reviewerSectionName
      );
    }

    if (match) {
      reviewerSectionHeadEmpId = match.headEmployeeId;
    }
  }

  let sectionLeaders: typeof allEmployeesRaw = [];
  if (reviewerSectionHeadEmpId) {
    const matchedLeader = allEmployeesRaw.find(
      (emp) => emp.empId === reviewerSectionHeadEmpId && emp.email?.toLowerCase() !== reviewerEmail.toLowerCase()
    );
    if (matchedLeader) {
      sectionLeaders = [matchedLeader];
    }
  }

  // 6. Fallback: If no Section Head in their section, include direct manager
  if (sectionLeaders.length === 0 && reviewerEmp?.directManagerId) {
    const managerEmp = allEmployeesRaw.find(
      (emp) => emp.empId === reviewerEmp.directManagerId && emp.email !== reviewerEmail
    );
    if (managerEmp) {
      sectionLeaders = [managerEmp];
    }
  }

  return sectionLeaders;
}

export async function getActiveEmployees() {
  return db
    .select({
      id: employees.employeeSn, // Map employeeSn to id prop
      employeeId: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(employees.name);
}

async function sendLeaderPerformanceNotifications(id: number) {
  try {
    const leader = aliasedTable(employees, "leader");
    const reviewer = aliasedTable(employees, "reviewer");

    const [review] = await db
      .select({
        id: hcLeaderPerformance.id,
        leaderId: hcLeaderPerformance.leaderSn,
        reviewerId: hcLeaderPerformance.reviewerSn,
        period: hcLeaderPerformance.period,
        overallScore: hcLeaderPerformance.overallScore,
        feedback: hcLeaderPerformance.feedback,
        status: hcLeaderPerformance.status,
        leaderName: leader.name,
        leaderEmail: leader.email,
        reviewerName: reviewer.name,
        reviewerEmail: reviewer.email,
      })
      .from(hcLeaderPerformance)
      .leftJoin(leader, eq(hcLeaderPerformance.leaderSn, leader.employeeSn))
      .leftJoin(reviewer, eq(hcLeaderPerformance.reviewerSn, reviewer.employeeSn))
      .where(eq(hcLeaderPerformance.id, id))
      .limit(1);

    if (!review) return;

    if (review.status === "submitted") {
      // 1. Notify via Bell
      await notifyWorkflowBellRecipients({
        recipientEmails: [review.leaderEmail, review.reviewerEmail],
        eventType: "hc_leader_performance_submitted",
        category: "info",
        title: "Evaluasi Leader Performance Disubmit",
        body: `Evaluasi pimpinan untuk ${review.leaderName} (${review.period}) telah disubmit dengan skor rata-rata ${review.overallScore}.`,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email
      const title = `Evaluasi Leader Performance disubmit: ${review.leaderName}`;
      const intro = `Evaluasi Leader Performance untuk pimpinan ${review.leaderName} pada periode ${review.period} telah disubmit oleh penilai ${review.reviewerName || "N/A"} dengan nilai rata-rata ${review.overallScore}.`;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          `Leader: ${review.leaderName}`,
          `Penilai: ${review.reviewerName || "N/A"}`,
          `Periode: ${review.period}`,
          `Skor Rata-rata: ${review.overallScore}`,
          `Masukan: ${review.feedback || "-"}`,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/hc/leader-performance`,
      });

      await sendHumanCapitalEmail({
        templateCode: "hc_leader_performance_submitted",
        templateName: "HC Leader Performance Submitted",
        fallbackSubject: title,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
        actorEmail: review.reviewerEmail,
        variables: {
          leaderName: review.leaderName || "",
          reviewerName: review.reviewerName || "",
          period: review.period || "",
          overallScore: review.overallScore || "",
        },
        extraTo: review.leaderEmail,
      });
    } else if (review.status === "reviewed") {
      // 1. Notify via Bell
      await notifyWorkflowBellRecipients({
        recipientEmails: [review.leaderEmail, review.reviewerEmail],
        eventType: "hc_leader_performance_reviewed",
        category: "info",
        title: "Evaluasi Leader Performance Ditinjau",
        body: `Evaluasi pimpinan untuk ${review.leaderName} (${review.period}) telah selesai ditinjau.`,
        url: "/dashboard/hc/leader-performance",
      });

      // 2. Notify via Email
      const title = `Evaluasi Leader Performance selesai ditinjau: ${review.leaderName}`;
      const intro = `Evaluasi Leader Performance untuk pimpinan ${review.leaderName} pada periode ${review.period} telah selesai ditinjau oleh HC / Admin.`;
      const emailContent = buildHumanCapitalEmail({
        title,
        intro,
        details: [
          `Leader: ${review.leaderName}`,
          `Penilai: ${review.reviewerName || "N/A"}`,
          `Periode: ${review.period}`,
          `Status: Reviewed`,
        ],
        ctaLabel: "Lihat Evaluasi",
        ctaUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/hc/leader-performance`,
      });

      await sendHumanCapitalEmail({
        templateCode: "hc_leader_performance_reviewed",
        templateName: "HC Leader Performance Reviewed",
        fallbackSubject: title,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
        actorEmail: review.reviewerEmail,
        variables: {
          leaderName: review.leaderName || "",
          reviewerName: review.reviewerName || "",
          period: review.period || "",
        },
        extraTo: review.leaderEmail,
      });
    }
  } catch (error) {
    console.error("Failed to send leader performance notifications", error);
  }
}

function isPjoSurveyApplicable(location: string | null, department: string | null): boolean {
  const loc = (location || "").trim().toLowerCase();
  const dept = (department || "").trim().toLowerCase();
  if (loc.includes("balikpapan") || loc.includes("jakarta")) {
    return false;
  }
  return dept.includes("central service") || dept.includes("central services");
}

export async function createLeaderPerformanceReview(data: LeaderPerformanceReviewData) {
  // Fetch leader details directly from employees table using employeeSn
  const [leaderEmp] = await db
    .select({
      departmentName: employees.department,
      workLocation: employees.workLocation,
    })
    .from(employees)
    .where(eq(employees.employeeSn, data.leaderId))
    .limit(1);

  const loc = leaderEmp?.workLocation || "";
  const dept = leaderEmp?.departmentName || "";
  const isApplicable = isPjoSurveyApplicable(loc, dept);

  const survey = isApplicable ? Number(data.surveyScore) : 0;
  const responseTime = Number(data.responseTimeScore);
  const leadership = Number(data.leadershipScore);
  const overall = isApplicable
    ? ((survey + responseTime + leadership) / 3).toFixed(2)
    : ((responseTime + leadership) / 2).toFixed(2);

  const [created] = await db
    .insert(hcLeaderPerformance)
    .values({
      leaderSn: data.leaderId,
      reviewerSn: data.reviewerId ?? null,
      period: data.period,
      surveyScore: survey,
      responseTimeScore: responseTime,
      leadershipScore: leadership,
      overallScore: overall,
      feedback: data.feedback ?? "",
      status: data.status ?? "draft",
    })
    .returning();

  revalidatePath(LEADER_PERFORMANCE_PATH);

  // Fire-and-forget notifications — never block or throw to client
  if (created.status === "submitted") {
    sendLeaderPerformanceNotifications(created.id).catch((err) =>
      console.error("[leader-performance] notification error after create:", err)
    );
  }

  return created;
}

export async function updateLeaderPerformanceReview(
  id: number,
  data: Partial<LeaderPerformanceReviewData>
) {
  const payload: Record<string, unknown> = { updatedAt: new Date() };
  if (data.leaderId !== undefined) payload.leaderSn = data.leaderId;
  if (data.reviewerId !== undefined) payload.reviewerSn = data.reviewerId;
  if (data.period !== undefined) payload.period = data.period;
  if (data.feedback !== undefined) payload.feedback = data.feedback;
  if (data.status !== undefined) payload.status = data.status;

  if (
    data.surveyScore !== undefined ||
    data.responseTimeScore !== undefined ||
    data.leadershipScore !== undefined ||
    data.leaderId !== undefined
  ) {
    const [current] = await db
      .select()
      .from(hcLeaderPerformance)
      .where(eq(hcLeaderPerformance.id, id))
      .limit(1);

    if (current) {
      const activeLeaderSn = data.leaderId ?? current.leaderSn;

      const [leaderEmp] = await db
        .select({
          departmentName: employees.department,
          workLocation: employees.workLocation,
        })
        .from(employees)
        .where(eq(employees.employeeSn, activeLeaderSn))
        .limit(1);

      const loc = leaderEmp?.workLocation || "";
      const dept = leaderEmp?.departmentName || "";
      const isApplicable = isPjoSurveyApplicable(loc, dept);

      const survey = isApplicable ? Number(data.surveyScore ?? current.surveyScore) : 0;
      const responseTime = Number(
        data.responseTimeScore ?? current.responseTimeScore
      );
      const leadership = Number(
        data.leadershipScore ?? current.leadershipScore
      );
      const overall = isApplicable
        ? ((survey + responseTime + leadership) / 3).toFixed(2)
        : ((responseTime + leadership) / 2).toFixed(2);

      payload.surveyScore = survey;
      payload.responseTimeScore = responseTime;
      payload.leadershipScore = leadership;
      payload.overallScore = overall;
    }
  }

  const [updated] = await db
    .update(hcLeaderPerformance)
    .set(payload)
    .where(eq(hcLeaderPerformance.id, id))
    .returning();

  revalidatePath(LEADER_PERFORMANCE_PATH);

  // Fire-and-forget notifications
  if (updated.status === "submitted" && data.status === "submitted") {
    sendLeaderPerformanceNotifications(updated.id).catch((err) =>
      console.error("[leader-performance] notification error after update:", err)
    );
  } else if (updated.status === "reviewed" && data.status === "reviewed") {
    sendLeaderPerformanceNotifications(updated.id).catch((err) =>
      console.error("[leader-performance] notification error after review:", err)
    );
  }

  return updated;
}

export async function deleteLeaderPerformanceReview(id: number) {
  await db.delete(hcLeaderPerformance).where(eq(hcLeaderPerformance.id, id));
  revalidatePath(LEADER_PERFORMANCE_PATH);
  return { success: true };
}

export async function submitLeaderPerformanceReview(id: number) {
  const [updated] = await db
    .update(hcLeaderPerformance)
    .set({
      status: "submitted",
      updatedAt: new Date(),
    })
    .where(eq(hcLeaderPerformance.id, id))
    .returning();

  revalidatePath(LEADER_PERFORMANCE_PATH);

  sendLeaderPerformanceNotifications(id).catch((err) =>
    console.error("[leader-performance] notification error after submit:", err)
  );

  return updated;
}

export async function acknowledgeLeaderPerformanceReview(id: number) {
  const [updated] = await db
    .update(hcLeaderPerformance)
    .set({
      status: "reviewed",
      updatedAt: new Date(),
    })
    .where(eq(hcLeaderPerformance.id, id))
    .returning();

  revalidatePath(LEADER_PERFORMANCE_PATH);

  sendLeaderPerformanceNotifications(id).catch((err) =>
    console.error("[leader-performance] notification error after acknowledge:", err)
  );

  return updated;
}
