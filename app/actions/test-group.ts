"use server";

import { db } from "@/db";
import { hcCandidates, hcOnlineTestAssignments, hcOnlineTestGroupItems, hcOnlineTests, hcOnlineTestGroups } from "@/db/schema/hero";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export async function registerTestGroup(groupId: number) {
  try {
    // 1. Create anonymous candidate
    const publicIdentity = randomUUID();
    const [candidate] = await db.insert(hcCandidates).values({
      fullName: `Peserta Test Group ${publicIdentity.slice(0, 8)}`,
      email: `group-${publicIdentity}@test.local`,
      phone: "",
      source: "Test Group Link",
      currentStage: "Psikotes"
    }).returning();

    // 2. Fetch all tests in this group
    const groupItems = await db.select({
      testId: hcOnlineTestGroupItems.testId,
      sortOrder: hcOnlineTestGroupItems.sortOrder,
      timeLimitMinutes: hcOnlineTests.timeLimitMinutes,
    })
    .from(hcOnlineTestGroupItems)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(hcOnlineTestGroupItems.sortOrder);

    if (groupItems.length === 0) {
      return { success: false, error: "Test Group tidak memiliki tes." };
    }

    // 3. Create assignments if they don't exist
    // We check if the candidate already has an active or pending assignment for these tests in this group.
    // To simplify, we just check by testId and candidateId. If they want to retake, it might be an issue.
    // For now, let's create new assignments for tests they haven't completed, or just create new ones anyway.
    // It's safer to reuse "Pending" or "In Progress" assignments, and create new ones if none exist.
    
    let firstIncompleteAssignmentKey = null;

    for (const item of groupItems) {
      const assignments = await db.select()
        .from(hcOnlineTestAssignments)
        .where(and(
          eq(hcOnlineTestAssignments.testId, item.testId),
          eq(hcOnlineTestAssignments.candidateId, candidate.id)
        ))
        .orderBy(desc(hcOnlineTestAssignments.createdAt))
        .limit(1);
      let assignment = assignments[0];

      if (!assignment || assignment.status === "Expired") {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // valid for 7 days

        const [newAssignment] = await db.insert(hcOnlineTestAssignments).values({
          testId: item.testId,
          candidateId: candidate.id,
          accessKey: randomUUID(),
          expiresAt,
          status: "Pending"
        }).returning();
        assignment = newAssignment;
      }

      if (assignment.status !== "Completed" && !firstIncompleteAssignmentKey) {
        firstIncompleteAssignmentKey = assignment.accessKey;
      }
    }

    // 4. Return the redirect URL to the first incomplete test
    // We append ?groupId=... so the client page knows it's part of a flow.
    if (firstIncompleteAssignmentKey) {
      return { success: true, redirectUrl: `/test/${firstIncompleteAssignmentKey}?groupId=${groupId}` };
    } else {
      return { success: false, error: "Anda telah menyelesaikan seluruh rangkaian tes ini." };
    }

  } catch (error: any) {
    console.error("registerTestGroup error:", error);
    return { success: false, error: error.message || "Gagal memproses pendaftaran tes." };
  }
}

// Function to get the next test in the group
export async function getNextTestInGroup(groupId: number, currentTestId: number, candidateId: number) {
  try {
    const groupItems = await db.select({
      testId: hcOnlineTestGroupItems.testId,
      sortOrder: hcOnlineTestGroupItems.sortOrder,
    })
    .from(hcOnlineTestGroupItems)
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(hcOnlineTestGroupItems.sortOrder);

    const currentIndex = groupItems.findIndex(i => i.testId === currentTestId);
    if (currentIndex === -1 || currentIndex === groupItems.length - 1) {
      return { hasNext: false };
    }

    // Find the next assignment for the candidate
    for (let i = currentIndex + 1; i < groupItems.length; i++) {
      const nextTestId = groupItems[i].testId;
      const assignments = await db.select()
        .from(hcOnlineTestAssignments)
        .where(and(
          eq(hcOnlineTestAssignments.testId, nextTestId),
          eq(hcOnlineTestAssignments.candidateId, candidateId)
        ))
        .orderBy(desc(hcOnlineTestAssignments.createdAt))
        .limit(1);
      const assignment = assignments[0];

      if (assignment && assignment.status !== "Completed") {
        return { hasNext: true, nextAccessKey: assignment.accessKey };
      }
    }

    return { hasNext: false };
  } catch (error) {
    console.error("getNextTestInGroup error:", error);
    return { hasNext: false };
  }
}

import { inArray } from "drizzle-orm";

export async function getAllTestGroups() {
  return db.select().from(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.isActive, true)).orderBy(hcOnlineTestGroups.name);
}

export async function getAllTestGroupsAdmin() {
  return db.select().from(hcOnlineTestGroups).orderBy(hcOnlineTestGroups.name);
}

export async function createTestGroup(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [group] = await db.insert(hcOnlineTestGroups).values({ name, slug, description: "" }).returning();
  revalidatePath("/dashboard/hc/recruitment/test-groups");
  return group;
}

export async function updateTestGroup(id: number, data: { name?: string; isActive?: boolean }) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  const [group] = await db.update(hcOnlineTestGroups).set(updateData).where(eq(hcOnlineTestGroups.id, id)).returning();
  revalidatePath("/dashboard/hc/recruitment/test-groups");
  return group;
}

export async function deleteTestGroup(id: number) {
  await db.delete(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.id, id));
  revalidatePath("/dashboard/hc/recruitment/test-groups");
  return { success: true };
}

export async function addTestToGroup(groupId: number, testId: number) {
  const max = await db.select({ sortOrder: hcOnlineTestGroupItems.sortOrder })
    .from(hcOnlineTestGroupItems)
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(desc(hcOnlineTestGroupItems.sortOrder))
    .limit(1);
  const sortOrder = max.length > 0 ? max[0].sortOrder + 1 : 0;
  await db.insert(hcOnlineTestGroupItems).values({ groupId, testId, sortOrder });
  revalidatePath("/dashboard/hc/recruitment/test-groups");
}

export async function removeTestFromGroup(groupItemId: number) {
  await db.delete(hcOnlineTestGroupItems).where(eq(hcOnlineTestGroupItems.id, groupItemId));
  revalidatePath("/dashboard/hc/recruitment/test-groups");
}

export async function getGroupWithTests(groupId: number) {
  const [group] = await db.select().from(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.id, groupId)).limit(1);
  if (!group) return null;
  const items = await db.select({
    id: hcOnlineTestGroupItems.id,
    testId: hcOnlineTests.id,
    testTitle: hcOnlineTests.title,
    sortOrder: hcOnlineTestGroupItems.sortOrder,
  }).from(hcOnlineTestGroupItems)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(hcOnlineTestGroupItems.sortOrder);
  return { group, items };
}

export async function getTestGroupEntries(slug: string) {
  // 1. Get the group
  const groups = await db.select().from(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.slug, slug)).limit(1);
  const group = groups[0];
  if (!group) return null;

  // 2. Get tests in this group
  const groupItems = await db.select({
    testId: hcOnlineTestGroupItems.testId,
    sortOrder: hcOnlineTestGroupItems.sortOrder,
    title: hcOnlineTests.title,
    isApplicationForm: hcOnlineTests.isApplicationForm,
  })
  .from(hcOnlineTestGroupItems)
  .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
  .where(eq(hcOnlineTestGroupItems.groupId, group.id))
  .orderBy(hcOnlineTestGroupItems.sortOrder);

  if (groupItems.length === 0) return { group, entries: [], testHeaders: [] };

  const testIds = groupItems.map(i => i.testId);

  // 3. Get all assignments for these tests
  const assignments = await db.select({
    id: hcOnlineTestAssignments.id,
    testId: hcOnlineTestAssignments.testId,
    status: hcOnlineTestAssignments.status,
    score: hcOnlineTestAssignments.score,
    candidateId: hcOnlineTestAssignments.candidateId,
    candidateName: hcCandidates.fullName,
    candidateEmail: hcCandidates.email,
    candidatePhone: hcCandidates.phone,
  })
  .from(hcOnlineTestAssignments)
  .innerJoin(hcCandidates, eq(hcOnlineTestAssignments.candidateId, hcCandidates.id))
  .where(inArray(hcOnlineTestAssignments.testId, testIds));

  // 4. Group by candidate
  const candidateMap = new Map<number, any>();

  for (const a of assignments) {
    if (!candidateMap.has(a.candidateId)) {
      candidateMap.set(a.candidateId, {
        candidateId: a.candidateId,
        fullName: a.candidateName,
        email: a.candidateEmail,
        phone: a.candidatePhone,
        totalScore: 0,
        testsCompleted: 0,
        tests: {},
      });
    }

    const c = candidateMap.get(a.candidateId);
    
    // We only keep the best/latest assignment if there are duplicates.
    if (!c.tests[a.testId] || c.tests[a.testId].status !== "Completed") {
      c.tests[a.testId] = {
        id: a.id,
        status: a.status,
        score: a.score || 0,
      };
    }
  }

  // Calculate totals
  const entries = Array.from(candidateMap.values()).map(c => {
    let totalScore = 0;
    let completed = 0;
    
    for (const testId of testIds) {
      if (c.tests[testId]) {
        if (c.tests[testId].status === "Completed" || c.tests[testId].status === "Graded") {
          completed++;
        }
        totalScore += c.tests[testId].score || 0;
      }
    }
    
    return {
      ...c,
      totalScore,
      testsCompleted: completed,
      progressText: `${completed} / ${testIds.length}`,
    };
  });

  return {
    group,
    testHeaders: groupItems,
    entries: entries.sort((a, b) => b.totalScore - a.totalScore) // sort by highest score
  };
}

export async function deleteTestGroupCandidate(groupId: number, candidateId: number) {
  try {
    const groupItems = await db.select({ testId: hcOnlineTestGroupItems.testId })
      .from(hcOnlineTestGroupItems)
      .where(eq(hcOnlineTestGroupItems.groupId, groupId));
      
    if (groupItems.length === 0) return { success: true };
    
    const testIds = groupItems.map(i => i.testId);
    
    await db.delete(hcOnlineTestAssignments)
      .where(and(
        eq(hcOnlineTestAssignments.candidateId, candidateId),
        inArray(hcOnlineTestAssignments.testId, testIds)
      ));
      
    revalidatePath("/dashboard/hc/recruitment/test-groups");
    return { success: true };
  } catch (error: any) {
    console.error("deleteTestGroupCandidate error:", error);
    return { success: false, error: "Failed to delete candidate results." };
  }
}

export async function bulkAssignTestGroupToCandidates(groupId: number, candidateIds: number[], scheduledAt?: Date | null) {
  const groupItems = await db
    .select({ testId: hcOnlineTestGroupItems.testId, sortOrder: hcOnlineTestGroupItems.sortOrder, title: hcOnlineTests.title })
    .from(hcOnlineTestGroupItems)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(hcOnlineTestGroupItems.sortOrder);

  if (groupItems.length === 0) return { results: [] };

  const [group] = await db.select().from(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.id, groupId)).limit(1);
  const candidates = await db
    .select({ id: hcCandidates.id, fullName: hcCandidates.fullName, email: hcCandidates.email })
    .from(hcCandidates)
    .where(inArray(hcCandidates.id, candidateIds));

  const { getEmailSmtpSettingsData } = await import("@/lib/hero-admin");
  const { sendEmailViaSmtp } = await import("@/lib/email-delivery");
  const { getHcEmailTemplateByType } = await import("@/app/actions/hc-email-templates");
  const { renderHcTemplate } = await import("@/lib/hc-email-utils");
  const { ensureScheduledAtColumn } = await import("@/app/actions/recruitment-tests");
  
  await ensureScheduledAtColumn();
  const smtpSettings = await getEmailSmtpSettingsData();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { format } = await import("date-fns");
  const template = await getHcEmailTemplateByType("test_assigned");

  const results: Array<{ candidateId: number; success: boolean; error?: string }> = [];

  for (const candidate of candidates) {
    try {
      const testLinks: string[] = [];
      for (const item of groupItems) {
        const accessKey = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.insert(hcOnlineTestAssignments).values({
          testId: item.testId,
          candidateId: candidate.id,
          accessKey,
          expiresAt,
          scheduledAt: scheduledAt || null,
          status: "Pending",
        });

        testLinks.push(`${baseUrl}/test/${accessKey}?groupId=${groupId}`);
      }

      if (candidate.email && smtpSettings.host && smtpSettings.fromEmail) {
        const firstLink = testLinks[0];
        const linksHtml = testLinks.map((link, i) => `<li><a href="${link}" target="_blank">${groupItems[i]?.title || `Tes ${i + 1}`}</a></li>`).join("");
        const scheduledDate = scheduledAt ? format(scheduledAt, "dd MMMM yyyy") : "";
        const scheduledTime = scheduledAt ? format(scheduledAt, "HH:mm") : "";

        const templateVars = {
          candidateName: candidate.fullName,
          jobTitle: group?.name || "Online Test",
          companyName: "PT Chitra Paratama",
          date: scheduledDate,
          time: scheduledTime,
          location: scheduledDate ? `Online - dapat diakses mulai ${scheduledDate} ${scheduledTime}` : "Online",
          interviewer: "",
          duration: "7",
          testLink: firstLink,
        };

        let subject: string, html: string, text: string;
        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.body;
          text = rendered.body.replace(/<[^>]*>/g, "");
        } else {
          subject = `[HERO] Online Test - ${group?.name || "Assessment"}`;
          html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px">
  <h2 style="color:#0f172a;">Online Test Assignment</h2>
  <p>Dear <strong>${candidate.fullName}</strong>,</p>
  <p>You have been assigned the <strong>${group?.name || "Assessment"}</strong> test.</p>
  ${scheduledDate ? `<p style="color:#92400e;">Akses mulai: <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>` : ""}
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;">
    <p style="font-weight:600;margin-bottom:8px;">Tes yang harus dikerjakan:</p>
    <ol style="text-align:left;">${linksHtml}</ol>
  </div>
  <p style="font-size:13px;color:#64748b;">Link berlaku 7 hari.</p>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;
          text = `Dear ${candidate.fullName},\n\nTest: ${group?.name}\n\nLinks:\n${testLinks.join("\n")}\n\nBest regards,\nHuman Capital Team`;
        }

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          subject,
          html,
          text,
          templateName: "Test Group Assigned",
          templateCode: "test_assigned",
        });
      }
      results.push({ candidateId: candidate.id, success: true });
    } catch (error: any) {
      results.push({ candidateId: candidate.id, success: false, error: error.message });
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  return { results };
}

export async function previewTestGroupEmail(groupId: number, scheduledAt?: Date | null) {
  const groupItems = await db
    .select({ title: hcOnlineTests.title })
    .from(hcOnlineTestGroupItems)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
    .where(eq(hcOnlineTestGroupItems.groupId, groupId))
    .orderBy(hcOnlineTestGroupItems.sortOrder);

  const [group] = await db.select().from(hcOnlineTestGroups).where(eq(hcOnlineTestGroups.id, groupId)).limit(1);
  if (!group) return { subject: "", html: "" };

  const { getHcEmailTemplateByType } = await import("@/app/actions/hc-email-templates");
  const { renderHcTemplate } = await import("@/lib/hc-email-utils");
  const { format } = await import("date-fns");

  const scheduledDate = scheduledAt ? format(scheduledAt, "dd MMMM yyyy") : "";
  const scheduledTime = scheduledAt ? format(scheduledAt, "HH:mm") : "";
  const linksHtml = groupItems.map((item, i) => `<li>${item.title}</li>`).join("");

  const template = await getHcEmailTemplateByType("test_assigned");
  const templateVars = {
    candidateName: "[Candidate Name]",
    jobTitle: group.name,
    companyName: "PT Chitra Paratama",
    date: scheduledDate,
    time: scheduledTime,
    location: scheduledDate ? `Online - dapat diakses mulai ${scheduledDate} ${scheduledTime}` : "Online",
    interviewer: "",
    duration: "7",
    testLink: "[Unique Link]",
  };

  let subject: string, html: string;
  if (template) {
    const rendered = renderHcTemplate(template, templateVars);
    subject = rendered.subject;
    html = rendered.body;
    if (scheduledDate) {
      html = `<div style="font-family:Arial,sans-serif;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>Jadwal:</strong> Tes hanya dapat diakses mulai <strong>${scheduledDate}</strong> pukul <strong>${scheduledTime}</strong>.
</div>` + html;
    }
  } else {
    subject = `[HERO] Online Test - ${group.name}`;
    html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px">
  <h2 style="color:#0f172a;">Online Test Assignment</h2>
  <p>Dear <strong>[Candidate Name]</strong>,</p>
  <p>You have been assigned the <strong>${group.name}</strong> test.</p>
  ${scheduledDate ? `<p style="color:#92400e;">Akses mulai: <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>` : ""}
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;">
    <p style="font-weight:600;margin-bottom:8px;">Tes yang harus dikerjakan:</p>
    <ol style="text-align:left;">${linksHtml}</ol>
  </div>
  <p style="font-size:13px;color:#64748b;">Link berlaku 7 hari.</p>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;
  }

  return { subject, html };
}

