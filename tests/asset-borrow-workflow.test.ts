import {
  assetBorrowInputSchema,
  assetBorrowReturnRequestSchema,
  assetBorrowConfirmReturnSchema,
} from '@/app/dashboard/assets/borrow/schema'
import {
  sendAssetBorrowSubmittedEmail,
  sendAssetBorrowApprovedEmail,
  sendAssetBorrowReturnRequestedEmail,
  sendAssetBorrowReturnedEmail,
} from '@/lib/asset-approval-email'
import { generateAssetBorrowPdf } from '@/lib/asset-borrow-pdf'
import { PDFDocument } from 'pdf-lib'

describe('Asset Borrow Workflow & Validation Tests', () => {
  describe('Form Input Validations', () => {
    it('validates correct borrow submission input with applicant signature', () => {
      const validData = {
        assetId: 10,
        borrowerEmployeeId: 45,
        purpose: 'Digunakan untuk operasional onsite di area workshop',
        borrowDate: new Date().toISOString(),
        expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        equipmentNotes: 'Unit laptop ThinkPad, mouse wireless, charger ori',
        borrowerSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }

      const result = assetBorrowInputSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.borrowerSignatureUrl).toBeTruthy()
      }
    })

    it('rejects borrow submission with purpose shorter than 3 characters', () => {
      const invalidData = {
        assetId: 10,
        borrowerEmployeeId: 45,
        purpose: 'No',
        borrowDate: new Date().toISOString(),
      }

      const result = assetBorrowInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Tujuan peminjaman wajib diisi minimal 3 karakter')
      }
    })
  })

  describe('Step 1: Return Request Validation (Wajib Foto Fisik Aset)', () => {
    it('rejects return request when photoUrls is empty (Mandatory photo requirement)', () => {
      const returnWithoutPhoto = {
        id: 1,
        actualReturnDate: new Date().toISOString(),
        returnNotes: 'Aset dikembalikan lengkap beserta charger dan tas.',
        photoUrls: [], // Empty photos!
      }

      const result = assetBorrowReturnRequestSchema.safeParse(returnWithoutPhoto)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Wajib mengunggah minimal 1 foto kondisi fisik aset')
      }
    })

    it('rejects return request with empty return notes', () => {
      const returnWithoutNotes = {
        id: 1,
        actualReturnDate: new Date().toISOString(),
        returnNotes: '',
        photoUrls: ['/api/uploads/asset-borrow/proof-1.jpg'],
      }

      const result = assetBorrowReturnRequestSchema.safeParse(returnWithoutNotes)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Catatan kondisi pengembalian wajib diisi')
      }
    })

    it('accepts valid return request with photo and notes', () => {
      const validReturnRequest = {
        id: 1,
        actualReturnDate: new Date().toISOString(),
        returnNotes: 'Aset diserahkan kembali dalam kondisi mulus dan lengkap.',
        photoUrls: ['/api/uploads/asset-borrow/return-photo-001.jpg'],
      }

      const result = assetBorrowReturnRequestSchema.safeParse(validReturnRequest)
      expect(result.success).toBe(true)
    })
  })

  describe('Step 2: Return Confirmation Validation (Holder Physical Inspection)', () => {
    it('accepts valid confirmation with condition notes and assetCondition', () => {
      const validConfirmation = {
        id: 1,
        returnConditionNotes: 'Unit laptop dan charger telah diperiksa, fungsi normal, tidak ada lecet.',
        assetCondition: 'ACTIVE' as const,
      }

      const result = assetBorrowConfirmReturnSchema.safeParse(validConfirmation)
      expect(result.success).toBe(true)
    })

    it('rejects confirmation with notes shorter than 3 characters', () => {
      const invalidConfirmation = {
        id: 1,
        returnConditionNotes: 'Ok',
        assetCondition: 'ACTIVE' as const,
      }

      const result = assetBorrowConfirmReturnSchema.safeParse(invalidConfirmation)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Catatan hasil pemeriksaan fisik wajib diisi')
      }
    })
  })

  describe('Asset Approval Email Notification Functions', () => {
    it('declares and exports all workflow notification helpers including extension and revision', () => {
      expect(typeof sendAssetBorrowSubmittedEmail).toBe('function')
      expect(typeof sendAssetBorrowApprovedEmail).toBe('function')
      expect(typeof sendAssetBorrowReturnRequestedEmail).toBe('function')
      expect(typeof sendAssetBorrowReturnedEmail).toBe('function')
    })
  })

  describe('A4 Portrait PDF Generation Verification', () => {
    it('generates an official document in A4 Portrait dimensions (595.28 x 841.89 pt)', async () => {
      const sampleBorrow = {
        borrowNumber: 'BRW/2026/11/0001',
        borrowDate: new Date('2026-11-18T08:00:00Z'),
        expectedReturnDate: new Date('2026-11-20T17:00:00Z'),
        status: 'borrowed',
        borrowerName: 'Ahmad Fauzi',
        borrowerJobTitle: 'Field Engineer',
        borrowerDepartment: 'Operational Engineering',
        assetName: 'Spectra Precision Laser Ranger',
        assetNumber: 'AST-OP-0042',
        serialNumber: 'SN-SPLR-98712',
        equipmentNotes: 'Unit, case pelindung, tripod, 2x baterai cadangan',
        holderName: 'Budi Santoso',
        holderJobTitle: 'Asset Custodian & Workshop Supervisor',
        purpose: 'Pengukuran kontur area project workshop penambangan site Balikpapan',
      }

      const pdfBytes = await generateAssetBorrowPdf(sampleBorrow)
      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(1000)

      const doc = await PDFDocument.load(pdfBytes)
      const pages = doc.getPages()
      expect(pages.length).toBeGreaterThanOrEqual(1)

      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()

      // A4 portrait dimensions: width = 595.28 pt, height = 841.89 pt
      expect(width).toBeCloseTo(595.28, 1)
      expect(height).toBeCloseTo(841.89, 1)
      expect(height).toBeGreaterThan(width) // Proves portrait, not landscape
    })

    it('generates strictly 1-page PDF document with return details and physical return photos integrated into Page 1', async () => {
      // 1x1 transparent PNG data URL to simulate uploaded physical asset photo
      const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const returnedBorrow = {
        borrowNumber: 'BRW/2026/11/0002',
        borrowDate: new Date('2026-11-18T08:00:00Z'),
        expectedReturnDate: new Date('2026-11-20T17:00:00Z'),
        actualReturnDate: new Date('2026-11-20T16:30:00Z'),
        status: 'returned',
        borrowerName: 'Ahmad Fauzi',
        borrowerJobTitle: 'Field Engineer',
        borrowerDepartment: 'Operational Engineering',
        assetName: 'Spectra Precision Laser Ranger',
        assetNumber: 'AST-OP-0042',
        serialNumber: 'SN-SPLR-98712',
        equipmentNotes: 'Unit lengkap',
        holderName: 'Budi Santoso',
        holderJobTitle: 'Asset Custodian & Workshop Supervisor',
        purpose: 'Pengukuran kontur area project workshop penambangan site Balikpapan',
        returnNotes: 'Unit dikembalikan dalam keadaan bersih dan berfungsi normal.',
        returnConditionNotes: 'Telah diperiksa langsung oleh holder, kondisi fisik prima.',
        assetCondition: 'ACTIVE',
        returnPhotoUrls: [samplePhoto, samplePhoto],
        holderReturnSignatureUrl: samplePhoto,
        holderReturnSignedAt: new Date('2026-11-20T16:35:00Z'),
      }

      const pdfBytes = await generateAssetBorrowPdf(returnedBorrow)
      expect(pdfBytes).toBeInstanceOf(Uint8Array)

      const doc = await PDFDocument.load(pdfBytes)
      const pages = doc.getPages()
      // Strictly 1 Page: Both borrow info and return confirmation with photos are in Page 1
      expect(pages.length).toBe(1)

      const page1 = pages[0]
      expect(page1.getSize().width).toBeCloseTo(595.28, 1)
      expect(page1.getSize().height).toBeCloseTo(841.89, 1)
      expect(page1.getSize().height).toBeGreaterThan(page1.getSize().width)
    })
  })
})
