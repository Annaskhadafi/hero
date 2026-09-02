import { AdminStatusBadge } from '@/components/admin-status-badge'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ApprovalRequestDetails({ item }: { item: ApprovalInboxItem }) {
  const isFormWo = Boolean(
    item.repairFormWo ||
      item.activityType === 'Work Order' ||
      item.requestKindLabel?.toLowerCase().includes('work order') ||
      item.title?.toLowerCase().includes('wo')
  )

  const wo = item.repairFormWo
  let parsedWoItems: Array<{
    sn?: string
    serialNo?: string
    description?: string
    size?: string
    brand?: string
    category?: string
    job?: string
    pattern?: string
    noUnit?: string
    pos?: string
    kondisi?: string
    workType?: string
    harga?: number | string
    price?: number | string
    qty?: number
    keterangan?: string
  }> = []

  if (wo?.items) {
    try {
      parsedWoItems = JSON.parse(wo.items)
    } catch {
      parsedWoItems = []
    }
  }

  const workItems = item?.workItems || []
  const evidencePhotoUrls = item?.evidencePhotoUrls || []
  const evidenceProgressPercent = item?.evidenceProgressPercent ?? 0

  if (isFormWo) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl bg-[#eef6fb] p-4 text-[#082033]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#486275] uppercase">
                FORM WORK ORDER • {wo?.jenisPengajuan?.toUpperCase() || 'SERVICE / REPAIR'}
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight">{wo?.noPengajuan || item.requestNumber || item.title}</h3>
            </div>
            <AdminStatusBadge value={wo?.status || 'Pending'} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-[#60788a]">Customer</dt>
              <dd className="mt-0.5 font-bold text-slate-800">{wo?.customer || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[#60788a]">Site</dt>
              <dd className="mt-0.5 font-bold text-slate-800">{wo?.site || item.siteName || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[#60788a]">Pemohon</dt>
              <dd className="mt-0.5 font-bold text-slate-800">{wo?.pemohon || item.requesterName || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[#60788a]">Total Amount</dt>
              <dd className="mt-0.5 font-bold text-emerald-700 tabular-nums">
                {wo?.totalAmount
                  ? `Rp ${Number(wo.totalAmount).toLocaleString('id-ID')}`
                  : '-'}
              </dd>
            </div>
          </dl>
        </section>

        {wo?.catatanPengajuan && (
          <section>
            <h4 className="text-sm font-black text-[#082033]">Catatan Pengajuan</h4>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#486275] bg-white rounded-xl p-3 border border-slate-200">
              {wo.catatanPengajuan}
            </p>
          </section>
        )}

        {parsedWoItems.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Barang / Pekerjaan ({parsedWoItems.length})
            </h4>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {parsedWoItems.map((it, idx) => {
                const title = it.description || it.job || it.workType || it.size || `Item #${idx + 1}`
                const subtitle = [it.sn || it.serialNo, it.brand, it.pattern, it.noUnit, it.pos]
                  .filter(Boolean)
                  .join(' • ')
                const numPrice = it.harga || it.price
                return (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{title}</p>
                      {subtitle ? (
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                    {numPrice ? (
                      <div className="text-right font-bold text-emerald-700 tabular-nums shrink-0">
                        Rp {Number(numPrice).toLocaleString('id-ID')}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#eef6fb] p-4 text-[#082033]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#486275] uppercase">
              {item.requestNumber || item.activityType || (item as unknown as { documentNumber?: string }).documentNumber || 'DAR-REQ'}
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight">{item.title || 'Pengajuan'}</h3>
          </div>
          <AdminStatusBadge value={item.requestKindLabel || (item as unknown as { category?: string }).category || 'Daily Activity'} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#60788a]">Site</dt>
            <dd className="mt-0.5 font-bold">{item.siteName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#60788a]">Total lembur / Poin</dt>
            <dd className="mt-0.5 font-bold tabular-nums">{item.overtimeLabel || (item as any).totalPoints ? `${(item as any).totalPoints} pts` : '—'}</dd>
          </div>
          {(item as any).tireCount ? (
            <div>
              <dt className="text-xs font-semibold text-[#60788a]">Jumlah Tire</dt>
              <dd className="mt-0.5 font-bold tabular-nums">{(item as any).tireCount} unit</dd>
            </div>
          ) : null}
          <div className="col-span-2 border-t border-[#d5e5ef] pt-3">
            <dt className="text-xs font-semibold text-[#60788a]">Tanggal</dt>
            <dd className="mt-1 text-base font-black">{formatDate(item.startTime || (item as any).workDate || (item as any).submittedAt)}</dd>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <dt className="text-xs font-semibold text-[#60788a]">Mulai</dt>
            <dd className="mt-1 text-xl font-black tracking-tight tabular-nums">
              {formatTime(item.startTime)}
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <dt className="text-xs font-semibold text-[#60788a]">Selesai</dt>
            <dd className="mt-1 text-xl font-black tracking-tight tabular-nums">
              {formatTime(item.endTime)}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h4 className="text-sm font-black text-[#082033]">Deskripsi pekerjaan</h4>
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#486275]">
          {item.description || 'Tidak ada deskripsi pekerjaan.'}
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black text-[#082033]">Daily Activity</h4>
          <AdminStatusBadge value={item.dailyActivityStatus || 'Aktif'} />
        </div>
        {workItems.length > 0 ? (
          <div className="mt-2 divide-y divide-[#dce9f2] overflow-hidden rounded-2xl bg-[#f7fbfe]">
            {workItems.map((workItem) => (
              <article key={workItem.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#082033]">{workItem.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#60788a]">
                      {workItem.employeeName} • Unit {workItem.unitNumber || '-'}
                    </p>
                  </div>
                  <AdminStatusBadge value={workItem.isChecked ? 'selesai' : 'belum selesai'} />
                </div>
                {workItem.description ? (
                  <p className="mt-2 text-xs leading-5 text-[#486275]">{workItem.description}</p>
                ) : null}
                {workItem.startedAt || workItem.endedAt ? (
                  <p className="mt-2 text-xs font-semibold text-[#486275] tabular-nums">
                    Aktual: {workItem.startedAt ? formatDateTime(workItem.startedAt) : '-'} —{' '}
                    {workItem.endedAt ? formatDateTime(workItem.endedAt) : '-'}
                  </p>
                ) : null}
                {workItem.remark ? (
                  <p className="mt-1 text-xs leading-5 text-[#486275]">
                    Catatan: {workItem.remark}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-[#f7fbfe] p-3 text-sm text-[#60788a]">
            Belum ada checklist Daily Activity pada pengajuan ini.
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black text-[#082033]">Evidence</h4>
          <span className="text-sm font-black text-[#003f78] tabular-nums">
            {evidenceProgressPercent}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce9f2]">
          <div
            className="h-full rounded-full bg-[#087f73]"
            style={{ width: `${evidenceProgressPercent}%` }}
          />
        </div>
        {evidencePhotoUrls.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {evidencePhotoUrls.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl bg-[#eef6fb] transition-transform active:scale-[0.98]"
              >
                <img
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm">
            <span className="font-bold text-amber-900">Belum ada evidence</span>
            <span className="font-semibold text-amber-800">0 foto</span>
          </div>
        )}
      </section>
    </div>
  )
}
