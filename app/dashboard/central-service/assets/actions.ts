"use server";

import { db } from "@/db";
import { centralServiceAssetAttachments, centralServiceAssets } from "@/db/schema/central-service";
import { masterSections } from "@/db/schema/hero";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { eq, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assetSchema, type AssetData } from "./schema";

export async function getAssets() {
  try {
    const assets = await db
      .select()
      .from(centralServiceAssets)
      .orderBy(asc(centralServiceAssets.workSection), asc(centralServiceAssets.section), asc(centralServiceAssets.description));

    const attachmentRows =
      assets.length > 0
        ? await db
            .select()
            .from(centralServiceAssetAttachments)
            .where(inArray(centralServiceAssetAttachments.assetId, assets.map((asset) => asset.id)))
            .orderBy(asc(centralServiceAssetAttachments.createdAt), asc(centralServiceAssetAttachments.id))
        : [];

    const attachmentsByAsset = new Map<number, Array<typeof attachmentRows[number] & { previewUrl: string | null }>>();
    for (const attachment of attachmentRows) {
      const previewUrl = await getS3ObjectReadUrl(attachment.fileUrl);
      const current = attachmentsByAsset.get(attachment.assetId) ?? [];
      current.push({ ...attachment, previewUrl });
      attachmentsByAsset.set(attachment.assetId, current);
    }

    return {
      success: true,
      data: assets.map((asset) => ({
        ...asset,
        attachments: attachmentsByAsset.get(asset.id) ?? [],
      })),
    };
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return { success: false, error: "Failed to fetch assets" };
  }
}

export async function getMasterSectionOptions() {
  try {
    const data = await db
      .select({ name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(asc(masterSections.name));
    return data;
  } catch (error) {
    console.error("Failed to fetch master sections:", error);
    return [];
  }
}

function parseDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date;
}

export async function createAsset(data: AssetData) {
  try {
    const parsed = assetSchema.parse(data);
    const result = await db.transaction(async (tx) => {
      const [asset] = await tx.insert(centralServiceAssets).values({
        workSection: parsed.workSection?.trim() ?? "",
        section: parsed.section,
        location: parsed.location,
        description: parsed.description,
        assetNumber: parsed.assetNumber ?? undefined,
        serialNumber: parsed.serialNumber ?? undefined,
        purchaseDate: parseDate(parsed.purchaseDate),
        deliveryToSiteDate: parseDate(parsed.deliveryToSiteDate),
        lastCalibrationDate: parseDate(parsed.lastCalibrationDate),
        calibrationCycleMonths: parsed.calibrationCycleMonths ?? undefined,
        calibrationDueDate: parseDate(parsed.calibrationDueDate),
        certificateDate: parseDate(parsed.certificateDate),
        certificateCycleMonths: parsed.certificateCycleMonths ?? undefined,
        certificateDueDate: parseDate(parsed.certificateDueDate),
        condition: parsed.condition,
        qty: parsed.qty,
        remarks: parsed.remarks ?? undefined,
      }).returning();

      const attachments =
        parsed.attachments.length > 0
          ? await tx
              .insert(centralServiceAssetAttachments)
              .values(
                parsed.attachments.map((attachment) => ({
                  assetId: asset.id,
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  mimeType: attachment.mimeType || "application/octet-stream",
                  fileSize: attachment.fileSize ?? undefined,
                }))
              )
              .returning()
          : [];

      return {
        ...asset,
        attachments: attachments.map((attachment) => ({
          ...attachment,
          previewUrl: parsed.attachments.find((item) => item.fileUrl === attachment.fileUrl)?.previewUrl ?? attachment.fileUrl,
        })),
      };
    });
    revalidatePath("/dashboard/central-service/assets");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create asset:", error);
    return { success: false, error: "Failed to create asset" };
  }
}

export async function updateAsset(id: number, data: AssetData) {
  try {
    const parsed = assetSchema.parse(data);
    const result = await db.transaction(async (tx) => {
      const [asset] = await tx
        .update(centralServiceAssets)
        .set({
          workSection: parsed.workSection?.trim() ?? "",
          section: parsed.section,
          location: parsed.location,
          description: parsed.description,
          assetNumber: parsed.assetNumber ?? undefined,
          serialNumber: parsed.serialNumber ?? undefined,
          purchaseDate: parseDate(parsed.purchaseDate),
          deliveryToSiteDate: parseDate(parsed.deliveryToSiteDate),
          lastCalibrationDate: parseDate(parsed.lastCalibrationDate),
          calibrationCycleMonths: parsed.calibrationCycleMonths ?? undefined,
          calibrationDueDate: parseDate(parsed.calibrationDueDate),
          certificateDate: parseDate(parsed.certificateDate),
          certificateCycleMonths: parsed.certificateCycleMonths ?? undefined,
          certificateDueDate: parseDate(parsed.certificateDueDate),
          condition: parsed.condition,
          qty: parsed.qty,
          remarks: parsed.remarks ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(centralServiceAssets.id, id))
        .returning();

      await tx.delete(centralServiceAssetAttachments).where(eq(centralServiceAssetAttachments.assetId, id));

      const attachments =
        parsed.attachments.length > 0
          ? await tx
              .insert(centralServiceAssetAttachments)
              .values(
                parsed.attachments.map((attachment) => ({
                  assetId: id,
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  mimeType: attachment.mimeType || "application/octet-stream",
                  fileSize: attachment.fileSize ?? undefined,
                }))
              )
              .returning()
          : [];

      return {
        ...asset,
        attachments: attachments.map((attachment) => ({
          ...attachment,
          previewUrl: parsed.attachments.find((item) => item.fileUrl === attachment.fileUrl)?.previewUrl ?? attachment.fileUrl,
        })),
      };
    });
    revalidatePath("/dashboard/central-service/assets");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to update asset:", error);
    return { success: false, error: "Failed to update asset" };
  }
}

export async function deleteAsset(id: number) {
  try {
    await db.delete(centralServiceAssets).where(eq(centralServiceAssets.id, id));
    revalidatePath("/dashboard/central-service/assets");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return { success: false, error: "Failed to delete asset" };
  }
}
