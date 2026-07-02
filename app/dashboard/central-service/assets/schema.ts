import { z } from "zod";

export const assetSchema = z.object({
  workSection: z.string().optional().nullable(),
  section: z.string().min(1, "Section is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  assetNumber: z.string().optional().nullable(), // Optional - not required
  serialNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  deliveryToSiteDate: z.string().optional().nullable(),
  lastCalibrationDate: z.string().optional().nullable(),
  calibrationCycleMonths: z.coerce.number().optional().nullable(),
  calibrationDueDate: z.string().optional().nullable(),
  certificateDate: z.string().optional().nullable(),
  certificateCycleMonths: z.coerce.number().optional().nullable(),
  certificateDueDate: z.string().optional().nullable(),
  condition: z.string().min(1, "Condition is required"),
  qty: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  remarks: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileUrl: z.string().min(1),
        previewUrl: z.string().optional().nullable(),
        mimeType: z.string().optional().nullable(),
        fileSize: z.coerce.number().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

export type AssetData = z.infer<typeof assetSchema>;
