import type { Metadata } from 'next'
import { getMyAttendancePermissionRequests } from '@/app/actions/attendance'
import { PermissionRequestForm } from '@/components/attendance/permission-request-form'

export const metadata: Metadata = {
  title: 'Izin Attendance | HERO Mobile',
}

export default async function MobileAttendancePermissionPage() {
  const requests = await getMyAttendancePermissionRequests()

  return (
    <div className="space-y-4">
      <PermissionRequestForm variant="mobile" />
      <section className="rounded-[1.1rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-slate-950">Riwayat Izin Saya</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{requests.length} data</span>
        </div>
        <div className="mt-3 space-y-3">
          {requests.length ? requests.map((request) => (
            <div key={request.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{request.permissionType === 'late' ? 'Terlambat' : 'Sakit'}</p>
                  <p className="text-xs text-slate-500">{String(request.startDate)}{request.endDate !== request.startDate ? ` s/d ${request.endDate}` : ''}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600 ring-1 ring-slate-200">{request.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{request.permissionType === 'late' ? request.lateReason : request.sickCategory}{request.returnTime ? ` • ${request.returnTime}` : ''}</p>
              {request.reason ? <p className="mt-1 text-xs text-slate-500">{request.reason}</p> : null}
              {request.approverNote ? <p className="mt-1 text-xs font-semibold text-slate-700">HR: {request.approverNote}</p> : null}
            </div>
          )) : <p className="text-sm text-slate-500">Belum ada riwayat izin.</p>}
        </div>
      </section>
    </div>
  )
}
