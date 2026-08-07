"use server";

import { db } from "@/db";
import {
  centralServiceAssetAttachments,
  centralServiceAssetHistories,
  centralServiceAssets,
} from "@/db/schema/central-service";
import { masterSections } from "@/db/schema/hero";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assetSchema, type AssetData } from "./schema";

const TRACKED_FIELDS = [
  ["workSection", "Section"],
  ["section", "Kategori Alat"],
  ["location", "Lokasi Site"],
  ["description", "Description"],
  ["assetNumber", "Nomor Aset"],
  ["serialNumber", "Serial Number"],
  ["purchaseDate", "Tanggal Pembelian"],
  ["deliveryToSiteDate", "Delivery To Site"],
  ["lastCalibrationDate", "Last Calibration"],
  ["calibrationCycleMonths", "Calibration Cycle"],
  ["calibrationDueDate", "Calibration Due"],
  ["certificateDate", "Certificate Date"],
  ["certificateCycleMonths", "Certificate Cycle"],
  ["certificateDueDate", "Certificate Due"],
  ["condition", "Kondisi"],
  ["qty", "Qty"],
  ["remarks", "Remarks"],
] as const;

type AssetChangeRow = {
  assetId: number;
  action: string;
  fieldName: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changeRemark?: string | null;
};

export async function getAssets() {
  try {
    const assets = await db
      .select()
      .from(centralServiceAssets)
      .orderBy(asc(centralServiceAssets.workSection), asc(centralServiceAssets.section), asc(centralServiceAssets.description));

    const assetIds = assets.map((asset) => asset.id);
    const [attachmentRows, historyRows] =
      assetIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(centralServiceAssetAttachments)
              .where(inArray(centralServiceAssetAttachments.assetId, assetIds))
              .orderBy(asc(centralServiceAssetAttachments.createdAt), asc(centralServiceAssetAttachments.id)),
            db
              .select()
              .from(centralServiceAssetHistories)
              .where(inArray(centralServiceAssetHistories.assetId, assetIds))
              .orderBy(desc(centralServiceAssetHistories.createdAt), desc(centralServiceAssetHistories.id)),
          ])
        : [[], []];

    const attachmentsByAsset = new Map<number, Array<typeof attachmentRows[number] & { previewUrl: string | null }>>();
    for (const attachment of attachmentRows) {
      const previewUrl = await getS3ObjectReadUrl(attachment.fileUrl);
      const current = attachmentsByAsset.get(attachment.assetId) ?? [];
      current.push({ ...attachment, previewUrl });
      attachmentsByAsset.set(attachment.assetId, current);
    }
    const historiesByAsset = new Map<number, Array<typeof historyRows[number]>>();
    for (const history of historyRows) {
      const current = historiesByAsset.get(history.assetId) ?? [];
      current.push(history);
      historiesByAsset.set(history.assetId, current);
    }

    return {
      success: true,
      data: assets.map((asset) => ({
        ...asset,
        attachments: attachmentsByAsset.get(asset.id) ?? [],
        histories: historiesByAsset.get(asset.id) ?? [],
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

function normalizeValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function normalizeAttachmentNames(attachments: Array<{ fileName: string }>) {
  return attachments.map((attachment) => attachment.fileName).sort().join(", ");
}

function buildAssetValues(parsed: AssetData) {
  return {
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
  };
}

function buildChangeRows(assetId: number, before: Record<string, unknown>, after: Record<string, unknown>, action = "update") {
  const rows: AssetChangeRow[] = [];
  for (const [fieldName, fieldLabel] of TRACKED_FIELDS) {
    const previousValue = normalizeValue(before[fieldName]);
    const newValue = normalizeValue(after[fieldName]);
    if (previousValue !== newValue) rows.push({ assetId, action, fieldName, fieldLabel, previousValue, newValue });
  }
  return rows;
}

export async function createAsset(data: AssetData) {
  try {
    const parsed = assetSchema.parse(data);
    const result = await db.transaction(async (tx) => {
      const assetValues = buildAssetValues(parsed);
      const [asset] = await tx.insert(centralServiceAssets).values(assetValues).returning();

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

      const historyRows = [
        {
          assetId: asset.id,
          action: "create",
          fieldName: "asset",
          fieldLabel: "Asset",
          previousValue: null,
          newValue: asset.description,
          changeRemark: parsed.remarks ?? null,
        },
        ...buildChangeRows(asset.id, {}, assetValues, "create"),
        ...(attachments.length > 0
          ? [
              {
                assetId: asset.id,
                action: "create",
                fieldName: "attachments",
                fieldLabel: "Attachment",
                previousValue: "",
                newValue: normalizeAttachmentNames(attachments),
                changeRemark: null,
              },
            ]
          : []),
      ];
      await tx.insert(centralServiceAssetHistories).values(historyRows);

      return {
        ...asset,
        attachments: attachments.map((attachment) => ({
          ...attachment,
          previewUrl: parsed.attachments.find((item) => item.fileUrl === attachment.fileUrl)?.previewUrl ?? attachment.fileUrl,
        })),
        histories: historyRows.map((history, index) => ({
          id: -index - 1,
          createdAt: new Date(),
          ...history,
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
      const [before] = await tx.select().from(centralServiceAssets).where(eq(centralServiceAssets.id, id)).limit(1);
      const beforeAttachments = await tx
        .select()
        .from(centralServiceAssetAttachments)
        .where(eq(centralServiceAssetAttachments.assetId, id))
        .orderBy(asc(centralServiceAssetAttachments.createdAt), asc(centralServiceAssetAttachments.id));
      const assetValues = buildAssetValues(parsed);
      const [asset] = await tx
        .update(centralServiceAssets)
        .set({ ...assetValues, updatedAt: new Date() })
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
      const changeRows = before ? buildChangeRows(id, before, assetValues) : [];
      const previousAttachmentNames = normalizeAttachmentNames(beforeAttachments);
      const newAttachmentNames = normalizeAttachmentNames(attachments);
      if (previousAttachmentNames !== newAttachmentNames) {
        changeRows.push({
          assetId: id,
          action: "update",
          fieldName: "attachments",
          fieldLabel: "Attachment",
          previousValue: previousAttachmentNames,
          newValue: newAttachmentNames,
        });
      }
      const histories =
        changeRows.length > 0
          ? await tx.insert(centralServiceAssetHistories).values(changeRows).returning()
          : [];

      return {
        ...asset,
        attachments: attachments.map((attachment) => ({
          ...attachment,
          previewUrl: parsed.attachments.find((item) => item.fileUrl === attachment.fileUrl)?.previewUrl ?? attachment.fileUrl,
        })),
        histories,
      };
    });
    revalidatePath("/dashboard/central-service/assets");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to update asset:", error);
    return { success: false, error: "Failed to update asset" };
  }
}

export async function updateAssetCondition(id: number, condition: string) {
  try {
    const parsedCondition = condition.trim().toUpperCase();
    if (!["ACTIVE", "SERVICE", "BAD", "SCRAP"].includes(parsedCondition)) {
      return { success: false, error: "Kondisi tidak valid" };
    }

    const result = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(centralServiceAssets).where(eq(centralServiceAssets.id, id)).limit(1);
      if (!before) return null;

      const [asset] = await tx
        .update(centralServiceAssets)
        .set({ condition: parsedCondition, updatedAt: new Date() })
        .where(eq(centralServiceAssets.id, id))
        .returning();

      const changeRows = buildChangeRows(id, before, { ...before, condition: parsedCondition });
      const histories =
        changeRows.length > 0
          ? await tx.insert(centralServiceAssetHistories).values(changeRows).returning()
          : [];

      return { ...asset, attachments: [], histories };
    });

    if (!result) return { success: false, error: "Asset tidak ditemukan" };

    revalidatePath("/dashboard/central-service/assets");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to update asset condition:", error);
    return { success: false, error: "Gagal mengupdate kondisi asset" };
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
