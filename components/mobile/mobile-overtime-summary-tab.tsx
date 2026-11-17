'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Download,
  Calendar,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getOvertimeSummaryWorkspaceDataAction,
  submitOvertimeSummaryAction,
  approveOvertimeSummaryAction,
  rejectOvertimeSummaryAction,
  type SummarySplApprovedItem,
  type OvertimeSummaryDetail,
} from '@/app/actions/overtime-summary'
import { generateSummarySplPdf } from '@/lib/timesheet/generate-attendance-pdf'

interface MobileOvertimeSummaryTabProps {
  currentEmployee: {
    id: number
    name: string
    employeeSn?: string | null
    siteId?: number | null
    siteName?: string | null
    department?: string | null
    section?: string | null
    email?: string | null
    role?: string | null
  }
}

export function MobileOvertimeSummaryTab({ currentEmployee }: MobileOvertimeSummaryTabProps) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [approvedItems, setApprovedItems] = useState<SummarySplApprovedItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalHours, setTotalHours] = useState<number>(0)
  const [summaryData, setSummaryData] = useState<OvertimeSummaryDetail | null>(null)
  const [isPjo, setIsPjo] = useState<boolean>(false)
  const [siteConfig, setSiteConfig] = useState<{
    requiresOnlineOvertimeSummary: boolean
    overtimeSummaryCutoffDay: number
  }>({ requiresOnlineOvertimeSummary: false, overtimeSummaryCutoffDay: 25 })
  const [signatories, setSignatories] = useState<any>(null)

  // Dialog states
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState<boolean>(false)
  const [submitNotes, setSubmitNotes] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false)

  // Approval / Rejection states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState<boolean>(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState<boolean>(false)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [expandedItems, setExpandedItems] = useState<boolean>(false)

  const loadData = async (month: string) => {
    setIsLoading(true)
    try {
      const res = await getOvertimeSummaryWorkspaceDataAction({
        employeeId: currentEmployee.id,
        periodMonth: month,
      })
      if (res.ok) {
        setApprovedItems(res.approvedItems || [])
        setTotalCount(res.totalCount || 0)
        setTotalHours(res.totalHours || 0)
        setSummaryData(res.summary || null)
        setIsPjo(Boolean(res.isPjo))
        setSiteConfig(res.siteConfig || { requiresOnlineOvertimeSummary: false, overtimeSummaryCutoffDay: 25 })
        setSignatories(res.signatories || null)
      } else {
        toast.error(res.error || 'Gagal memuat data Summary SPL.')
      }
    } catch (err: any) {
      toast.error('Gagal mengambil data Summary SPL.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedMonth)
  }, [selectedMonth, currentEmployee.id])

  const handleSubmit = () => {
    if (approvedItems.length === 0) {
      toast.error('Tidak ada data SPL yang berstatus APPROVED untuk diajukan.')
      return
    }
    startTransition(async () => {
      const res = await submitOvertimeSummaryAction({
        employeeId: currentEmployee.id,
        periodMonth: selectedMonth,
        notes: submitNotes,
      })
      if (res.ok) {
        toast.success(res.message || 'Summary SPL berhasil diajukan!')
        setIsSubmitDialogOpen(false)
        setSubmitNotes('')
        await loadData(selectedMonth)
      } else {
        toast.error(res.error || 'Gagal mengajukan Summary SPL.')
      }
    })
  }

  const handleApprove = (stepOrder: number) => {
    if (!summaryData) return
    startTransition(async () => {
      const res = await approveOvertimeSummaryAction({
        summaryId: summaryData.id,
        stepOrder,
      })
      if (res.ok) {
        toast.success(res.message || 'Summary SPL berhasil disetujui!')
        setIsApproveDialogOpen(false)
        await loadData(selectedMonth)
      } else {
        toast.error(res.error || 'Gagal menyetujui Summary SPL.')
      }
    })
  }

  const handleReject = (stepOrder: number) => {
    if (!summaryData) return
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi.')
      return
    }
    startTransition(async () => {
      const res = await rejectOvertimeSummaryAction({
        summaryId: summaryData.id,
        stepOrder,
        rejectionReason,
      })
      if (res.ok) {
        toast.success(res.message || 'Summary SPL telah ditolak.')
        setIsRejectDialogOpen(false)
        setRejectionReason('')
        await loadData(selectedMonth)
      } else {
        toast.error(res.error || 'Gagal menolak Summary SPL.')
      }
    })
  }

  const handleDownloadPdf = async () => {
    if (approvedItems.length === 0) {
      toast.error('Tidak ada data SPL untuk diunduh.')
      return
    }
    setIsDownloadingPdf(true)
    try {
      const [yearStr, monthStr] = selectedMonth.split('-')
      const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate()

      const daysData = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1
        const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`
        const item = approvedItems.find((it) => it.workDate === dateStr)
        const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, dayNum)
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
        return {
          day: dayNum,
          dayName: dayNames[dateObj.getDay()],
          isHoliday: dateObj.getDay() === 0,
          overtimeHours: item ? item.durationHours : 0,
          overtimeIntervals: item
            ? [
                {
                  start: item.plannedStartAt ? item.plannedStartAt.substring(11, 16) : '17:00',
                  end: item.plannedEndAt ? item.plannedEndAt.substring(11, 16) : '20:00',
                  hours: item.durationHours,
                  status: item.status,
                },
              ]
            : [],
          splTitle: item ? item.description : '',
        }
      })

      const pdfBytes = await generateSummarySplPdf({
        period: selectedMonth,
        employeeName: currentEmployee.name,
        employeeSn: currentEmployee.employeeSn || '-',
        department: currentEmployee.department || '',
        section: currentEmployee.section || '',
        siteName: currentEmployee.siteName || 'Site',
        documentTitle: 'SUMMARY SPL (PAYABLE SITE ALLOWANCE)',
        isPjo,
        signatures: {
          preparedBy: signatories?.preparedByName || currentEmployee.name,
          pjoLeader: signatories?.pjoName || 'PJO',
          approvedBy: signatories?.leaderName || 'Leader',
          isPjo,
        },
        days: daysData as any,
      })

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Summary_SPL_${currentEmployee.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PDF Summary SPL berhasil diunduh!')
    } catch (err: any) {
      toast.error('Gagal mengunduh PDF Summary SPL.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Active step approver check
  const activeStep = summaryData?.approvals?.find(
    (s) => s.stepOrder === summaryData.currentStepOrder && s.status === 'pending'
  )
  const isCurrentUserActiveApprover = Boolean(
    activeStep &&
      (activeStep.approverEmployeeId === currentEmployee.id ||
        (currentEmployee.email &&
          activeStep.approverEmail?.toLowerCase().trim() === currentEmployee.email.toLowerCase().trim()))
  )

  const formatPeriodLabel = (p: string) => {
    if (!p) return ''
    const [y, m] = p.split('-')
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ]
    return `${months[Number(m) - 1] || m} ${y}`
  }

  return (
    <div className="space-y-4">
      {/* Month Selector & Site Policy Badge */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-[#003461]" />
            <span className="text-xs font-bold text-slate-900">Periode Rekap Lembur</span>
          </div>
          {siteConfig.requiresOnlineOvertimeSummary && (
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200/60 text-[10px] font-bold">
              Cut-off: Tgl {siteConfig.overtimeSummaryCutoffDay}
            </Badge>
          )}
        </div>

        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 rounded-xl border-slate-200 text-xs font-bold bg-slate-50/50"
        />
      </section>

      {/* KPI Cards: Total SPL & Total Jam */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3.5 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FileSpreadsheet className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SPL Approved</p>
            <p className="text-lg font-black text-slate-900">{isLoading ? '...' : `${totalCount} Dok`}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3.5 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Lembur</p>
            <p className="text-lg font-black text-slate-900">{isLoading ? '...' : `${totalHours} Jam`}</p>
          </div>
        </div>
      </div>

      {/* Status Card & Actions */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100 space-y-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Status Approval Summary
          </p>

          {isLoading ? (
            <Badge variant="outline" className="text-[10px]">Memuat...</Badge>
          ) : summaryData?.status === 'approved' ? (
            <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
              <CheckCircle2 className="size-3" /> Approved
            </Badge>
          ) : summaryData?.status === 'pending' ? (
            <Badge className="bg-amber-500 text-white font-bold text-xs gap-1">
              <Clock className="size-3 animate-spin" /> Menunggu Step {summaryData.currentStepOrder}
            </Badge>
          ) : summaryData?.status === 'rejected' ? (
            <Badge className="bg-rose-600 text-white font-bold text-xs gap-1">
              <AlertCircle className="size-3" /> Ditolak
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-xs">
              Belum Diajukan
            </Badge>
          )}
        </div>

        {/* Approval Stepper Card */}
        {summaryData?.approvals && summaryData.approvals.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Alur Persetujuan Bertingkat:
            </p>
            <div className="space-y-1.5">
              {summaryData.approvals.map((step) => {
                const isStepApproved = step.status === 'approved'
                const isStepCurrent = summaryData.currentStepOrder === step.stepOrder && summaryData.status === 'pending'
                const isStepRejected = step.status === 'rejected'

                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                      isStepApproved
                        ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-900'
                        : isStepCurrent
                          ? 'bg-amber-50/70 border-amber-200/80 text-amber-900 font-bold'
                          : isStepRejected
                            ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                            : 'bg-white border-slate-200/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isStepApproved
                            ? 'bg-emerald-600 text-white'
                            : isStepCurrent
                              ? 'bg-amber-500 text-white animate-pulse'
                              : isStepRejected
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isStepApproved ? '✓' : step.stepOrder}
                      </div>
                      <div>
                        <span className="font-semibold">{step.stepLabel || `Step ${step.stepOrder}`}</span>
                        <p className="text-[10px] text-slate-500 font-normal">
                          {step.approverName || 'Approver'} ({step.approverRole})
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        isStepApproved
                          ? 'border-emerald-300 text-emerald-700'
                          : isStepCurrent
                            ? 'border-amber-400 text-amber-800'
                            : isStepRejected
                              ? 'border-rose-300 text-rose-700'
                              : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {isStepApproved
                        ? 'Disetujui'
                        : isStepCurrent
                          ? 'Menunggu'
                          : isStepRejected
                            ? 'Ditolak'
                            : 'Antrean'}
                    </Badge>
                  </div>
                )
              })}
            </div>
            {summaryData.rejectionReason && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                <strong>Alasan Penolakan:</strong> {summaryData.rejectionReason}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {(!summaryData || summaryData.status === 'draft' || summaryData.status === 'rejected') && (
            <Button
              onClick={() => setIsSubmitDialogOpen(true)}
              disabled={isLoading || approvedItems.length === 0}
              className="w-full h-11 rounded-xl bg-[#003461] hover:bg-[#002447] text-white font-bold text-xs gap-2 shadow-sm"
            >
              <Send className="size-4" />
              {summaryData?.status === 'rejected' ? 'Ajukan Ulang Summary SPL' : 'Ajukan Approval Summary SPL'}
            </Button>
          )}

          {/* If the current logged-in employee is the approver for this summary */}
          {isCurrentUserActiveApprover && activeStep && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={() => setIsApproveDialogOpen(true)}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                <Check className="size-4" /> Setujui Summary
              </Button>
              <Button
                onClick={() => setIsRejectDialogOpen(true)}
                variant="outline"
                className="h-10 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs gap-1.5"
              >
                <X className="size-4" /> Tolak Summary
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isLoading || approvedItems.length === 0 || isDownloadingPdf}
            className="w-full h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs gap-2"
          >
            {isDownloadingPdf ? (
              <Loader2 className="size-4 animate-spin text-slate-500" />
            ) : (
              <Download className="size-4 text-emerald-600" />
            )}
            Download Dokumen Resmi PDF (A4)
          </Button>
        </div>
      </section>

      {/* Collapsible List of Approved SPLs */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100 space-y-3">
        <button
          type="button"
          onClick={() => setExpandedItems(!expandedItems)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#003461]" />
            <span className="text-xs font-bold text-slate-900">
              Daftar SPL Masuk Rekap ({approvedItems.length})
            </span>
          </div>
          {expandedItems ? (
            <ChevronUp className="size-4 text-slate-400" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </button>

        {expandedItems && (
          <div className="space-y-2 pt-1">
            {approvedItems.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 italic">
                Tidak ada dokumen SPL yang berstatus APPROVED pada periode ini.
              </p>
            ) : (
              approvedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {item.workDate} ({item.dayName})
                    </span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {item.durationHours} Jam
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>{item.splNumber}</span>
                    <span>
                      {item.plannedStartAt?.substring(11, 16) || '17:00'} - {item.plannedEndAt?.substring(11, 16) || '20:00'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Dialog: Konfirmasi Pengajuan Summary SPL */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Ajukan Summary SPL Bulanan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pengajuan ini akan mengirimkan rekapitulasi lembur periode{' '}
              <strong>{formatPeriodLabel(selectedMonth)}</strong> ke approval bertingkat online.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Karyawan:</span>
                <span className="font-bold text-slate-800">{currentEmployee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dokumen:</span>
                <span className="font-bold text-slate-800">{totalCount} SPL Approved</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Akumulasi Jam:</span>
                <span className="font-bold text-emerald-700">{totalHours} Jam Lembur</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approver:</span>
                <span className="font-bold text-slate-800">
                  {isPjo ? 'Leader (1 Tingkat)' : 'PJO & Leader (2 Tingkat)'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Catatan Pengajuan (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan khusus jika ada..."
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                className="text-xs min-h-[60px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="h-10 rounded-xl bg-[#003461] hover:bg-[#002447] text-white text-xs font-bold gap-1"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Kirim Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Setujui Summary SPL */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Setujui Summary SPL
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anda akan menyetujui Summary SPL periode {formatPeriodLabel(selectedMonth)} untuk{' '}
              <strong>{currentEmployee.name}</strong> ({totalHours} Jam).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={() => handleApprove(summaryData?.currentStepOrder || 1)}
              disabled={isPending}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Ya, Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tolak Summary SPL */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700">
              Tolak Summary SPL
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Berikan alasan penolakan agar karyawan dapat memperbaiki atau mengajukan ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-1">
            <Label className="text-[11px] font-semibold text-slate-700">Alasan Penolakan *</Label>
            <Textarea
              placeholder="Tuliskan alasan penolakan secara jelas..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-xs min-h-[75px] rounded-xl"
            />
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={() => handleReject(summaryData?.currentStepOrder || 1)}
              disabled={isPending || !rejectionReason.trim()}
              className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              Tolak Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
