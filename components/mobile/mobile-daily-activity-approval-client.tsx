'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  FileSignature,
  FileText,
  MapPin,
  RotateCcw,
  Send,
  User,
} from 'lucide-react'

import { MobileDailyActivityForm } from '@/components/mobile/mobile-daily-activity-form'
import { ACTIVITY_DRAFT_STORAGE_KEY } from '@/lib/offline-sync'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SessionItem = {
  id: number
  label: string
  group: string
  unitNumber: string
  remark: string
  duration: string
  points: number
  photoUrl: string | null
  startedAt?: Date | string | null
  endedAt?: Date | string | null
}

type StepApproval = {
  id: number
  stepOrder: number
  stepLabel: string
  approverEmployeeId: number | null
  approverName: string | null
  approverEmail: string | null
  approverRole: string | null
  status: string
  signatureDataUrl: string | null
  remarks: string | null
  signedAt: Date | string | null
}

type ApprovalData = {
  sessionId: number
  sessionCode: string
  workDate: Date | string
  shiftCode: string | null
  status: string
  submittedAt: Date | string | null
  approvedAt: Date | string | null
  employee: {
    id: number
    name: string
    sn: string | null
    department: string | null
    section: string | null
    jobTitle: string | null
  }
  site: {
    id: number | null
    name: string | null
    customerName: string | null
  }
  totals: {
    itemCount: number
    totalPoints: number
  }
  sessionItems: SessionItem[]
  approvals: StepApproval[]
  permissions: {
    canApprove: boolean
    isCurrentEmployee: boolean
    currentEmployeeId: number
    currentEmployeeEmail: string
    currentEmployeeName: string
    accessRole: string
  }
}

function formatDate(val: Date | string | null | undefined) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const REVISION_DRAFT_KEY = 'hero-daily-activity-revision-draft'

type MobileDailyActivityApprovalClientProps = {
  data: ApprovalData
  employeeData?: any
  hierarchy?: any
  teamMembers?: any[]
  allEmployees?: any[]
  defaultStartTime?: string
  defaultEndTime?: string
}

export function MobileDailyActivityApprovalClient({
  data,
  employeeData,
  hierarchy,
  teamMembers = [],
  allEmployees = [],
  defaultStartTime = '',
  defaultEndTime = '',
}: MobileDailyActivityApprovalClientProps) {
  const router = useRouter()
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [draftReady, setDraftReady] = useState(false)

  const revertedStep = data.approvals.find(
    (a) => (a.status || '').toLowerCase() === 'reverted' || (a.status || '').toLowerCase() === 'needs_revision'
  )
  const isReverted = (data.status || '').toLowerCase().includes('revert') || Boolean(revertedStep)

  // Build a draft payload from existing session data and write to localStorage
  // so MobileDailyActivityForm can restore it on mount
  useEffect(() => {
    if (!employeeData) {
      setDraftReady(true)
      return
    }

    const workDate = data.workDate ? new Date(data.workDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

    // Map session items to selfInputActivities format
    const selfInputActivities = data.sessionItems.map((item) => {
      // Try to find matching library activity
      const matchingLib = employeeData.availableLibrary?.find(
        (lib: any) => lib.activityName === item.label || lib.activityCode === item.group
      )

      return {
        libraryActivityId: matchingLib ? String(matchingLib.id) : '',
        equipmentNo: item.unitNumber || '',
        startTime: item.startedAt || '',
        endTime: item.endedAt || '',
        materialUsed: '',
        notes: item.remark || '',
      }
    })

    // Find selected library IDs from session items
    const selectedLibraryIds = selfInputActivities
      .filter((a) => a.libraryActivityId)
      .map((a) => a.libraryActivityId)

    // Build route session items from session items
    const routeSessionItems = data.sessionItems.map((item) => ({
      routeItemId: null,
      overtimeCommandLetterItemId: null,
      libraryActivityId: null,
      snapshotLabel: item.label,
      snapshotGroupName: item.group,
      snapshotPayload: {},
      unitNumber: item.unitNumber || '',
      materialUsed: '',
      remark: item.remark || '',
      startedAt: item.startedAt || '',
      endedAt: item.endedAt || '',
      isChecked: true,
      actualPoints: item.points || 0,
      tireCount: 0,
      sortOrder: 0,
    }))

    const draftPayload = {
      employeeId: data.employee.id,
      sourceMode: 'self_input',
      assignmentId: '',
      libraryActivityId: selectedLibraryIds[0] || '',
      selectedLibraryActivityIds: selectedLibraryIds,
      selfInputActivities,
      routeTemplateId: '',
      overtimeCommandLetterId: '',
      routeShiftCode: data.shiftCode || '',
      routeSummaryRemark: '',
      routeSessionItems: selectedLibraryIds.length === 0 ? routeSessionItems : [],
      customActivityName: '',
      customActivityDescription: '',
      equipmentNo: data.sessionItems[0]?.unitNumber || '',
      startTime: defaultStartTime || `${workDate}T08:00`,
      endTime: defaultEndTime || `${workDate}T17:00`,
      materialUsed: '',
      notes: revertedStep?.remarks || '',
      manualLocation: '',
      locationName: data.site?.name || '',
      gpsLat: '',
      gpsLng: '',
      gpsValid: false,
      boundaryStatus: 'unknown',
      boundaryMessage: '',
      photo: null,
      photos: [],
      teamMemberEmployeeIds: [],
    }

    try {
      localStorage.setItem(REVISION_DRAFT_KEY, JSON.stringify(draftPayload))
    } catch {
      // localStorage full or unavailable
    }

    setDraftReady(true)
  }, [data, employeeData, hierarchy, defaultStartTime, defaultEndTime, revertedStep])

  // Cleanup revision draft on unmount
  useEffect(() => {
    return () => {
      try {
        localStorage.removeItem(REVISION_DRAFT_KEY)
      } catch {
        // ignore
      }
    }
  }, [])

  if (!employeeData) {
    // Fallback: render the old simple form if employee data couldn't be fetched
    return (
      <div className="space-y-4 pb-6 text-slate-900">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Link href="/mobile/activity" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" /> Kembali ke Aktivitas Harian
          </Link>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
            <RotateCcw className="size-4 text-amber-600 shrink-0" />
            Catatan Revisi dari Approver
          </div>
          <p className="text-xs font-semibold text-amber-950 bg-white/90 p-3 rounded-lg border border-amber-200 leading-relaxed">
            &quot;{revertedStep?.remarks || 'Mohon periksa dan perbarui data aktivitas di bawah ini sebelum mengajukan kembali.'}&quot;
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Data form tidak tersedia. Silakan kembali dan coba lagi.</p>
        </div>
      </div>
    )
  }

  if (!draftReady) return null

  return (
    <div className="space-y-4 pb-6 text-slate-900">
      {/* Back link */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <Link
          href="/mobile/activity"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" /> Kembali ke Aktivitas Harian
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPdfOpen(true)}
          className="h-8 rounded-lg border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 text-xs font-bold gap-1"
        >
          <FileText className="size-3.5 text-blue-600" /> Preview PDF
        </Button>
      </div>

      {/* Reversion Warning Alert Banner */}
      {isReverted && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
            <RotateCcw className="size-4 text-amber-600 shrink-0" />
            Catatan Revisi dari Approver
          </div>
          <p className="text-xs font-semibold text-amber-950 bg-white/90 p-3 rounded-lg border border-amber-200 leading-relaxed shadow-2xs">
            &quot;{revertedStep?.remarks || revertedStep?.stepLabel || 'Mohon periksa dan perbarui data aktivitas di bawah ini sebelum mengajukan kembali.'}&quot;
          </p>
        </div>
      )}

      {/* Document Info Header */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{data.sessionCode}</span>
            <h1 className="text-base font-bold text-gray-900 mt-1.5">{data.employee?.name || 'Teknisi'}</h1>
            <p className="text-xs text-gray-500 font-medium">
              {data.employee?.jobTitle || 'Staff'} &bull; SN: {data.employee?.sn || '-'}
            </p>
          </div>
          <Badge
            className={
              isReverted
                ? 'bg-amber-500 text-white border-0 text-[10px] font-bold px-2.5 py-1'
                : (data.status || '').toLowerCase().includes('approved')
                  ? 'bg-emerald-600 text-white border-0 text-[10px] font-bold px-2.5 py-1'
                  : 'bg-blue-600 text-white border-0 text-[10px] font-bold px-2.5 py-1'
            }
          >
            {isReverted ? 'REVISI DOKUMEN' : (data.status || 'SUBMITTED').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
            <Calendar className="size-4 text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Tanggal Kerja</p>
              <p className="font-semibold text-gray-800">{formatDate(data.workDate)}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
            <MapPin className="size-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Lokasi Site</p>
              <p className="font-semibold text-gray-800 truncate">{data.site?.name || 'Site Operasional'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Full Activity Form (same as input page) */}
      <MobileDailyActivityForm
        employeeId={data.employee.id}
        employee={employeeData.employee}
        hierarchy={hierarchy}
        assignments={employeeData.assignments || []}
        availableLibrary={employeeData.availableLibrary || []}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        routeChecklist={employeeData.routeChecklist}
        availableRouteFolders={employeeData.availableRouteFolders || []}
        standaloneOvertimeChecklist={employeeData.standaloneOvertimeChecklist}
        site={employeeData.site}
        teamMembers={teamMembers}
        allEmployees={allEmployees}
      />

      {/* Approver Timeline Steps */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <User className="size-4 text-emerald-600" /> Alur Approval Dokumen
        </h3>
        <div className="space-y-2">
          {data.approvals.map((app, i) => (
            <div key={app.id || i} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-gray-400">{app.stepLabel}</span>
                <p className="font-bold text-gray-800">{app.approverName || 'Approver'}</p>
                {app.remarks && <p className="text-[11px] italic text-gray-500 mt-0.5">&quot;{app.remarks}&quot;</p>}
              </div>
              <Badge
                className={
                  (app.status || '').toLowerCase() === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border-0 text-[10px] font-extrabold'
                    : (app.status || '').toLowerCase().includes('revert')
                      ? 'bg-amber-100 text-amber-800 border-0 text-[10px] font-extrabold'
                      : 'bg-gray-200 text-gray-700 border-0 text-[10px] font-extrabold'
                }
              >
                {(app.status || 'PENDING').toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Preview Modal Dialog */}
      <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-4 rounded-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#003461] flex items-center gap-1.5">
              <FileText className="size-4 text-blue-600" /> PDF Formal Preview - {data.sessionCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[10px] space-y-1">
              <p><strong>DOKUMEN:</strong> {data.sessionCode}</p>
              <p><strong>TEKNISI:</strong> {data.employee?.name} ({data.employee?.sn})</p>
              <p><strong>TANGGAL:</strong> {formatDate(data.workDate)}</p>
              <p><strong>STATUS:</strong> {(data.status || '').toUpperCase()}</p>
            </div>
            {revertedStep?.remarks && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <strong>Catatan Revisi:</strong> &quot;{revertedStep.remarks}&quot;
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
