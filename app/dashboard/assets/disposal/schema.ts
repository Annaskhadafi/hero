import { z } from 'zod'

export const disposalAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.coerce.number().optional().nullable(),
  mimeType: z.string().optional().nullable(),
})

export const disposalApproverStepSchema = z.object({
  level: z.coerce.number(),
  title: z.string(),
  approverEmployeeId: z.coerce.number().int().positive(),
  approverName: z.string(),
  jobTitle: z.string().optional().nullable(),
})

export const assetDisposalInputSchema = z.object({
  assetId: z.coerce.number().optional().nullable(),
  assetName: z.string().min(2, 'Nama aset wajib diisi minimal 2 karakter'),
  assetNumber: z.string().optional().nullable(),
  purchaseYear: z.string().optional().nullable(),
  departmentId: z.coerce.number().optional().nullable(),
  departmentName: z.string().min(1, 'Departemen wajib diisi'),
  sectionId: z.coerce.number().optional().nullable(),
  sectionName: z.string().optional().nullable(),
  siteId: z.coerce.number().min(1, 'Cabang / Site wajib dipilih'),
  siteName: z.string().min(1, 'Nama Cabang / Site wajib diisi'),
  disposalDate: z.string().min(1, 'Tanggal pengajuan disposal wajib diisi'),
  notes: z.string().min(5, 'Catatan / alasan penghapusan aset wajib diisi minimal 5 karakter'),
  attachments: z.array(disposalAttachmentSchema).default([]),
  applicantEmployeeId: z.coerce.number().optional().nullable(),
  customApprovers: z.array(disposalApproverStepSchema).optional(),
})

export type AssetDisposalInput = z.infer<typeof assetDisposalInputSchema>
export type DisposalAttachment = z.infer<typeof disposalAttachmentSchema>
export type DisposalApproverStep = z.infer<typeof disposalApproverStepSchema>
