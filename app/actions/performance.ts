"use server";

import { db } from "@/db";
import {
  hcPerformanceCycles,
  hcPerformanceKpis,
  hcPerformanceReviews,
  hrEmployees,
} from "@/db/schema/hero";
import { aliasedTable } from "drizzle-orm/alias";
import { and, avg, count, desc, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const PERFORMANCE_PATH = "/dashboard/hc/performance";

export type PerformanceCycleData = {
  name: string;
  cycleType: string;
  year: number;
  periodStart: string;
  periodEnd: string;
  status?: string;
  isActive?: boolean;
};

export type PerformanceReviewFilter = {
  status?: string;
  cycleId?: number;
  employeeId?: number;
  reviewerId?: number;
};

export type PerformanceKpiData = {
  sortOrder?: number;
  kpiName: string;
  kpiDescription?: string;
  targetValue?: string;
  actualValue?: string;
  weight?: number;
  score?: number | string | null;
  comments?: string;
};

export type PerformanceReviewData = {
  cycleId: number;
  employeeId: number;
  reviewerId?: number | null;
  overallScore?: number | string | null;
  overallRating?: string;
  strengths?: string;
  improvements?: string;
  comments?: string;
  employeeComments?: string;
  status?: string;
  kpis?: PerformanceKpiData[];
};

function toDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");
  return date.toISOString().slice(0, 10);
}

function toDecimal(value?: number | string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return Number(value).toFixed(2);
}

function revalidatePerformance(): void {
  revalidatePath(PERFORMANCE_PATH);
}

function reviewConditions(filters?: PerformanceReviewFilter) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(hcPerformanceReviews.status, filters.status));
  if (filters?.cycleId) conditions.push(eq(hcPerformanceReviews.cycleId, filters.cycleId));
  if (filters?.employeeId) conditions.push(eq(hcPerformanceReviews.employeeId, filters.employeeId));
  if (filters?.reviewerId) conditions.push(eq(hcPerformanceReviews.reviewerId, filters.reviewerId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function kpiPayload(reviewId: number, data: PerformanceKpiData) {
  return {
    reviewId,
    sortOrder: data.sortOrder ?? 0,
    kpiName: data.kpiName,
    kpiDescription: data.kpiDescription ?? "",
    targetValue: data.targetValue ?? "",
    actualValue: data.actualValue ?? "",
    weight: data.weight ?? 0,
    score: toDecimal(data.score) ?? null,
    comments: data.comments ?? "",
  };
}

export async function getPerformanceCycles() {
  return await db
    .select()
    .from(hcPerformanceCycles)
    .orderBy(desc(hcPerformanceCycles.year), desc(hcPerformanceCycles.createdAt));
}

export async function createPerformanceCycle(data: PerformanceCycleData) {
  const [created] = await db.insert(hcPerformanceCycles).values({
    name: data.name,
    cycleType: data.cycleType,
    year: data.year,
    periodStart: toDate(data.periodStart),
    periodEnd: toDate(data.periodEnd),
    status: data.status ?? "draft",
    isActive: data.isActive ?? true,
  }).returning();
  revalidatePerformance();
  return created;
}

export async function updatePerformanceCycle(id: number, data: Partial<PerformanceCycleData>) {
  const payload: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) payload.name = data.name;
  if (data.cycleType !== undefined) payload.cycleType = data.cycleType;
  if (data.year !== undefined) payload.year = data.year;
  if (data.periodStart !== undefined) payload.periodStart = toDate(data.periodStart);
  if (data.periodEnd !== undefined) payload.periodEnd = toDate(data.periodEnd);
  if (data.status !== undefined) payload.status = data.status;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  const [updated] = await db.update(hcPerformanceCycles).set(payload).where(eq(hcPerformanceCycles.id, id)).returning();
  revalidatePerformance();
  return updated;
}

export async function deletePerformanceCycle(id: number) {
  await db.delete(hcPerformanceCycles).where(eq(hcPerformanceCycles.id, id));
  revalidatePerformance();
  return { success: true };
}

export async function getPerformanceReviews(filters?: PerformanceReviewFilter) {
  const reviewer = aliasedTable(hrEmployees, "reviewer");
  return await db
    .select({
      id: hcPerformanceReviews.id,
      cycleId: hcPerformanceReviews.cycleId,
      employeeId: hcPerformanceReviews.employeeId,
      reviewerId: hcPerformanceReviews.reviewerId,
      employeeName: hrEmployees.fullName,
      employeeCode: hrEmployees.employeeId,
      reviewerName: reviewer.fullName,
      cycleName: hcPerformanceCycles.name,
      cycleType: hcPerformanceCycles.cycleType,
      cycleYear: hcPerformanceCycles.year,
      overallScore: hcPerformanceReviews.overallScore,
      overallRating: hcPerformanceReviews.overallRating,
      strengths: hcPerformanceReviews.strengths,
      improvements: hcPerformanceReviews.improvements,
      comments: hcPerformanceReviews.comments,
      employeeComments: hcPerformanceReviews.employeeComments,
      status: hcPerformanceReviews.status,
      submittedAt: hcPerformanceReviews.submittedAt,
      reviewedAt: hcPerformanceReviews.reviewedAt,
      acknowledgedAt: hcPerformanceReviews.acknowledgedAt,
      createdAt: hcPerformanceReviews.createdAt,
    })
    .from(hcPerformanceReviews)
    .leftJoin(hrEmployees, eq(hcPerformanceReviews.employeeId, hrEmployees.id))
    .leftJoin(reviewer, eq(hcPerformanceReviews.reviewerId, reviewer.id))
    .leftJoin(hcPerformanceCycles, eq(hcPerformanceReviews.cycleId, hcPerformanceCycles.id))
    .where(reviewConditions(filters))
    .orderBy(desc(hcPerformanceReviews.createdAt));
}

export async function getPerformanceReviewById(id: number) {
  const rows = await getPerformanceReviews({});
  const review = rows.find((row) => row.id === id);
  if (!review) return null;
  const kpis = await db.select().from(hcPerformanceKpis).where(eq(hcPerformanceKpis.reviewId, id)).orderBy(hcPerformanceKpis.sortOrder);
  return { ...review, kpis };
}

export async function createPerformanceReview(data: PerformanceReviewData) {
  const [created] = await db.insert(hcPerformanceReviews).values({
    cycleId: data.cycleId,
    employeeId: data.employeeId,
    reviewerId: data.reviewerId ?? null,
    overallScore: toDecimal(data.overallScore) ?? null,
    overallRating: data.overallRating ?? "",
    strengths: data.strengths ?? "",
    improvements: data.improvements ?? "",
    comments: data.comments ?? "",
    employeeComments: data.employeeComments ?? "",
    status: data.status ?? "draft",
  }).returning();
  if (data.kpis?.length) await addInitialKpis(created.id, data.kpis);
  revalidatePerformance();
  return created;
}

async function addInitialKpis(reviewId: number, kpis: PerformanceKpiData[]) {
  await db.insert(hcPerformanceKpis).values(kpis.map((kpi, index) => kpiPayload(reviewId, { ...kpi, sortOrder: kpi.sortOrder ?? index + 1 })));
}

export async function updatePerformanceReview(id: number, data: Partial<PerformanceReviewData>) {
  const payload: Record<string, unknown> = { updatedAt: new Date() };
  if (data.cycleId !== undefined) payload.cycleId = data.cycleId;
  if (data.employeeId !== undefined) payload.employeeId = data.employeeId;
  if (data.reviewerId !== undefined) payload.reviewerId = data.reviewerId;
  if (data.overallScore !== undefined) payload.overallScore = toDecimal(data.overallScore);
  if (data.overallRating !== undefined) payload.overallRating = data.overallRating;
  if (data.strengths !== undefined) payload.strengths = data.strengths;
  if (data.improvements !== undefined) payload.improvements = data.improvements;
  if (data.comments !== undefined) payload.comments = data.comments;
  if (data.employeeComments !== undefined) payload.employeeComments = data.employeeComments;
  if (data.status !== undefined) payload.status = data.status;
  const [updated] = await db.update(hcPerformanceReviews).set(payload).where(eq(hcPerformanceReviews.id, id)).returning();
  revalidatePerformance();
  return updated;
}

export async function addPerformanceKpi(reviewId: number, data: PerformanceKpiData) {
  const [created] = await db.insert(hcPerformanceKpis).values(kpiPayload(reviewId, data)).returning();
  revalidatePerformance();
  return created;
}

export async function updatePerformanceKpi(id: number, data: Partial<PerformanceKpiData>) {
  const payload: Record<string, unknown> = { updatedAt: new Date() };
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  if (data.kpiName !== undefined) payload.kpiName = data.kpiName;
  if (data.kpiDescription !== undefined) payload.kpiDescription = data.kpiDescription;
  if (data.targetValue !== undefined) payload.targetValue = data.targetValue;
  if (data.actualValue !== undefined) payload.actualValue = data.actualValue;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.score !== undefined) payload.score = toDecimal(data.score);
  if (data.comments !== undefined) payload.comments = data.comments;
  const [updated] = await db.update(hcPerformanceKpis).set(payload).where(eq(hcPerformanceKpis.id, id)).returning();
  revalidatePerformance();
  return updated;
}

export async function deletePerformanceKpi(id: number) {
  await db.delete(hcPerformanceKpis).where(eq(hcPerformanceKpis.id, id));
  revalidatePerformance();
  return { success: true };
}

export async function submitPerformanceReview(id: number) {
  const [updated] = await db.update(hcPerformanceReviews).set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() }).where(eq(hcPerformanceReviews.id, id)).returning();
  revalidatePerformance();
  return updated;
}

export async function acknowledgePerformanceReview(id: number) {
  const [updated] = await db.update(hcPerformanceReviews).set({ status: "acknowledged", acknowledgedAt: new Date(), updatedAt: new Date() }).where(eq(hcPerformanceReviews.id, id)).returning();
  revalidatePerformance();
  return updated;
}

export async function getPerformanceStats() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [activeCycles] = await db.select({ value: count() }).from(hcPerformanceCycles).where(and(eq(hcPerformanceCycles.isActive, true), eq(hcPerformanceCycles.status, "active")));
  const [pendingReviews] = await db.select({ value: count() }).from(hcPerformanceReviews).where(sql`${hcPerformanceReviews.status} in ('draft', 'submitted', 'reviewed')`);
  const [averageScore] = await db.select({ value: avg(hcPerformanceReviews.overallScore) }).from(hcPerformanceReviews);
  const [completed] = await db.select({ value: count() }).from(hcPerformanceReviews).where(and(eq(hcPerformanceReviews.status, "acknowledged"), gte(hcPerformanceReviews.acknowledgedAt, monthStart)));
  return {
    activeCycles: activeCycles?.value ?? 0,
    pendingReviews: pendingReviews?.value ?? 0,
    averageScore: Number(averageScore?.value ?? 0),
    completedThisMonth: completed?.value ?? 0,
  };
}

export async function getActiveEmployees() {
  return await db
    .select({ id: hrEmployees.id, employeeId: hrEmployees.employeeId, fullName: hrEmployees.fullName, email: hrEmployees.email })
    .from(hrEmployees)
    .where(eq(hrEmployees.isActive, true))
    .orderBy(hrEmployees.fullName);
}
