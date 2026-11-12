import fs from 'fs'

// ==========================================
// 1. PATCH CER TABLE (cer-table.tsx)
// ==========================================
let cerTable = fs.readFileSync('app/dashboard/assets/cer/components/cer-table.tsx', 'utf8')

// Add mode to CerTableProps
cerTable = cerTable.replace(
  `export interface CerTableProps {\r
  requests: CerOverviewData['requests']\r
  currentEmployee: CerOverviewData['currentEmployee']\r
  isFinanceOrAdmin?: boolean\r
  onRefresh?: () => void\r
}`,
  `export interface CerTableProps {\r
  requests: CerOverviewData['requests']\r
  mode?: 'requests' | 'receiving'\r
  currentEmployee: CerOverviewData['currentEmployee']\r
  isFinanceOrAdmin?: boolean\r
  onRefresh?: () => void\r
}`
)

cerTable = cerTable.replace(
  `export function CerTable({ requests, currentEmployee, isFinanceOrAdmin = false, onRefresh }: CerTableProps) {`,
  `export function CerTable({ requests, mode = 'requests', currentEmployee, isFinanceOrAdmin = false, onRefresh }: CerTableProps) {`
)

// In rows, calculate canDownloadPdf
cerTable = cerTable.replace(
  `const isApplicant = currentEmployee && r.applicantEmployeeId === currentEmployee.id\r
                const canDeleteThisRow =`,
  `const isApplicant = Boolean(currentEmployee && (r.applicantEmployeeId === currentEmployee.id || r.createdById === currentEmployee.email))\r
                const isSuperAdmin = Boolean(isFinanceOrAdmin || (currentEmployee?.role && isSuperAdminRole(currentEmployee.role)))\r
                const canDownloadPdf = isSuperAdmin || isApplicant\r
                const canDeleteThisRow =`
)

// Add import of isSuperAdminRole if not present
if (!cerTable.includes('isSuperAdminRole')) {
  cerTable = cerTable.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}

// Replace PDF download in table row
const oldCerTablePdf = `{/* 6. Download PDF (If available) */}\r
                        {r.pdfUrl && (\r
                          <a\r
                            href={resolveUploadUrl(r.pdfUrl)}\r
                            target="_blank"\r
                            rel="noopener noreferrer"\r
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-700"\r
                            title="Unduh Dokumen PDF"\r
                          >\r
                            <Download className="h-3.5 w-3.5" />\r
                          </a>\r
                        )}`

const newCerTablePdf = `{/* 6. Download PDF (Only in receiving tab and only for applicant or admin) */}\r
                        {mode === 'receiving' && canDownloadPdf && (\r
                          <div className="flex items-center gap-1">\r
                            {r.pdfUrl && (\r
                              <a\r
                                href={resolveUploadUrl(r.pdfUrl)}\r
                                target="_blank"\r
                                rel="noopener noreferrer"\r
                                className="inline-flex h-7 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 gap-1"\r
                                title="Unduh Dokumen CER Capex PDF"\r
                              >\r
                                <Download className="h-3 w-3" /> CER\r
                              </a>\r
                            )}\r
                            {r.bastPdfUrl && (\r
                              <a\r
                                href={resolveUploadUrl(r.bastPdfUrl)}\r
                                target="_blank"\r
                                rel="noopener noreferrer"\r
                                className="inline-flex h-7 items-center justify-center rounded-md border border-purple-300 bg-purple-50 px-2 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 gap-1"\r
                                title="Unduh Dokumen BAST PDF"\r
                              >\r
                                <Download className="h-3 w-3" /> BAST\r
                              </a>\r
                            )}\r
                          </div>\r
                        )}`

cerTable = cerTable.replace(oldCerTablePdf, newCerTablePdf)

// In Detail Modal, replace download buttons with applicant/admin check
const oldDetailCerPdf = `{selectedCer.pdfUrl ? (\r
                  <a\r
                    href={resolveUploadUrl(selectedCer.pdfUrl)}\r
                    target="_blank"\r
                    rel="noopener noreferrer"\r
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"\r
                  >\r
                    <Download className="h-3.5 w-3.5" /> Unduh Dokumen CER PDF\r
                  </a>\r
                ) : (\r
                  <div />\r
                )}`

const newDetailCerPdf = `{(() => {\r
                  const isAppDetail = Boolean(currentEmployee && (selectedCer.applicantEmployeeId === currentEmployee.id || selectedCer.createdById === currentEmployee.email))\r
                  const isSuperAdminDetail = Boolean(isFinanceOrAdmin || (currentEmployee?.role && isSuperAdminRole(currentEmployee.role)))\r
                  const canDownloadDetail = isSuperAdminDetail || isAppDetail\r
\r
                  if (!canDownloadDetail) return <div />\r
\r
                  return (\r
                    <div className="flex items-center gap-2 flex-wrap">\r
                      {selectedCer.pdfUrl && (\r
                        <a\r
                          href={resolveUploadUrl(selectedCer.pdfUrl)}\r
                          target="_blank"\r
                          rel="noopener noreferrer"\r
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"\r
                        >\r
                          <Download className="h-3.5 w-3.5" /> Unduh Dokumen CER PDF\r
                        </a>\r
                      )}\r
                      {selectedCer.bastPdfUrl && (\r
                        <a\r
                          href={resolveUploadUrl(selectedCer.bastPdfUrl)}\r
                          target="_blank"\r
                          rel="noopener noreferrer"\r
                          className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"\r
                        >\r
                          <Download className="h-3.5 w-3.5" /> Unduh Dokumen BAST PDF\r
                        </a>\r
                      )}\r
                    </div>\r
                  )\r
                })()}`

cerTable = cerTable.replace(oldDetailCerPdf, newDetailCerPdf)
fs.writeFileSync('app/dashboard/assets/cer/components/cer-table.tsx', cerTable, 'utf8')
console.log('Successfully updated cer-table.tsx')

// ==========================================
// 2. PATCH DISPOSAL API ROUTE (route.ts)
// ==========================================
let disposalRoute = fs.readFileSync('app/api/assets/disposal/[id]/pdf/route.ts', 'utf8')
if (!disposalRoute.includes('auth.api.getSession')) {
  disposalRoute = disposalRoute.replace(
    `import { NextResponse } from 'next/server'`,
    `import { NextResponse } from 'next/server'\r
import { headers } from 'next/headers'\r
import { auth } from '@/lib/auth'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )

  const checkInsertTarget = `if (!disposal) {\r
      return NextResponse.json({ error: 'Data Asset Disposal tidak ditemukan' }, { status: 404 })\r
    }`

  const checkInsertReplacement = `if (!disposal) {\r
      return NextResponse.json({ error: 'Data Asset Disposal tidak ditemukan' }, { status: 404 })\r
    }\r
\r
    // Security check: Only applicant or admin can download PDF\r
    const session = await auth.api.getSession({ headers: await headers() })\r
    if (!session || !session.user) {\r
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 })\r
    }\r
    const isSuperAdmin = isSuperAdminRole(session.user.role)\r
    const isApplicant = disposal.applicantEmployeeId && (session.user as any).employeeId === disposal.applicantEmployeeId || disposal.createdById === session.user.id\r
    if (!isSuperAdmin && !isApplicant) {\r
      return NextResponse.json(\r
        { error: 'Akses ditolak. Dokumen PDF ini hanya dapat diunduh oleh pengaju dan administrator.' },\r
        { status: 403 }\r
      )\r
    }`

  disposalRoute = disposalRoute.replace(checkInsertTarget, checkInsertReplacement)
  fs.writeFileSync('app/api/assets/disposal/[id]/pdf/route.ts', disposalRoute, 'utf8')
  console.log('Successfully updated disposal pdf route.ts')
}

// ==========================================
// 3. PATCH DISPOSAL DASHBOARD & MODAL
// ==========================================
let disposalDash = fs.readFileSync('app/dashboard/assets/disposal/components/asset-disposal-dashboard.tsx', 'utf8')
if (!disposalDash.includes('isSuperAdminRole')) {
  disposalDash = disposalDash.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}

const oldDisposalDownload = `              <TooltipProvider delayDuration={200}>\r
                <Tooltip>\r
                  <TooltipTrigger asChild>\r
                    <Button\r
                      variant="ghost"\r
                      size="sm"\r
                      onClick={(e) => handleDownloadPdf(e, row)}\r
                      className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"\r
                    >\r
                      <Download className="size-4" />\r
                    </Button>\r
                  </TooltipTrigger>\r
                  <TooltipContent>Download PDF (A4)</TooltipContent>\r
                </Tooltip>\r
              </TooltipProvider>`

const newDisposalDownload = `{(() => {\r
                const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
                const isApplicant = Boolean(currentEmployee?.id != null && (row.applicantEmployeeId === currentEmployee.id || row.createdById === currentEmployee.id))\r
                const canDownload = isSuperAdmin || isApplicant\r
                if (!canDownload) return null\r
                return (\r
                  <TooltipProvider delayDuration={200}>\r
                    <Tooltip>\r
                      <TooltipTrigger asChild>\r
                        <Button\r
                          variant="ghost"\r
                          size="sm"\r
                          onClick={(e) => handleDownloadPdf(e, row)}\r
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"\r
                        >\r
                          <Download className="size-4" />\r
                        </Button>\r
                      </TooltipTrigger>\r
                      <TooltipContent>Download PDF (A4)</TooltipContent>\r
                    </Tooltip>\r
                  </TooltipProvider>\r
                )\r
              })()}`

disposalDash = disposalDash.replace(oldDisposalDownload, newDisposalDownload)
fs.writeFileSync('app/dashboard/assets/disposal/components/asset-disposal-dashboard.tsx', disposalDash, 'utf8')
console.log('Successfully updated asset-disposal-dashboard.tsx')

let disposalModal = fs.readFileSync('app/dashboard/assets/disposal/components/asset-disposal-detail-modal.tsx', 'utf8')
if (!disposalModal.includes('isSuperAdminRole')) {
  disposalModal = disposalModal.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}

const oldModalDownload = `          {item.status === 'approved' && (\r
            <Button\r
              size="sm"\r
              variant="outline"\r
              onClick={handleDownloadPdf}\r
              className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"\r
            >\r
              <Download className="size-4" />\r
              Download PDF (A4)\r
            </Button>\r
          )}`

const newModalDownload = `{(() => {\r
            const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
            const isApplicant = Boolean(currentEmployee?.id != null && (item.applicantEmployeeId === currentEmployee.id || item.createdById === currentEmployee.id))\r
            const canDownload = isSuperAdmin || isApplicant\r
            if (!canDownload || item.status !== 'approved') return null\r
            return (\r
              <Button\r
                size="sm"\r
                variant="outline"\r
                onClick={handleDownloadPdf}\r
                className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"\r
              >\r
                <Download className="size-4" />\r
                Download PDF (A4)\r
              </Button>\r
            )\r
          })()}`

disposalModal = disposalModal.replace(oldModalDownload, newModalDownload)
fs.writeFileSync('app/dashboard/assets/disposal/components/asset-disposal-detail-modal.tsx', disposalModal, 'utf8')
console.log('Successfully updated asset-disposal-detail-modal.tsx')

// ==========================================
// 4. PATCH BORROW DASHBOARD & MODAL
// ==========================================
let borrowDash = fs.readFileSync('app/dashboard/assets/borrow/components/asset-borrow-dashboard.tsx', 'utf8')
if (!borrowDash.includes('isSuperAdminRole')) {
  borrowDash = borrowDash.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}
if (!borrowDash.includes('Download,')) {
  borrowDash = borrowDash.replace(
    `RotateCcw,`,
    `RotateCcw,\r
  Download,`
  )
}

const borrowActionInsert = `{row.canReturn && (\r
            <TooltipProvider delayDuration={200}>\r
              <Tooltip>\r
                <TooltipTrigger asChild>\r
                  <Button\r
                    variant="ghost"\r
                    size="sm"\r
                    onClick={() => handleViewDetail(row)}\r
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"\r
                  >\r
                    <RotateCcw className="size-4" />\r
                  </Button>\r
                </TooltipTrigger>\r
                <TooltipContent>Kembalikan Aset</TooltipContent>\r
              </Tooltip>\r
            </TooltipProvider>\r
          )}`

const borrowActionReplacement = `${borrowActionInsert}\r
\r
          {(() => {\r
            const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
            const isApplicant = Boolean(currentEmployee?.id != null && (row.borrowerEmployeeId === currentEmployee.id || row.createdById === currentEmployee.id))\r
            const canDownload = isSuperAdmin || isApplicant\r
            if (!canDownload || !row.pdfUrl) return null\r
            return (\r
              <TooltipProvider delayDuration={200}>\r
                <Tooltip>\r
                  <TooltipTrigger asChild>\r
                    <a\r
                      href={resolveUploadUrl(row.pdfUrl)}\r
                      target="_blank"\r
                      rel="noopener noreferrer"\r
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"\r
                    >\r
                      <Download className="size-4" />\r
                    </a>\r
                  </TooltipTrigger>\r
                  <TooltipContent>Download PDF (A4)</TooltipContent>\r
                </Tooltip>\r
              </TooltipProvider>\r
            )\r
          })()}`

borrowDash = borrowDash.replace(borrowActionInsert, borrowActionReplacement)
fs.writeFileSync('app/dashboard/assets/borrow/components/asset-borrow-dashboard.tsx', borrowDash, 'utf8')
console.log('Successfully updated asset-borrow-dashboard.tsx')

let borrowModal = fs.readFileSync('app/dashboard/assets/borrow/components/asset-borrow-detail-modal.tsx', 'utf8')
if (!borrowModal.includes('isSuperAdminRole')) {
  borrowModal = borrowModal.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}
if (!borrowModal.includes('Download,')) {
  borrowModal = borrowModal.replace(
    `CheckCircle2,`,
    `CheckCircle2,\r
  Download,`
  )
}

const borrowModalActionInsert = `<div className="flex items-center gap-2">`
const borrowModalActionReplacement = `<div className="flex items-center gap-2">\r
            {(() => {\r
              const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
              const isApplicant = Boolean(currentEmployee?.id != null && (borrow.borrowerEmployeeId === currentEmployee.id || borrow.createdById === currentEmployee.id))\r
              const canDownload = isSuperAdmin || isApplicant\r
              if (!canDownload || !borrow.pdfUrl) return null\r
              return (\r
                <Button\r
                  size="sm"\r
                  variant="outline"\r
                  asChild\r
                  className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"\r
                >\r
                  <a href={resolveUploadUrl(borrow.pdfUrl)} target="_blank" rel="noopener noreferrer">\r
                    <Download className="size-4" /> Download PDF (A4)\r
                  </a>\r
                </Button>\r
              )\r
            })()}`

borrowModal = borrowModal.replace(borrowModalActionInsert, borrowModalActionReplacement)
fs.writeFileSync('app/dashboard/assets/borrow/components/asset-borrow-detail-modal.tsx', borrowModal, 'utf8')
console.log('Successfully updated asset-borrow-detail-modal.tsx')

// ==========================================
// 5. PATCH TRANSFER DASHBOARD & MODAL
// ==========================================
let transferDash = fs.readFileSync('app/dashboard/assets/transfer/components/asset-transfer-dashboard.tsx', 'utf8')
if (!transferDash.includes('isSuperAdminRole')) {
  transferDash = transferDash.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}
if (!transferDash.includes('Download,')) {
  transferDash = transferDash.replace(
    `RotateCcw,`,
    `RotateCcw,\r
  Download,`
  )
}

const transferActionInsert = `{row.canReceive && (\r
            <TooltipProvider delayDuration={200}>\r
              <Tooltip>\r
                <TooltipTrigger asChild>\r
                  <Button\r
                    variant="ghost"\r
                    size="sm"\r
                    onClick={() => handleViewDetail(row)}\r
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"\r
                  >\r
                    <PackageCheck className="size-4" />\r
                  </Button>\r
                </TooltipTrigger>\r
                <TooltipContent>Konfirmasi Terima Fisik</TooltipContent>\r
              </Tooltip>\r
            </TooltipProvider>\r
          )}`

const transferActionReplacement = `${transferActionInsert}\r
\r
          {(() => {\r
            const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
            const isApplicant = Boolean(currentEmployee?.id != null && (row.applicantEmployeeId === currentEmployee.id || row.createdById === currentEmployee.id))\r
            const canDownload = isSuperAdmin || isApplicant\r
            if (!canDownload || !row.pdfUrl) return null\r
            return (\r
              <TooltipProvider delayDuration={200}>\r
                <Tooltip>\r
                  <TooltipTrigger asChild>\r
                    <a\r
                      href={resolveUploadUrl(row.pdfUrl)}\r
                      target="_blank"\r
                      rel="noopener noreferrer"\r
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"\r
                    >\r
                      <Download className="size-4" />\r
                    </a>\r
                  </TooltipTrigger>\r
                  <TooltipContent>Download PDF (A4)</TooltipContent>\r
                </Tooltip>\r
              </TooltipProvider>\r
            )\r
          })()}`

transferDash = transferDash.replace(transferActionInsert, transferActionReplacement)
fs.writeFileSync('app/dashboard/assets/transfer/components/asset-transfer-dashboard.tsx', transferDash, 'utf8')
console.log('Successfully updated asset-transfer-dashboard.tsx')

let transferModal = fs.readFileSync('app/dashboard/assets/transfer/components/asset-transfer-detail-modal.tsx', 'utf8')
if (!transferModal.includes('isSuperAdminRole')) {
  transferModal = transferModal.replace(
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'`,
    `import { resolveUploadUrl } from '@/lib/resolve-upload-url'\r
import { isSuperAdminRole } from '@/lib/hero-access'`
  )
}
if (!transferModal.includes('Download,')) {
  transferModal = transferModal.replace(
    `CheckCircle2,`,
    `CheckCircle2,\r
  Download,`
  )
}

const transferModalActionInsert = `<div className="flex items-center gap-2">`
const transferModalActionReplacement = `<div className="flex items-center gap-2">\r
            {(() => {\r
              const isSuperAdmin = Boolean(currentEmployee?.role && isSuperAdminRole(currentEmployee.role))\r
              const isApplicant = Boolean(currentEmployee?.id != null && (transfer.applicantEmployeeId === currentEmployee.id || transfer.createdById === currentEmployee.id))\r
              const canDownload = isSuperAdmin || isApplicant\r
              if (!canDownload || !transfer.pdfUrl) return null\r
              return (\r
                <Button\r
                  size="sm"\r
                  variant="outline"\r
                  asChild\r
                  className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"\r
                >\r
                  <a href={resolveUploadUrl(transfer.pdfUrl)} target="_blank" rel="noopener noreferrer">\r
                    <Download className="size-4" /> Download PDF (A4)\r
                  </a>\r
                </Button>\r
              )\r
            })()}`

transferModal = transferModal.replace(transferModalActionInsert, transferModalActionReplacement)
fs.writeFileSync('app/dashboard/assets/transfer/components/asset-transfer-detail-modal.tsx', transferModal, 'utf8')
console.log('Successfully updated asset-transfer-detail-modal.tsx')
