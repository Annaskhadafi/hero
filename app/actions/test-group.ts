"use server";

import { db } from "@/db";
import { hcCandidates, hcOnlineTestAssignments, hcOnlineTestGroupItems, hcOnlineTests, hcOnlineTestGroups } from "@/db/schema/hero";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export async function registerTestGroup(groupId: number, data: { fullName: string; phone: string; email: string }) {
  try {
    // 1. Find or create candidate
    const candidates = await db.select()
      .from(hcCandidates)
      .where(and(
        eq(hcCandidates.fullName, data.fullName),
        eq(hcCandidates.phone, data.phone)
      ))
      .orderBy(desc(hcCandidates.createdAt))
      .limit(1);
    let candidate = candidates[0];

    if (!candidate) {
      const [newCandidate] = await db.insert(hcCandidates).values({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || "",
        source: "Test Group Link"
      }).returning();
      candidate = newCandidate;
    } else if (data.email && !candidate.email) {
      // update email if provided
      await db.update(hcCandidates).set({ email: data.email }).where(eq(hcCandidates.id, candidate.id));
    }

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

