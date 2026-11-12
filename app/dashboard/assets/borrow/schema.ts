import { z } from 'zod'

export const assetBorrowInputSchema = z.object({
  assetId: z.number().int().positive({ message: 'Aset wajib dipilih' }),
  borrowerEmployeeId: z.number().int().positive({ message: 'Peminjam wajib dipilih' }),
  equipmentNotes: z.string().optional().nullable(),
  purpose: z.string().min(3, { message: 'Tujuan peminjaman wajib diisi minimal 3 karakter' }),
  borrowDate: z.string().min(1, { message: 'Waktu peminjaman wajib diisi' }),
  expectedReturnDate: z.string().optional().nullable(),
})

export type AssetBorrowInput = z.infer<typeof assetBorrowInputSchema>

export const assetBorrowReturnSchema = z.object({
  returnNotes: z.string().optional().nullable(),
})

export type AssetBorrowReturnInput = z.infer<typeof assetBorrowReturnSchema>
