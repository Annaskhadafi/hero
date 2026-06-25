"use server";

import { db } from "@/db";
import { 
  heroInspections, 
  heroInspectionChecklists, 
  heroInspectionPhotos 
} from "@/db/schema/inspection";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { eq, desc } from "drizzle-orm";
import { callInspectionAiReport } from "@/lib/ai-inspection-report";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";

async function requirePermission() {
  const permission = await getCurrentMenuPermission("hse_tire_inspection");
  if (!permission.canView) {
    throw new Error("Akses ditolak. Anda tidak memiliki izin untuk melihat modul inspeksi.");
  }
  return permission;
}

export async function getInspectionList() {
  await requirePermission();
  return db.select().from(heroInspections).orderBy(desc(heroInspections.createdAt));
}

export async function getInspectionDetail(id: string) {
  await requirePermission();
  const [inspection] = await db
    .select()
    .from(heroInspections)
    .where(eq(heroInspections.id, id))
    .limit(1);

  if (!inspection) return null;

  const checklists = await db
    .select()
    .from(heroInspectionChecklists)
    .where(eq(heroInspectionChecklists.inspectionId, id));

  const photos = await db
    .select()
    .from(heroInspectionPhotos)
    .where(eq(heroInspectionPhotos.inspectionId, id))
    .orderBy(heroInspectionPhotos.sortOrder);

  const readablePhotos = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      readableImageUrl: (await getS3ObjectReadUrl(photo.imageUrl)) || photo.imageUrl,
    }))
  );

  return { inspection, checklists, photos: readablePhotos };
}

export async function createInspection(data: {
  siteName: string;
  customerName: string;
  inspectionDate: Date;
  shift: string;
  unitName: string;
  notes: string;
  attendees?: Array<{
    sn: string;
    name: string;
    dept: string;
    section: string;
    signatureUrl: string;
  }>;
  checklists: Array<{
    section: string;
    question: string;
    answer: boolean;
    score: number;
    remarks?: string;
  }>;
  photos: Array<{
    section: string;
    imageUrl: string;
    caption?: string;
    sortOrder: number;
  }>;
}) {
  const permission = await requirePermission();
  if (!permission.canEdit) {
    throw new Error("Akses ditolak. Anda tidak dapat membuat inspeksi baru.");
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("Session tidak valid atau tidak ditemukan data karyawan.");
  }

  // Calculate scores
  const loadingScoreList = data.checklists.filter(c => c.section === "loading_area").map(c => c.score);
  const haulRoadScoreList = data.checklists.filter(c => c.section === "haul_road").map(c => c.score);
  const dumpingScoreList = data.checklists.filter(c => c.section === "dumping_area").map(c => c.score);

  const calculateAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  // Scale from 1-10 to 0-100 percentage. Wait, score is 1-10, so average is 1-10. Let's make it out of 100.
  const loadingScore = calculateAvg(loadingScoreList) * 10;
  const haulRoadScore = calculateAvg(haulRoadScoreList) * 10;
  const dumpingScore = calculateAvg(dumpingScoreList) * 10;
  const totalScore = (loadingScore + haulRoadScore + dumpingScore) / 3;

  const [inspection] = await db.insert(heroInspections).values({
    siteName: data.siteName,
    customerName: data.customerName,
    inspectionDate: data.inspectionDate,
    inspectorId: employee.id,
    shift: data.shift,
    unitName: data.unitName,
    notes: data.notes,
    attendees: data.attendees || [],
    loadingScore,
    haulRoadScore,
    dumpingScore,
    totalScore,
    status: "draft",
  }).returning();

  if (data.checklists.length > 0) {
    await db.insert(heroInspectionChecklists).values(
      data.checklists.map(c => ({
        inspectionId: inspection.id,
        section: c.section,
        question: c.question,
        answer: c.answer,
        score: c.score,
        remarks: c.remarks,
      }))
    );
  }

  if (data.photos.length > 0) {
    await db.insert(heroInspectionPhotos).values(
      data.photos.map(p => ({
        inspectionId: inspection.id,
        section: p.section,
        imageUrl: p.imageUrl,
        caption: p.caption,
        sortOrder: p.sortOrder,
      }))
    );
  }

  revalidatePath("/dashboard/hse/tire-inspection");
  return { success: true, id: inspection.id };
}

export async function updateInspectionFull(id: string, data: {
  siteName: string;
  customerName: string;
  inspectionDate: Date;
  shift: string;
  unitName: string;
  notes: string;
  attendees?: Array<{
    sn: string;
    name: string;
    dept: string;
    section: string;
    signatureUrl: string;
  }>;
  checklists: Array<{
    section: string;
    question: string;
    answer: boolean;
    score: number;
    remarks?: string;
  }>;
  photos: Array<{
    id?: string;
    section: string;
    imageUrl: string;
    caption?: string;
    sortOrder: number;
  }>;
}) {
  const permission = await requirePermission();
  if (!permission.canEdit) {
    throw new Error("Akses ditolak. Anda tidak dapat mengedit inspeksi ini.");
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("Session tidak valid atau tidak ditemukan data karyawan.");
  }

  // Calculate scores
  const loadingScoreList = data.checklists.filter(c => c.section === "loading_area").map(c => c.score);
  const haulRoadScoreList = data.checklists.filter(c => c.section === "haul_road").map(c => c.score);
  const dumpingScoreList = data.checklists.filter(c => c.section === "dumping_area").map(c => c.score);

  const calculateAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const loadingScore = calculateAvg(loadingScoreList) * 10;
  const haulRoadScore = calculateAvg(haulRoadScoreList) * 10;
  const dumpingScore = calculateAvg(dumpingScoreList) * 10;
  const totalScore = (loadingScore + haulRoadScore + dumpingScore) / 3;

  await db.update(heroInspections).set({
    siteName: data.siteName,
    customerName: data.customerName,
    inspectionDate: data.inspectionDate,
    shift: data.shift,
    unitName: data.unitName,
    notes: data.notes,
    attendees: data.attendees || [],
    loadingScore,
    haulRoadScore,
    dumpingScore,
    totalScore,
    updatedAt: new Date(),
  }).where(eq(heroInspections.id, id));

  // Re-insert checklists
  await db.delete(heroInspectionChecklists).where(eq(heroInspectionChecklists.inspectionId, id));
  if (data.checklists.length > 0) {
    await db.insert(heroInspectionChecklists).values(
      data.checklists.map(c => ({
        inspectionId: id,
        section: c.section,
        question: c.question,
        answer: c.answer,
        score: c.score,
        remarks: c.remarks,
      }))
    );
  }

  // Re-insert photos
  await db.delete(heroInspectionPhotos).where(eq(heroInspectionPhotos.inspectionId, id));
  if (data.photos.length > 0) {
    await db.insert(heroInspectionPhotos).values(
      data.photos.map(p => ({
        ...(p.id ? { id: p.id } : {}), // preserve old ID if it exists
        inspectionId: id,
        section: p.section,
        imageUrl: p.imageUrl,
        caption: p.caption,
        sortOrder: p.sortOrder,
      }))
    );
  }

  revalidatePath("/dashboard/hse/tire-inspection");
  revalidatePath(`/dashboard/hse/tire-inspection/detail/${id}`);
  return { success: true };
}

export async function generateAiReport(id: string) {
  const permission = await requirePermission();
  if (!permission.canEdit) {
    throw new Error("Akses ditolak. Anda tidak memiliki izin untuk mengedit inspeksi.");
  }

  const detail = await getInspectionDetail(id);
  if (!detail) throw new Error("Inspeksi tidak ditemukan.");

  // For photos, we need base64. But since our AI might not have access to internal URLs, 
  // we would fetch the image and convert it to base64. 
  // However, for this MVP and token usage, we will skip sending actual base64 photos to the AI 
  // unless we fetch them here. Let's just pass metadata and let AI generate without images 
  // or mock image captioning based on remarks.
  
  const aiInput = {
    siteName: detail.inspection.siteName,
    customerName: detail.inspection.customerName,
    shift: detail.inspection.shift,
    unitName: detail.inspection.unitName,
    notes: detail.inspection.notes ?? "",
    loadingScore: detail.inspection.loadingScore ?? 0,
    haulRoadScore: detail.inspection.haulRoadScore ?? 0,
    dumpingScore: detail.inspection.dumpingScore ?? 0,
    totalScore: detail.inspection.totalScore ?? 0,
    checklists: detail.checklists.map(c => ({
      section: c.section,
      question: c.question,
      answer: c.answer,
      score: c.score,
      remarks: c.remarks ?? "",
    })),
    photos: detail.photos.map(p => ({
      id: p.id,
      section: p.section,
      base64: "", // Skip large image payload for now to keep request fast
      mimeType: "image/jpeg",
      caption: p.caption ?? "",
    }))
  };

  const aiResult = await callInspectionAiReport(aiInput);

  await db.update(heroInspections).set({
    summary: aiResult.content.summary,
    findings: aiResult.content.findings,
    recommendations: aiResult.content.recommendations,
    status: "report_generated",
    updatedAt: new Date(),
  }).where(eq(heroInspections.id, id));

  // Update photo captions
  if (aiResult.content.photoCaptions) {
    for (const [photoId, aiCaption] of Object.entries(aiResult.content.photoCaptions)) {
      await db.update(heroInspectionPhotos)
        .set({ aiCaption })
        .where(eq(heroInspectionPhotos.id, photoId));
    }
  }

  revalidatePath(`/dashboard/hse/tire-inspection/detail/${id}`);
  revalidatePath(`/dashboard/hse/tire-inspection/editor/${id}`);
  
  return { success: true };
}

export async function updateInspectionReport(id: string, data: {
  summary: string;
  findings: string;
  recommendations: string;
  status?: string;
}) {
  const permission = await requirePermission();
  if (!permission.canEdit) {
    throw new Error("Akses ditolak.");
  }

  await db.update(heroInspections).set({
    summary: data.summary,
    findings: data.findings,
    recommendations: data.recommendations,
    ...(data.status && { status: data.status }),
    updatedAt: new Date(),
  }).where(eq(heroInspections.id, id));

  revalidatePath(`/dashboard/hse/tire-inspection/detail/${id}`);
  revalidatePath(`/dashboard/hse/tire-inspection/editor/${id}`);
  
  return { success: true };
}
