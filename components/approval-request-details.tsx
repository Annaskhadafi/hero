import { AdminStatusBadge } from '@/components/admin-status-badge'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

function formatDateTime(value: Date) {
  return value.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value: Date) {
  return value.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value: Date) {
  return value.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ApprovalRequestDetails({ item }: { item: ApprovalInboxItem }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#eef6fb] p-4 text-[#082033]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#486275] uppercase">
              {item.requestNumber || item.activityType}
            </p>
            <h3 className="mt-1 text-lg font-black tracking-tight">{item.title}</h3>
          </div>
          <AdminStatusBadge value={item.requestKindLabel} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#60788a]">Site</dt>
            <dd className="mt-0.5 font-bold">{item.siteName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#60788a]">Total lembur</dt>
            <dd className="mt-0.5 font-bold tabular-nums">{item.overtimeLabel}</dd>
          </div>
          <div className="col-span-2 border-t border-[#d5e5ef] pt-3">
            <dt className="text-xs font-semibold text-[#60788a]">Tanggal</dt>
            <dd className="mt-1 text-base font-black">{formatDate(item.startTime)}</dd>
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
          <AdminStatusBadge value={item.dailyActivityStatus} />
        </div>
        {item.workItems.length > 0 ? (
          <div className="mt-2 divide-y divide-[#dce9f2] overflow-hidden rounded-2xl bg-[#f7fbfe]">
            {item.workItems.map((workItem) => (
              <article key={workItem.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#082033]">{workItem.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#60788a]">
                      {workItem.employeeName} • Unit {workItem.unitNumber}
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
            Belum ada checklist Daily Activity pada SPL ini.
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black text-[#082033]">Evidence</h4>
          <span className="text-sm font-black text-[#003f78] tabular-nums">
            {item.evidenceProgressPercent}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce9f2]">
          <div
            className="h-full rounded-full bg-[#087f73]"
            style={{ width: `${item.evidenceProgressPercent}%` }}
          />
        </div>
        {item.evidencePhotoUrls.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {item.evidencePhotoUrls.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl bg-[#eef6fb] transition-transform active:scale-[0.98]"
              >
                <img
                  src={url}
                  alt={`Evidence SPL ${index + 1}`}
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
