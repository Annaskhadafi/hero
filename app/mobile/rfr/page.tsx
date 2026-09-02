import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  FileText,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Building2,
  Calendar,
  Download,
  ChevronRight,
  FileCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { listRfrRequests } from '@/app/actions/rfr'
import { MobileRfrListClient } from './mobile-client'

export const revalidate = 0

type PageProps = {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function MobileRfrPage({ searchParams }: PageProps) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const currentEmployee = await getCurrentEmployee()
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const result = await listRfrRequests({
    search: params.search,
    status: params.status,
    page,
    limit: 50,
  })

  const rfrList = result.data || []
  const total = result.total || 0
  const pendingCount = rfrList.filter((r: any) => r.status === 'in_progress' && r.currentStepOrder > 1).length
  const approvedCount = rfrList.filter((r: any) => r.status === 'approved').length
  const rejectOrRevertCount = rfrList.filter(
    (r: any) => r.status === 'rejected' || (r.status === 'in_progress' && r.currentStepOrder === 1)
  ).length

  return (
    <div className="space-y-4 pb-8 max-w-md mx-auto">
      {/* 1. Mobile Header */}
      <section className="rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
              Human Capital • Recruitment
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-300" />
              <span>Request For Recruitment</span>
            </h1>
            <p className="mt-1 text-xs text-sky-100/80 leading-relaxed">
              Daftar formulir permohonan rekrutmen karyawan baru.
            </p>
          </div>
          <Link
            prefetch={false}
            href="/mobile/rfr/new"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-sm active:scale-95 transition-transform"
            aria-label="Buat RFR Baru"
          >
            <Plus className="size-5" />
          </Link>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-xs text-center border border-white/10">
            <p className="text-[10px] font-semibold text-sky-200">Total RFR</p>
            <p className="mt-0.5 text-lg font-black">{total}</p>
          </div>
          <div className="rounded-xl bg-sky-500/20 p-2.5 backdrop-blur-xs text-center border border-sky-400/20">
            <p className="text-[10px] font-semibold text-sky-200">Pending</p>
            <p className="mt-0.5 text-lg font-black text-sky-200">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/20 p-2.5 backdrop-blur-xs text-center border border-emerald-400/20">
            <p className="text-[10px] font-semibold text-emerald-200">Disetujui</p>
            <p className="mt-0.5 text-lg font-black text-emerald-300">{approvedCount}</p>
          </div>
        </div>
      </section>

      {/* 3. Client Filter & List */}
      <MobileRfrListClient initialItems={rfrList as any} />
    </div>
  )
}
