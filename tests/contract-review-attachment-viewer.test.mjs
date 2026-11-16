import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('approval workbench uses PdfCanvasViewer and resolveUploadUrl for contract review attachments', () => {
  const workbenchContent = fs.readFileSync('components/approval-workbench.tsx', 'utf8')
  assert.ok(
    workbenchContent.includes("import { PdfCanvasViewer } from '@/components/hero-genius/pdf-canvas-viewer'"),
    'approval workbench must import PdfCanvasViewer'
  )
  assert.ok(
    workbenchContent.includes('<PdfCanvasViewer'),
    'approval workbench must render PdfCanvasViewer'
  )
  assert.ok(
    workbenchContent.includes('resolveUploadUrl(previewAttachmentModal.fileUrl)'),
    'approval workbench must wrap previewAttachmentModal.fileUrl with resolveUploadUrl'
  )
  assert.ok(
    workbenchContent.includes('resolveUploadUrl(att.fileUrl)'),
    'approval workbench must wrap reviewer att.fileUrl with resolveUploadUrl'
  )
})

test('contract review client form uses PdfCanvasViewer and resolveUploadUrl for attachments', () => {
  const clientFormContent = fs.readFileSync('app/dashboard/hc/contract-review/form/client-form.tsx', 'utf8')
  assert.ok(
    clientFormContent.includes("from '@/components/hero-genius/pdf-canvas-viewer'") ||
      clientFormContent.includes('from "@/components/hero-genius/pdf-canvas-viewer"'),
    'client form must import PdfCanvasViewer'
  )
  assert.ok(
    clientFormContent.includes("from '@/lib/resolve-upload-url'") ||
      clientFormContent.includes('from "@/lib/resolve-upload-url"'),
    'client form must import resolveUploadUrl'
  )
  assert.ok(
    clientFormContent.includes('<PdfCanvasViewer'),
    'client form must render PdfCanvasViewer instead of raw iframe for PDF attachments'
  )
  assert.ok(
    clientFormContent.includes('resolveUploadUrl(att.fileUrl)'),
    'client form must wrap att.fileUrl with resolveUploadUrl'
  )
})

test('public approval uses PdfCanvasViewer and resolveUploadUrl for attachments', () => {
  const publicApprovalContent = fs.readFileSync('app/review/[token]/public-approval.tsx', 'utf8')
  assert.ok(
    publicApprovalContent.includes("import { PdfCanvasViewer } from '@/components/hero-genius/pdf-canvas-viewer'"),
    'public approval must import PdfCanvasViewer'
  )
  assert.ok(
    publicApprovalContent.includes("import { resolveUploadUrl } from '@/lib/resolve-upload-url'"),
    'public approval must import resolveUploadUrl'
  )
  assert.ok(
    publicApprovalContent.includes('<PdfCanvasViewer'),
    'public approval must render PdfCanvasViewer'
  )
  assert.ok(
    publicApprovalContent.includes('resolveUploadUrl(att.fileUrl)'),
    'public approval must wrap att.fileUrl with resolveUploadUrl'
  )
})

test('server action addContractReviewAttachment supports graceful session fallback', () => {
  const actionContent = fs.readFileSync('app/actions/contract-review.ts', 'utf8')
  assert.ok(
    actionContent.includes('reviewId = reviewId || approval.reviewId'),
    'addContractReviewAttachment must retain reviewId from approval or params'
  )
  assert.ok(
    actionContent.includes('getServerSession()'),
    'addContractReviewAttachment must check server session'
  )
})
