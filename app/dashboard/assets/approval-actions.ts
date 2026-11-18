'use server'

import { db } from '@/db'
import { cerRequests, cerItems, cerCapexBudgets } from '@/db/schema/cer'
import { assetBorrows } from '@/db/schema/asset-borrow'
import { assetTransfers } from '@/db/schema/asset-transfer'
import { assetDisposals } from '@/db/schema/asset-disposal'
import { approvals, employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { approveCerStepAction, rejectCerStepAction, revertCerStepAction } from '@/app/dashboard/assets/cer/actions'
import { approveAssetBorrow, rejectAssetBorrow, revertAssetBorrowAction } from '@/app/dashboard/assets/borrow/actions'
import { approveAssetTransfer, rejectAssetTransfer, revertAssetTransferAction } from '@/app/dashboard/assets/transfer/actions'
import { approveAssetDisposal, rejectAssetDisposal, revertAssetDisposalAction } from '@/app/dashboard/assets/disposal/actions'
import { eq, asc, isNotNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function approveAssetManagementItemAction({
  subType,
  targetId,
  approvalId,
  decisionNote,
  signatureUrl,
}: {
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  targetId: number
  approvalId: number
  decisionNote: string
  signatureUrl?: string
}) {
  try {
    let res: any
    if (subType === 'CER') {
      res = await approveCerStepAction(approvalId, decisionNote, signatureUrl)
    } else if (subType === 'ASSET_BORROW') {
      res = await approveAssetBorrow(targetId, decisionNote, signatureUrl)
    } else if (subType === 'ASSET_TRANSFER') {
      res = await approveAssetTransfer(targetId, decisionNote, undefined, signatureUrl)
    } else if (subType === 'ASSET_DISPOSAL') {
      res = await approveAssetDisposal(targetId, decisionNote, signatureUrl)
    } else {
      return { success: false, message: 'Jenis aset tidak valid.' }
    }
    revalidatePath('/dashboard/approval')
    return res
  } catch (err: any) {
    console.error('[approveAssetManagementItemAction] Error:', err)
    return { success: false, message: err?.message || 'Gagal menyetujui pengajuan aset.' }
  }
}

export async function rejectAssetManagementItemAction({
  subType,
  targetId,
  approvalId,
  rejectionReason,
}: {
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  targetId: number
  approvalId: number
  rejectionReason: string
}) {
  try {
    let res: any
    if (subType === 'CER') {
      res = await rejectCerStepAction(approvalId, rejectionReason)
    } else if (subType === 'ASSET_BORROW') {
      res = await rejectAssetBorrow(targetId, rejectionReason)
    } else if (subType === 'ASSET_TRANSFER') {
      res = await rejectAssetTransfer(targetId, rejectionReason)
    } else if (subType === 'ASSET_DISPOSAL') {
      res = await rejectAssetDisposal(targetId, rejectionReason)
    } else {
      return { success: false, message: 'Jenis aset tidak valid.' }
    }
    revalidatePath('/dashboard/approval')
    return res
  } catch (err: any) {
    console.error('[rejectAssetManagementItemAction] Error:', err)
    return { success: false, message: err?.message || 'Gagal menolak pengajuan aset.' }
  }
}

export async function revertAssetManagementItemAction({
  subType,
  targetId,
  approvalId,
  revertReason,
}: {
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  targetId: number
  approvalId: number
  revertReason: string
}) {
  try {
    let res: any
    if (subType === 'CER') {
      res = await revertCerStepAction(approvalId, revertReason)
    } else if (subType === 'ASSET_BORROW') {
      res = await revertAssetBorrowAction(targetId, revertReason)
    } else if (subType === 'ASSET_TRANSFER') {
      res = await revertAssetTransferAction(targetId, revertReason)
    } else if (subType === 'ASSET_DISPOSAL') {
      res = await revertAssetDisposalAction(targetId, revertReason)
    } else {
      return { success: false, message: 'Jenis aset tidak valid.' }
    }
    revalidatePath('/dashboard/approval')
    return res
  } catch (err: any) {
    console.error('[revertAssetManagementItemAction] Error:', err)
    return { success: false, message: err?.message || 'Gagal merevert pengajuan aset.' }
  }
}

/**
 * Fetch complete document model for live 2-column WYSIWYG Work Order preview in approval modal
 */
export async function getAssetManagementItemDetailAction({
  subType,
  targetId,
  approvalId,
}: {
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  targetId: number
  approvalId: number
}) {
  try {
    const [currentApproval] = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, approvalId))
      .limit(1)

    const resolvedCurrentLevel = currentApproval?.level || 1

    if (subType === 'CER') {
      const [cer] = await db
        .select({
          id: cerRequests.id,
          cerNumber: cerRequests.cerNumber,
          subject: cerRequests.subject,
          purchaseType: cerRequests.purchaseType,
          budgetSource: cerRequests.budgetSource,
          dateRequired: cerRequests.dateRequired,
          approvedAt: cerRequests.approvedAt,
          applicantName: employees.name,
          applicantSn: employees.employeeSn,
          applicantJobTitle: employees.jobTitle,
          departmentName: masterDepartments.name,
          sectionName: masterSections.name,
          siteName: sites.name,
          assetCategory: cerRequests.assetCategory,
          purchasePurpose: cerRequests.purchasePurpose,
          vendorName: cerRequests.vendorName,
          totalEstimatedPrice: cerRequests.totalEstimatedPrice,
          budgetCode: cerCapexBudgets.budgetCode,
          budgetName: cerCapexBudgets.budgetName,
          kelompokAset: cerRequests.kelompokAset,
          status: cerRequests.status,
          applicantSignatureUrl: cerRequests.applicantSignatureUrl,
          pdfUrl: cerRequests.pdfUrl,
          createdAt: cerRequests.createdAt,
        })
        .from(cerRequests)
        .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
        .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
        .leftJoin(masterSections, eq(cerRequests.sectionId, masterSections.id))
        .leftJoin(sites, eq(cerRequests.siteId, sites.id))
        .leftJoin(cerCapexBudgets, eq(cerRequests.capexBudgetId, cerCapexBudgets.id))
        .where(eq(cerRequests.id, targetId))
        .limit(1)

      if (!cer) return { success: false, message: 'CER tidak ditemukan.' }

      const items = await db
        .select()
        .from(cerItems)
        .where(eq(cerItems.cerRequestId, targetId))
        .orderBy(asc(cerItems.id))

      const approvalRows = await db
        .select({
          id: approvals.id,
          level: approvals.level,
          status: approvals.status,
          approverName: approvals.approverName,
          jobTitle: employees.jobTitle,
          decisionNote: approvals.decisionNote,
          formName: approvals.formName,
          signatureUrl: approvals.signatureUrl,
          reviewedAt: approvals.reviewedAt,
        })
        .from(approvals)
        .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
        .where(eq(approvals.cerRequestId, targetId))
        .orderBy(asc(approvals.level))

      const lastReviewed = approvalRows.filter((a) => a.reviewedAt).sort((a, b) => (new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()))[0]

      // Fetch all previously inputted custom asset categories from database
      const fromRequests = await db
        .selectDistinct({ val: cerRequests.kelompokAset })
        .from(cerRequests)
        .where(isNotNull(cerRequests.kelompokAset))

      const fromItems = await db
        .selectDistinct({ val: cerItems.assetGroup })
        .from(cerItems)
        .where(isNotNull(cerItems.assetGroup))

      const existingCategories = Array.from(
        new Set(
          [...fromRequests.map((r) => r.val), ...fromItems.map((i) => i.val)]
            .map((s) => (s || '').trim())
            .filter((s) => s.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'id'))

      return {
        success: true,
        subType: 'CER' as const,
        currentLevel: resolvedCurrentLevel,
        pdfUrl: cer.pdfUrl || `/api/assets/cer/${cer.id}/pdf`,
        existingCategories,
        summary: {
          documentNumber: cer.cerNumber,
          title: cer.subject,
          categoryLabel: 'Capital Expenditure Request (CER)',
          siteName: cer.siteName || '-',
          requesterName: cer.applicantName || '-',
          requesterJobTitle: cer.applicantJobTitle || 'Pemohon',
          totalAmount: cer.totalEstimatedPrice ? Number(cer.totalEstimatedPrice) : 0,
          budgetCode: cer.budgetCode || null,
          budgetName: cer.budgetName || null,
          lastNote: lastReviewed?.decisionNote || null,
        },
        doc: {
          id: cer.id,
          cerNumber: cer.cerNumber,
          subject: cer.subject,
          purchaseType: cer.purchaseType,
          budgetSource: cer.budgetSource,
          budgetCode: cer.budgetCode,
          budgetName: cer.budgetName,
          dateRequired: cer.dateRequired,
          submittedAt: cer.createdAt,
          approvedAt: cer.approvedAt,
          applicantName: cer.applicantName || '-',
          applicantSn: cer.applicantSn,
          applicantJobTitle: cer.applicantJobTitle,
          departmentName: cer.departmentName,
          sectionName: cer.sectionName,
          siteName: cer.siteName,
          assetCategory: cer.assetCategory,
          purchasePurpose: cer.purchasePurpose,
          vendorName: cer.vendorName,
          totalEstimatedPrice: cer.totalEstimatedPrice || '0',
          kelompokAset: cer.kelompokAset,
          status: cer.status,
          submitterSignatureUrl: cer.applicantSignatureUrl || null,
          items: items.map((it) => ({
            id: it.id,
            itemDescription: it.description,
            quantity: it.qty,
            estimatedPrice: Number(it.pricePerUnit),
            allocation: it.allocation || '',
            holderName: it.holderName || '',
            notes: [
              it.allocation ? `Alokasi: ${it.allocation}` : null,
              it.holderName ? `Holder: ${it.holderName}` : null,
            ].filter(Boolean).join(' • ') || undefined,
          })),
          approvals: approvalRows.map((a) => {
            let resolvedJobTitle = a.jobTitle || a.formName || 'Approver'
            if (resolvedJobTitle.toLowerCase().includes('verifikator tambahan')) {
              resolvedJobTitle = 'Approver'
            }
            return {
              level: a.level,
              title: a.formName || a.decisionNote || `Tahap ${a.level}`,
              approverName: a.approverName,
              jobTitle: resolvedJobTitle,
              status: a.status.toLowerCase(),
              reviewedAt: a.reviewedAt,
              signatureUrl: a.signatureUrl,
              decisionNote: a.decisionNote,
            }
          }),
        },
      }
    }

    if (subType === 'ASSET_BORROW') {
      const [borrow] = await db
        .select({
          id: assetBorrows.id,
          borrowNumber: assetBorrows.borrowNumber,
          borrowDate: assetBorrows.borrowDate,
          expectedReturnDate: assetBorrows.expectedReturnDate,
          actualReturnDate: assetBorrows.actualReturnDate,
          status: assetBorrows.status,
          borrowerName: assetBorrows.borrowerName,
          borrowerJobTitle: employees.jobTitle,
          borrowerSignatureUrl: assetBorrows.borrowerSignatureUrl,
          holderName: assetBorrows.holderName,
          assetName: assetBorrows.assetName,
          assetNumber: assetBorrows.assetNumber,
          serialNumber: assetBorrows.serialNumber,
          equipmentNotes: assetBorrows.equipmentNotes,
          purpose: assetBorrows.purpose,
          returnNotes: assetBorrows.returnNotes,
          submittedAt: assetBorrows.submittedAt,
          approvedAt: assetBorrows.approvedAt,
          pdfUrl: assetBorrows.pdfUrl,
          createdAt: assetBorrows.createdAt,
        })
        .from(assetBorrows)
        .leftJoin(employees, eq(assetBorrows.borrowerEmployeeId, employees.id))
        .where(eq(assetBorrows.id, targetId))
        .limit(1)

      if (!borrow) return { success: false, message: 'Peminjaman aset tidak ditemukan.' }

      const approvalRows = await db
        .select({
          id: approvals.id,
          level: approvals.level,
          status: approvals.status,
          approverName: approvals.approverName,
          jobTitle: employees.jobTitle,
          decisionNote: approvals.decisionNote,
          signatureUrl: approvals.signatureUrl,
          reviewedAt: approvals.reviewedAt,
        })
        .from(approvals)
        .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
        .where(eq(approvals.assetBorrowId, targetId))
        .orderBy(asc(approvals.level))

      const lastReviewed = approvalRows.filter((a) => a.reviewedAt).sort((a, b) => (new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()))[0]

      return {
        success: true,
        subType: 'ASSET_BORROW' as const,
        currentLevel: resolvedCurrentLevel,
        pdfUrl: borrow.pdfUrl,
        summary: {
          documentNumber: borrow.borrowNumber,
          title: `Pinjam: ${borrow.assetName}`,
          categoryLabel: 'Peminjaman Aset',
          siteName: '-',
          requesterName: borrow.borrowerName,
          requesterJobTitle: borrow.borrowerJobTitle || 'Peminjam',
          totalAmount: 0,
          lastNote: lastReviewed?.decisionNote || null,
          assetName: borrow.assetName,
          assetNumber: borrow.assetNumber || '-',
          serialNumber: borrow.serialNumber || '-',
          holderName: borrow.holderName,
          borrowDate: borrow.borrowDate,
          expectedReturnDate: borrow.expectedReturnDate,
          purpose: borrow.purpose,
          equipmentNotes: borrow.equipmentNotes || '-',
        },
        doc: {
          borrowNumber: borrow.borrowNumber,
          borrowDate: borrow.borrowDate,
          expectedReturnDate: borrow.expectedReturnDate,
          actualReturnDate: borrow.actualReturnDate,
          status: borrow.status,
          borrowerName: borrow.borrowerName,
          borrowerJobTitle: borrow.borrowerJobTitle || 'Peminjam',
          holderName: borrow.holderName,
          holderJobTitle: 'Pemegang Aset',
          assetName: borrow.assetName,
          assetNumber: borrow.assetNumber,
          serialNumber: borrow.serialNumber,
          equipmentNotes: borrow.equipmentNotes,
          purpose: borrow.purpose,
          returnNotes: borrow.returnNotes,
          submittedAt: borrow.submittedAt || borrow.createdAt,
          approvedAt: borrow.approvedAt,
          submitterSignatureUrl: borrow.borrowerSignatureUrl || null,
          approvals: approvalRows.map((a) => ({
            level: a.level,
            title: a.decisionNote || 'Persetujuan Pemegang Aset',
            approverName: a.approverName,
            jobTitle: a.jobTitle || a.decisionNote || 'Pemegang Aset',
            status: a.status.toLowerCase(),
            reviewedAt: a.reviewedAt,
            signatureUrl: a.signatureUrl,
            decisionNote: a.decisionNote,
          })),
        },
      }
    }

    if (subType === 'ASSET_TRANSFER') {
      const [transfer] = await db
        .select({
          id: assetTransfers.id,
          transferNumber: assetTransfers.transferNumber,
          submittedAt: assetTransfers.submittedAt,
          transferredAt: assetTransfers.transferredAt,
          status: assetTransfers.status,
          assetName: assetTransfers.assetName,
          assetNumber: assetTransfers.assetNumber,
          serialNumber: assetTransfers.serialNumber,
          currentHolderEmployeeId: assetTransfers.currentHolderEmployeeId,
          currentHolderName: assetTransfers.currentHolderName,
          currentLocationName: assetTransfers.currentLocationName,
          newHolderEmployeeId: assetTransfers.newHolderEmployeeId,
          newHolderName: assetTransfers.newHolderName,
          targetLocationName: assetTransfers.targetLocationName,
          equipmentChecklist: assetTransfers.equipmentChecklist,
          equipmentOtherNote: assetTransfers.equipmentOtherNote,
          notes: assetTransfers.notes,
          assetPhotos: assetTransfers.assetPhotos,
          applicantSignatureUrl: assetTransfers.applicantSignatureUrl,
          pdfUrl: assetTransfers.pdfUrl,
          createdAt: assetTransfers.createdAt,
        })
        .from(assetTransfers)
        .where(eq(assetTransfers.id, targetId))
        .limit(1)

      if (!transfer) return { success: false, message: 'Transfer aset tidak ditemukan.' }

      const assetPhotosArray: Array<{ fileName: string; fileUrl: string }> = (() => {
        try {
          const parsed = JSON.parse(transfer.assetPhotos || '[]')
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()

      const [holderEmp, newHolderEmp, approvalRows] = await Promise.all([
        db
          .select({ jobTitle: employees.jobTitle, employeeSn: employees.employeeSn })
          .from(employees)
          .where(eq(employees.id, transfer.currentHolderEmployeeId))
          .limit(1)
          .then((res) => res[0] || null),
        db
          .select({ jobTitle: employees.jobTitle, employeeSn: employees.employeeSn })
          .from(employees)
          .where(eq(employees.id, transfer.newHolderEmployeeId))
          .limit(1)
          .then((res) => res[0] || null),
        db
          .select({
            id: approvals.id,
            level: approvals.level,
            status: approvals.status,
            approverName: approvals.approverName,
            jobTitle: employees.jobTitle,
            decisionNote: approvals.decisionNote,
            signatureUrl: approvals.signatureUrl,
            reviewedAt: approvals.reviewedAt,
          })
          .from(approvals)
          .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
          .where(eq(approvals.assetTransferId, targetId))
          .orderBy(asc(approvals.level)),
      ])

      const lastReviewed = approvalRows.filter((a) => a.reviewedAt).sort((a, b) => (new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()))[0]

      return {
        success: true,
        subType: 'ASSET_TRANSFER' as const,
        currentLevel: resolvedCurrentLevel,
        pdfUrl: transfer.pdfUrl || `/api/assets/transfer/${transfer.id}/pdf`,
        summary: {
          documentNumber: transfer.transferNumber,
          title: `Transfer: ${transfer.assetName}`,
          categoryLabel: 'Mutasi / Transfer Aset',
          siteName: `${transfer.currentLocationName || '-'} -> ${transfer.targetLocationName || '-'}`,
          requesterName: transfer.currentHolderName,
          requesterJobTitle: holderEmp?.jobTitle || 'Pemegang Aset',
          totalAmount: 0,
          lastNote: lastReviewed?.decisionNote || null,
        },
        doc: {
          transferNumber: transfer.transferNumber,
          submittedAt: transfer.submittedAt || transfer.createdAt,
          transferredAt: transfer.transferredAt,
          status: transfer.status,
          assetName: transfer.assetName,
          assetNumber: transfer.assetNumber,
          serialNumber: transfer.serialNumber,
          currentHolderName: transfer.currentHolderName,
          currentHolderJobTitle: holderEmp?.jobTitle || 'Pemegang Aset Lama',
          currentLocationName: transfer.currentLocationName,
          newHolderName: transfer.newHolderName,
          newHolderJobTitle: newHolderEmp?.jobTitle || 'Pemegang Aset Baru',
          targetLocationName: transfer.targetLocationName,
          equipmentChecklist: transfer.equipmentChecklist,
          equipmentOtherNote: transfer.equipmentOtherNote,
          notes: transfer.notes,
          assetPhotos: assetPhotosArray,
          applicantSignatureUrl: transfer.applicantSignatureUrl,
          submitterSignatureUrl: transfer.applicantSignatureUrl,
          approvals: approvalRows.map((a) => ({
            level: a.level,
            title: a.decisionNote || `Tahap ${a.level}`,
            approverName: a.approverName,
            jobTitle: a.jobTitle || a.decisionNote || `Approver Step ${a.level}`,
            status: a.status.toLowerCase(),
            reviewedAt: a.reviewedAt,
            signatureUrl: a.signatureUrl,
            decisionNote: a.decisionNote,
          })),
        },
      }
    }

    if (subType === 'ASSET_DISPOSAL') {
      const [disposal] = await db
        .select({
          id: assetDisposals.id,
          disposalNumber: assetDisposals.disposalNumber,
          disposalDate: assetDisposals.disposalDate,
          status: assetDisposals.status,
          applicantName: assetDisposals.applicantName,
          applicantSn: employees.employeeSn,
          applicantJobTitle: employees.jobTitle,
          departmentName: assetDisposals.departmentName,
          sectionName: masterSections.name,
          siteName: assetDisposals.siteName,
          assetName: assetDisposals.assetName,
          assetNumber: assetDisposals.assetNumber,
          purchaseYear: assetDisposals.purchaseYear,
          notes: assetDisposals.notes,
          attachments: assetDisposals.attachments,
          submittedAt: assetDisposals.submittedAt,
          approvedAt: assetDisposals.approvedAt,
          createdAt: assetDisposals.createdAt,
        })
        .from(assetDisposals)
        .leftJoin(employees, eq(assetDisposals.applicantEmployeeId, employees.id))
        .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
        .where(eq(assetDisposals.id, targetId))
        .limit(1)

      if (!disposal) return { success: false, message: 'Asset Disposal tidak ditemukan.' }

      const approvalRows = await db
        .select({
          id: approvals.id,
          level: approvals.level,
          status: approvals.status,
          approverName: approvals.approverName,
          jobTitle: employees.jobTitle,
          decisionNote: approvals.decisionNote,
          signatureUrl: approvals.signatureUrl,
          reviewedAt: approvals.reviewedAt,
        })
        .from(approvals)
        .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
        .where(eq(approvals.assetDisposalId, targetId))
        .orderBy(asc(approvals.level))

      const lastReviewed = approvalRows.filter((a) => a.reviewedAt).sort((a, b) => (new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()))[0]

      return {
        success: true,
        subType: 'ASSET_DISPOSAL' as const,
        currentLevel: resolvedCurrentLevel,
        pdfUrl: `/api/assets/disposal/${disposal.id}/pdf`,
        summary: {
          documentNumber: disposal.disposalNumber,
          title: `Disposal: ${disposal.assetName}`,
          categoryLabel: 'Penghapusan Aset (Disposal)',
          siteName: disposal.siteName || '-',
          requesterName: disposal.applicantName,
          requesterJobTitle: disposal.applicantJobTitle || 'Pemohon',
          totalAmount: 0,
          lastNote: lastReviewed?.decisionNote || null,
        },
        doc: {
          disposalNumber: disposal.disposalNumber,
          disposalDate: disposal.disposalDate,
          status: disposal.status,
          applicantName: disposal.applicantName,
          applicantSn: disposal.applicantSn,
          applicantJobTitle: disposal.applicantJobTitle,
          departmentName: disposal.departmentName,
          sectionName: disposal.sectionName,
          siteName: disposal.siteName,
          assetName: disposal.assetName,
          assetNumber: disposal.assetNumber,
          purchaseYear: disposal.purchaseYear,
          notes: disposal.notes,
          attachments: JSON.parse(disposal.attachments || '[]'),
          submittedAt: disposal.submittedAt || disposal.createdAt,
          approvedAt: disposal.approvedAt,
          approvals: approvalRows.map((a) => ({
            level: a.level,
            title: a.decisionNote || `Tahap ${a.level}`,
            approverName: a.approverName,
            jobTitle: a.jobTitle || a.decisionNote || 'Approver',
            status: a.status.toLowerCase(),
            reviewedAt: a.reviewedAt,
            signatureUrl: a.signatureUrl,
            decisionNote: a.decisionNote,
          })),
        },
      }
    }

    return { success: false, message: 'Jenis formulir aset tidak dikenal.' }
  } catch (err: any) {
    console.error('[getAssetManagementItemDetailAction] Error:', err)
    return { success: false, message: err?.message || 'Gagal memuat dokumen aset.' }
  }
}
