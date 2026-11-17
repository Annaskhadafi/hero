import { z } from 'zod'

export const EQUIPMENT_CHECKBOX_OPTIONS = [
  'Laptop / Desktop',
  'Charger',
  'Tas',
  'Monitor',
  'CPU',
  'Keyboard',
  'Mouse',
  'Kabel Power',
  'Kabel Monitor',
  'Other',
] as const

export const assetTransferInputSchema = z.object({
  assetId: z.coerce.number().min(1, 'Aset wajib dipilih dari master data'),
  equipmentChecklist: z.array(z.string()).default([]),
  equipmentOtherNote: z.string().optional().nullable(),
  assetPhotos: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileUrl: z.string().min(1),
        fileSize: z.coerce.number().optional().nullable(),
        mimeType: z.string().optional().nullable(),
      })
    )
    .default([]),
  currentHolderEmployeeId: z.coerce.number().min(1, 'Holder saat ini wajib dipilih'),
  currentLocationSiteId: z.coerce.number().min(1, 'Lokasi aset saat ini wajib dipilih'),
  newHolderEmployeeId: z.coerce.number().min(1, 'Holder baru / penerima transfer wajib dipilih'),
  targetLocationSiteId: z.coerce.number().min(1, 'Lokasi tujuan transfer wajib dipilih'),
  currentHolderManagerId: z.coerce.number().optional().nullable(),
  newHolderManagerId: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  applicantSignatureUrl: z.string().min(1, 'Tanda tangan pemohon wajib dibubuhkan sebelum mengirimkan pengajuan'),
})

export type AssetTransferInput = z.infer<typeof assetTransferInputSchema>
