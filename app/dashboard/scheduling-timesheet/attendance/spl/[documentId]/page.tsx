import { notFound } from 'next/navigation'

import { getSchedulingSplDocumentView } from '@/lib/scheduling-spl-document-access'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { HeroStatusBadge } from '@/components/templates'

export const dynamic = 'force-dynamic'

function activityDescription(value: string) {
  if (!value.trim().startsWith('{')) return value
  try {
    const meta = JSON.parse(value)
    return typeof meta.remark === 'string' ? meta.remark : ''
  } catch {
    return value
  }
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar' })
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })
}

export default async function SchedulingSplDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params
  const document = await getSchedulingSplDocumentView(documentId)
  if (!document) notFound()

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <article className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10">
        <header className="border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Surat Perintah Lembur</p>
              <h1 className="mt-1 text-2xl font-bold">{document.splNumber}</h1>
              <p className="mt-1 text-sm text-slate-600">{document.title}</p>
            </div>
            <HeroStatusBadge status={document.status} />
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Tanggal</dt><dd className="font-semibold">{formatDate(document.workDate)}</dd></div>
            <div><dt className="text-slate-500">Mulai</dt><dd className="font-semibold">{formatDateTime(document.plannedStartAt)}</dd></div>
            <div><dt className="text-slate-500">Selesai</dt><dd className="font-semibold">{formatDateTime(document.plannedEndAt)}</dd></div>
          </dl>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Pemohon</h2>
            <p className="mt-2 font-semibold">{document.requesterName || '—'}</p>
            <p className="text-sm text-slate-500">{document.requesterDepartment || '—'}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Peserta</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {document.participants.map((participant) => <li key={participant.employeeId}>{participant.employeeName || '—'} <span className="text-slate-500">({participant.shiftCode} · {participant.rosterType} · {participant.category.replace(/_/g, ' ')})</span></li>)}
            </ul>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Rincian pekerjaan</h2>
          <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {document.lineItems.length ? document.lineItems.map((item, index) => (
              <div className="grid gap-1 p-3 sm:grid-cols-[1fr_auto]" key={`${item.label}-${index}`}>
                <div><p className="font-semibold">{item.label}</p><p className="text-sm text-slate-600">{activityDescription(item.description)}</p></div>
                <span className="text-sm text-slate-500">{item.targetUnit || '—'} · {item.estimatedMinutes} menit · {item.plannedPoints} poin</span>
              </div>
            )) : <p className="p-3 text-sm text-slate-500">Tidak ada rincian pekerjaan.</p>}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Persetujuan dan tanda tangan</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {document.approvals.map((approval) => (
              <div className="rounded-lg border border-slate-200 p-4" key={approval.stepOrder}>
                <p className="font-semibold">{approval.stepLabel}</p>
                <p className="text-sm text-slate-600">{approval.approverName} · {approval.approverRole}</p>
                <p className="mt-1 text-xs uppercase text-emerald-700">{approval.status} · {formatDateTime(approval.signedAt)}</p>
                {approval.signatureDataUrl ? <img src={resolveUploadUrl(approval.signatureDataUrl)} alt={`Tanda tangan ${approval.approverName}`} className="mt-3 h-14 max-w-full object-contain" /> : approval.signedAt && ['approved', 'signed', 'completed'].includes(approval.status.toLowerCase()) ? <p className="mt-3 text-xs text-emerald-700">Ditandatangani secara digital · {formatDateTime(approval.signedAt)}</p> : <p className="mt-3 text-xs text-slate-500">Tanda tangan tidak tersedia.</p>}
                {approval.remarks ? <p className="mt-2 text-xs text-slate-600">Catatan: {approval.remarks}</p> : null}
              </div>
            ))}
          </div>
        </section>

        {document.requestNotes ? <section className="mt-6"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Catatan</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{document.requestNotes}</p></section> : null}
      </article>
    </main>
  )
}
