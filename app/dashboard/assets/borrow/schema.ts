import { z } from 'zod'

export const assetBorrowInputSchema = z.object({
  assetId: z.number().int().positive({ message: 'Aset wajib dipilih' }),
  borrowerEmployeeId: z.number().int().positive({ message: 'Peminjam wajib dipilih' }),
  equipmentNotes: z.string().optional().nullable(),
  purpose: z.string().min(3, { message: 'Tujuan peminjaman wajib diisi minimal 3 karakter' }),
  borrowDate: z.string().min(1, { message: 'Waktu peminjaman wajib diisi' }),
  expectedReturnDate: z.string().optional().nullable(),
  borrowerSignatureUrl: z.string().optional().nullable(),
})

export type AssetBorrowInput = z.infer<typeof assetBorrowInputSchema>

export const assetBorrowReturnSchema = z.object({
  returnNotes: z.string().optional().nullable(),
})

export type AssetBorrowReturnInput = z.infer<typeof assetBorrowReturnSchema>

// Schema Langkah 1: Peminjam mengajukan pengembalian aset (Wajib upload foto fisik)
export const assetBorrowReturnRequestSchema = z.object({
  id: z.number().int().positive({ message: 'ID peminjaman tidak valid' }),
  actualReturnDate: z.string().min(1, { message: 'Waktu pengembalian fisik wajib diisi' }),
  returnNotes: z.string().min(3, { message: 'Catatan kondisi pengembalian wajib diisi minimal 3 karakter' }),
  photoUrls: z.array(z.string().min(1)).min(1, { message: 'Wajib mengunggah minimal 1 foto kondisi fisik aset' }),
  signatureUrl: z.string().optional().nullable(),
})

export type AssetBorrowReturnRequestInput = z.infer<typeof assetBorrowReturnRequestSchema>

// Schema Langkah 2: Holder memeriksa fisik & konfirmasi penerimaan kembali
export const assetBorrowConfirmReturnSchema = z.object({
  id: z.number().int().positive({ message: 'ID peminjaman tidak valid' }),
  returnConditionNotes: z.string().min(3, { message: 'Catatan hasil pemeriksaan fisik wajib diisi' }),
  assetCondition: z.enum(['ACTIVE', 'DAMAGED', 'NEEDS_REPAIR']).default('ACTIVE'),
  signatureUrl: z.string().optional().nullable(),
})

export type AssetBorrowConfirmReturnInput = z.infer<typeof assetBorrowConfirmReturnSchema>
