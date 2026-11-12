import fs from 'fs'

let code = fs.readFileSync('lib/approval-workspace.ts', 'utf8')

// 1. Add imports after ensurePtwApprovalsExist
const importTarget = "import { ensurePtwApprovalsExist, syncPtwApproverNames } from '@/app/dashboard/hse/izin-kerja-ptw/actions'"
const newImports = `${importTarget}\r
import { cerRequests } from '@/db/schema/cer'\r
import { assetBorrows } from '@/db/schema/asset-borrow'\r
import { assetTransfers } from '@/db/schema/asset-transfer'\r
import { assetDisposals } from '@/db/schema/asset-disposal'\r
import { approveCerStepAction, rejectCerStepAction } from '@/app/dashboard/assets/cer/actions'\r
import { approveAssetBorrow, rejectAssetBorrow } from '@/app/dashboard/assets/borrow/actions'\r
import { approveAssetTransfer, rejectAssetTransfer } from '@/app/dashboard/assets/transfer/actions'\r
import { approveAssetDisposal, rejectAssetDisposal } from '@/app/dashboard/assets/disposal/actions'`

if (!code.includes(importTarget)) {
  console.error('Import target not found!')
  process.exit(1)
}
code = code.replace(importTarget, newImports)

// 2. Add functions before export async function getApprovalCenterData
const funcTarget = "export async function getApprovalCenterData("
const newFunctions = `export interface AssetManagementInboxItem {
  id: string
  approvalId: number
  targetId: number
  category: 'ASSET_MANAGEMENT'
  categoryLabel: string
  subType: 'CER' | 'ASSET_BORROW' | 'ASSET_TRANSFER' | 'ASSET_DISPOSAL'
  subTypeLabel: string
  documentNumber: string
  title: string
  employeeName: string
  department?: string
  siteName?: string
  stepLabel: string
  approverName?: string | null
  approverRole?: string | null
  dueState: string
  dueAt: Date
  submittedAt: Date
  url: string
  totalAmount?: number
  rawAssetItem: {
    documentNumber: string
    requesterName: string
    assetName: string
    categoryLabel: string
    details: Array<{ label: string; value: string }>
  }
}

export async function getAssetManagementInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
): Promise<AssetManagementInboxItem[]> {
  try {
    const normalizedEmail = normalizeMatchValue(email)
    const employeeEmailNorm = normalizeMatchValue(currentEmployee?.email)
    const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)

    const isUserSuperAdmin = currentEmployee?.role && isSuperAdminRole(currentEmployee.role)

    const pendingApprovals = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        status: approvals.status,
        approverName: approvals.approverName,
        approverEmail: approvals.approverEmail,
        approverEmployeeId: approvals.approverEmployeeId,
        approverRole: approvals.approverRole,
        submittedAt: approvals.submittedAt,
        cerRequestId: approvals.cerRequestId,
        assetBorrowId: approvals.assetBorrowId,
        assetTransferId: approvals.assetTransferId,
        assetDisposalId: approvals.assetDisposalId,
      })
      .from(approvals)
      .where(
        and(
          eq(approvals.status, 'pending'),
          or(
            isNotNull(approvals.cerRequestId),
            isNotNull(approvals.assetBorrowId),
            isNotNull(approvals.assetTransferId),
            isNotNull(approvals.assetDisposalId)
          )
        )
      )
      .orderBy(desc(approvals.submittedAt))

    const userApprovals = pendingApprovals.filter((appr) => {
      if (isUserSuperAdmin) return true
      const emailMatches =
        (normalizedEmail && normalizeMatchValue(appr.approverEmail) === normalizedEmail) ||
        (employeeEmailNorm && normalizeMatchValue(appr.approverEmail) === employeeEmailNorm)
      const empMatches = currentEmployee?.id != null && appr.approverEmployeeId === currentEmployee.id
      const nameMatches =
        normalizedEmployeeName && normalizeMatchValue(appr.approverName) === normalizedEmployeeName
      return Boolean(emailMatches || empMatches || nameMatches)
    })

    if (userApprovals.length === 0) return []

    const cerIds = userApprovals.map((a) => a.cerRequestId).filter((id): id is number => id != null)
    const borrowIds = userApprovals.map((a) => a.assetBorrowId).filter((id): id is number => id != null)
    const transferIds = userApprovals.map((a) => a.assetTransferId).filter((id): id is number => id != null)
    const disposalIds = userApprovals.map((a) => a.assetDisposalId).filter((id): id is number => id != null)

    const [cerRows, borrowRows, transferRows, disposalRows] = await Promise.all([
      cerIds.length > 0 ? db.select().from(cerRequests).where(inArray(cerRequests.id, cerIds)) : [],
      borrowIds.length > 0 ? db.select().from(assetBorrows).where(inArray(assetBorrows.id, borrowIds)) : [],
      transferIds.length > 0 ? db.select().from(assetTransfers).where(inArray(assetTransfers.id, transferIds)) : [],
      disposalIds.length > 0 ? db.select().from(assetDisposals).where(inArray(assetDisposals.id, disposalIds)) : [],
    ])

    const cerMap = new Map(cerRows.map((r) => [r.id, r]))
    const borrowMap = new Map(borrowRows.map((r) => [r.id, r]))
    const transferMap = new Map(transferRows.map((r) => [r.id, r]))
    const disposalMap = new Map(disposalRows.map((r) => [r.id, r]))

    const items: AssetManagementInboxItem[] = []

    for (const appr of userApprovals) {
      if (appr.cerRequestId && cerMap.has(appr.cerRequestId)) {
        const c = cerMap.get(appr.cerRequestId)!
        items.push({
          id: \`asset-cer-\${c.id}\`,
          approvalId: appr.id,
          targetId: c.id,
          category: 'ASSET_MANAGEMENT',
          categoryLabel: 'Asset Management',
          subType: 'CER',
          subTypeLabel: 'CER (Capex)',
          documentNumber: c.cerNumber,
          title: \`CER: \${c.purpose || 'Pengadaan Aset'}\`,
          employeeName: c.applicantName,
          department: c.department || '-',
          siteName: c.siteName || '-',
          stepLabel: \`Tahap \${appr.level}: \${appr.approverRole || appr.approverName}\`,
          approverName: appr.approverName,
          approverRole: appr.approverRole,
          dueState: 'open',
          dueAt: new Date(new Date(c.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000),
          submittedAt: c.createdAt,
          url: '/dashboard/assets/cer',
          totalAmount: c.totalBudget ? Number(c.totalBudget) : undefined,
          rawAssetItem: {
            documentNumber: c.cerNumber,
            requesterName: c.applicantName,
            assetName: c.purpose,
            categoryLabel: 'Capital Expenditure Request (CER)',
            details: [
              { label: 'Nomor CER', value: c.cerNumber },
              { label: 'Kategori Aset', value: c.assetCategory || '-' },
              { label: 'Departemen', value: c.department || '-' },
              { label: 'Tujuan Pengadaan', value: c.purpose || '-' },
              { label: 'Total Anggaran', value: c.totalBudget ? \`Rp \${Number(c.totalBudget).toLocaleString('id-ID')}\` : '-' },
            ],
          },
        })
      } else if (appr.assetBorrowId && borrowMap.has(appr.assetBorrowId)) {
        const b = borrowMap.get(appr.assetBorrowId)!
        items.push({
          id: \`asset-borrow-\${b.id}\`,
          approvalId: appr.id,
          targetId: b.id,
          category: 'ASSET_MANAGEMENT',
          categoryLabel: 'Asset Management',
          subType: 'ASSET_BORROW',
          subTypeLabel: 'Peminjaman Aset',
          documentNumber: b.borrowNumber,
          title: \`Pinjam: \${b.assetName} (\${b.purpose})\`,
          employeeName: b.borrowerName,
          department: b.borrowerDepartment || '-',
          siteName: b.branch || '-',
          stepLabel: \`Persetujuan Pemegang: \${b.holderName}\`,
          approverName: appr.approverName,
          approverRole: appr.approverRole,
          dueState: 'open',
          dueAt: new Date(new Date(b.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000),
          submittedAt: b.createdAt,
          url: '/dashboard/assets/borrow',
          rawAssetItem: {
            documentNumber: b.borrowNumber,
            requesterName: b.borrowerName,
            assetName: b.assetName,
            categoryLabel: 'Peminjaman Aset',
            details: [
              { label: 'No. Peminjaman', value: b.borrowNumber },
              { label: 'Nama Aset', value: b.assetName },
              { label: 'No. Aset', value: b.assetNumber || '-' },
              { label: 'Peminjam', value: b.borrowerName },
              { label: 'Pemegang Aset Asal', value: b.holderName },
              { label: 'Keperluan', value: b.purpose },
            ],
          },
        })
      } else if (appr.assetTransferId && transferMap.has(appr.assetTransferId)) {
        const t = transferMap.get(appr.assetTransferId)!
        items.push({
          id: \`asset-transfer-\${t.id}\`,
          approvalId: appr.id,
          targetId: t.id,
          category: 'ASSET_MANAGEMENT',
          categoryLabel: 'Asset Management',
          subType: 'ASSET_TRANSFER',
          subTypeLabel: 'Mutasi Aset',
          documentNumber: t.transferNumber,
          title: \`Transfer: \${t.assetName}\`,
          employeeName: t.applicantName,
          department: t.departmentName || '-',
          siteName: \`\${t.sourceLocationSiteName || '-'} -> \${t.targetLocationSiteName || '-'}\`,
          stepLabel: \`Tahap \${appr.level}: \${appr.approverRole || appr.approverName}\`,
          approverName: appr.approverName,
          approverRole: appr.approverRole,
          dueState: 'open',
          dueAt: new Date(new Date(t.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000),
          submittedAt: t.createdAt,
          url: '/dashboard/assets/transfer',
          rawAssetItem: {
            documentNumber: t.transferNumber,
            requesterName: t.applicantName,
            assetName: t.assetName,
            categoryLabel: 'Mutasi / Transfer Aset',
            details: [
              { label: 'No. Transfer', value: t.transferNumber },
              { label: 'Nama Aset', value: t.assetName },
              { label: 'No. Aset', value: t.assetNumber || '-' },
              { label: 'Lokasi Asal', value: t.sourceLocationSiteName || '-' },
              { label: 'Lokasi Tujuan', value: t.targetLocationSiteName || '-' },
              { label: 'Pemegang Baru', value: t.targetHolderName || '-' },
              { label: 'Alasan Transfer', value: t.transferReason || '-' },
            ],
          },
        })
      } else if (appr.assetDisposalId && disposalMap.has(appr.assetDisposalId)) {
        const d = disposalMap.get(appr.assetDisposalId)!
        items.push({
          id: \`asset-disposal-\${d.id}\`,
          approvalId: appr.id,
          targetId: d.id,
          category: 'ASSET_MANAGEMENT',
          categoryLabel: 'Asset Management',
          subType: 'ASSET_DISPOSAL',
          subTypeLabel: 'Disposal Aset',
          documentNumber: d.disposalNumber,
          title: \`Disposal: \${d.assetName} (\${d.assetNumber || '-'})\`,
          employeeName: d.applicantName,
          department: d.departmentName || '-',
          siteName: d.siteName,
          stepLabel: \`Tahap \${appr.level}: \${appr.approverRole || appr.approverName}\`,
          approverName: appr.approverName,
          approverRole: appr.approverRole,
          dueState: 'open',
          dueAt: new Date(new Date(d.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000),
          submittedAt: d.createdAt,
          url: '/dashboard/assets/disposal',
          rawAssetItem: {
            documentNumber: d.disposalNumber,
            requesterName: d.applicantName,
            assetName: d.assetName,
            categoryLabel: 'Disposal / Penghapusan Aset',
            details: [
              { label: 'No. Disposal', value: d.disposalNumber },
              { label: 'Nama Aset', value: d.assetName },
              { label: 'No. Aset', value: d.assetNumber || '-' },
              { label: 'Tahun Pembelian', value: d.purchaseYear || '-' },
              { label: 'Cabang / Site', value: d.siteName },
              { label: 'Departemen', value: d.departmentName },
              { label: 'Catatan', value: d.notes },
            ],
          },
        })
      }
    }

    return items
  } catch (err) {
    console.error('[getAssetManagementInboxItems] Error:', err)
    return []
  }
}

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
    if (subType === 'CER') {
      return await approveCerStepAction(approvalId, decisionNote, signatureUrl)
    } else if (subType === 'ASSET_BORROW') {
      return await approveAssetBorrow(targetId, decisionNote, signatureUrl)
    } else if (subType === 'ASSET_TRANSFER') {
      return await approveAssetTransfer(targetId, decisionNote, signatureUrl)
    } else if (subType === 'ASSET_DISPOSAL') {
      return await approveAssetDisposal(targetId, decisionNote, signatureUrl)
    }
    return { success: false, message: 'Jenis aset tidak valid.' }
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
    if (subType === 'CER') {
      return await rejectCerStepAction(approvalId, rejectionReason)
    } else if (subType === 'ASSET_BORROW') {
      return await rejectAssetBorrow(targetId, rejectionReason)
    } else if (subType === 'ASSET_TRANSFER') {
      return await rejectAssetTransfer(targetId, rejectionReason)
    } else if (subType === 'ASSET_DISPOSAL') {
      return await rejectAssetDisposal(targetId, rejectionReason)
    }
    return { success: false, message: 'Jenis aset tidak valid.' }
  } catch (err: any) {
    console.error('[rejectAssetManagementItemAction] Error:', err)
    return { success: false, message: err?.message || 'Gagal menolak pengajuan aset.' }
  }
}

export async function getApprovalCenterData(`

code = code.replace(funcTarget, newFunctions)

// 3. Add assetManagementInboxItems to Promise.all in getApprovalCenterData
const promiseAllTarget = `      sopWinRequestInboxItems,
    ] = await Promise.all([`
const promiseAllReplacement = `      sopWinRequestInboxItems,
      assetManagementInboxItems,
    ] = await Promise.all([`

code = code.replace(promiseAllTarget, promiseAllReplacement)

const promiseListTarget = `      !isDailyOnly && !isOvertimeOnly && !isPtwOnly
        ? safeQuery(() => getSopWinRequestInboxItems(email, currentEmployee as any), [], "getSopWinRequestInboxItems")
        : Promise.resolve([]),
    ])`

const promiseListReplacement = `      !isDailyOnly && !isOvertimeOnly && !isPtwOnly
        ? safeQuery(() => getSopWinRequestInboxItems(email, currentEmployee as any), [], "getSopWinRequestInboxItems")
        : Promise.resolve([]),
      !isDailyOnly && !isOvertimeOnly && !isPtwOnly
        ? safeQuery(() => getAssetManagementInboxItems(email, currentEmployee as any), [], "getAssetManagementInboxItems")
        : Promise.resolve([]),
    ])`

code = code.replace(promiseListTarget, promiseListReplacement)

// 4. Update totalPendingWorkflowItems and dueSoon/overdue
const totalPendingTarget = `ptwInboxItems.length +\r\n    sopWinRequestInboxItems.length`
const totalPendingReplacement = `ptwInboxItems.length +\r\n    sopWinRequestInboxItems.length +\r\n    assetManagementInboxItems.length`
code = code.replace(totalPendingTarget, totalPendingReplacement)

// 5. Update inboxMetrics and return object
const metricTarget = `generalActivityCount: inboxRows.length,`
const metricReplacement = `generalActivityCount: inboxRows.length,\r\n      assetManagementCount: assetManagementInboxItems.length,`
code = code.replace(metricTarget, metricReplacement)

const returnTarget = `sopWinRequestInboxItems,\r\n    inboxGroups,`
const returnReplacement = `sopWinRequestInboxItems,\r\n    assetManagementInboxItems,\r\n    inboxGroups,`
code = code.replace(returnTarget, returnReplacement)

fs.writeFileSync('lib/approval-workspace.ts', code, 'utf8')
console.log('Successfully updated lib/approval-workspace.ts')
