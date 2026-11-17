'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { HeroFormDialog, HeroSearchableSelect, type HeroSearchableSelectOption } from '@/components/templates'
import {
  getContractReviewReminderRecipients,
  sendCustomContractReminder,
  type ReminderRecipientCandidate,
} from '@/app/actions/contract-review'
import { toast } from 'sonner'
import {
  Send,
  User,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Sparkles,
  Loader2,
  Mail,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

interface ContractReviewReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: number | null
  employeeName?: string
  allEmployees?: Array<{
    id: number
    name: string
    employeeId?: string
    email?: string
    jobTitle?: string
    section?: string
    siteName?: string
  }>
  onSuccess?: () => void
}

export function ContractReviewReminderDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  allEmployees = [],
  onSuccess,
}: ContractReviewReminderDialogProps) {
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [candidates, setCandidates] = useState<ReminderRecipientCandidate[]>([])
  const [employeeInfo, setEmployeeInfo] = useState<{
    id: number
    name: string
    employeeSn: string
    jobTitle: string
    section: string
    site: string
    daysLeft: number
    contractEndDate: string
  } | null>(null)

  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0)
  const [isCustomRecipient, setIsCustomRecipient] = useState(false)
  const [customEmployeeId, setCustomEmployeeId] = useState<string>('')
  const [customEmail, setCustomEmail] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')
  const [customRole, setCustomRole] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [isSending, setIsSending] = useState(false)

  // Fetch candidate recipients whenever dialog opens for employeeId
  useEffect(() => {
    if (!open || !employeeId) {
      setCandidates([])
      setEmployeeInfo(null)
      setSelectedCandidateIndex(0)
      setIsCustomRecipient(false)
      setCustomEmployeeId('')
      setCustomEmail('')
      setCustomName('')
      setCustomRole('')
      setNote('')
      return
    }

    let isMounted = true
    setIsLoadingRecipients(true)

    getContractReviewReminderRecipients(employeeId)
      .then((res) => {
        if (!isMounted) return
        if (res.success) {
          setCandidates(res.candidates || [])
          setEmployeeInfo(res.employeeInfo || null)
          // Default to first candidate
          setSelectedCandidateIndex(0)
          setIsCustomRecipient(false)
        } else {
          toast.error(res.error || 'Gagal memuat rekomendasi penerima reminder.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        toast.error(err?.message || 'Terjadi kesalahan sistem saat memuat penerima.')
      })
      .finally(() => {
        if (isMounted) setIsLoadingRecipients(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, employeeId])

  // Custom employee select options
  const employeeSelectOptions: HeroSearchableSelectOption[] = useMemo(() => {
    return allEmployees.map((e) => ({
      value: String(e.id),
      label: `${e.name}${e.employeeId ? ` (${e.employeeId})` : ''} - ${e.jobTitle || e.section || 'Karyawan'}`,
      description: e.email ? `${e.email} • ${e.section || ''}` : e.section || '',
    }))
  }, [allEmployees])

  const handleCustomEmployeeSelect = (val: string) => {
    setCustomEmployeeId(val)
    const emp = allEmployees.find((e) => String(e.id) === val)
    if (emp) {
      setCustomName(emp.name)
      setCustomEmail(emp.email || '')
      setCustomRole(emp.jobTitle || 'Atasan / Reviewer')
    }
  }

  // Determine active recipient details
  const activeRecipient = useMemo(() => {
    if (isCustomRecipient) {
      return {
        name: customName,
        email: customEmail,
        role: customRole || 'Custom Reviewer',
        type: 'custom' as const,
      }
    }
    const cand = candidates[selectedCandidateIndex]
    if (cand) {
      return {
        name: cand.name,
        email: cand.email,
        role: cand.role,
        type: cand.type,
      }
    }
    return { name: '', email: '', role: '', type: 'custom' as const }
  }, [isCustomRecipient, customName, customEmail, customRole, candidates, selectedCandidateIndex])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) return

    if (!activeRecipient.email || !activeRecipient.name) {
      toast.error('Penerima belum lengkap', {
        description: 'Pastikan nama dan email atasan tujuan reminder sudah terpilih.',
      })
      return
    }

    setIsSending(true)
    try {
      const res = await sendCustomContractReminder({
        employeeId,
        recipientEmail: activeRecipient.email,
        recipientName: activeRecipient.name,
        recipientRole: activeRecipient.role,
        note,
      })

      if (res.success) {
        toast.success(res.message || `Reminder berhasil dikirim ke ${activeRecipient.name}`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(res.error || 'Gagal mengirim email reminder.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat mengirim reminder.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Kirim Reminder Contract Review"
      description="Pilih atasan penilai atau pejabat yang berwenang untuk menerima pengingat evaluasi kontrak kerja karyawan ini."
      maxWidth="lg"
      submitLabel={isSending ? 'Mengirim...' : 'Kirim Reminder'}
      isSubmitting={isSending}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4 py-1">
        {/* Employee Summary Card */}
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-blue-50/30 p-3.5 text-xs shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <User className="size-4 text-blue-600 shrink-0" />
                {employeeInfo?.name || employeeName || 'Karyawan'}
              </div>
              <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                SN: {employeeInfo?.employeeSn || '-'} • {employeeInfo?.jobTitle || '-'}
              </div>
            </div>

            {employeeInfo && (
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight inline-flex items-center gap-1 ${
                  employeeInfo.daysLeft < 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : employeeInfo.daysLeft <= 30
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                <Clock className="size-3" />
                {employeeInfo.daysLeft < 0
                  ? `Overdue (${Math.abs(employeeInfo.daysLeft)} hari)`
                  : `${employeeInfo.daysLeft} Hari Lagi`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/80 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Section</span>
              <span className="font-medium text-slate-700 truncate block">
                {employeeInfo?.section || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Site</span>
              <span className="font-medium text-slate-700 truncate block">
                {employeeInfo?.site || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Berakhir Kontrak</span>
              <span className="font-medium text-slate-700 truncate block">
                {employeeInfo?.contractEndDate || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Options Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-800 block flex items-center justify-between">
            <span>Pilih Target Penerima Reminder</span>
            <span className="text-[11px] font-normal text-slate-400">
              {candidates.length} pilihan terdeteksi
            </span>
          </label>

          {isLoadingRecipients ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="size-5 animate-spin text-blue-600" />
              <span>Menganalisis hirarki atasan & section...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {/* Quick Choice Candidates */}
              {candidates.map((cand, idx) => {
                const isSelected = !isCustomRecipient && selectedCandidateIndex === idx
                return (
                  <button
                    key={`${cand.email}-${idx}`}
                    type="button"
                    onClick={() => {
                      setIsCustomRecipient(false)
                      setSelectedCandidateIndex(idx)
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {cand.name}
                        </span>
                        {cand.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-0.5">
                            <Sparkles className="size-2.5" /> Rekomendasi
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {cand.role}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <Mail className="size-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cand.email || 'Belum ada email'}</span>
                      </div>

                      {cand.description && (
                        <div className="text-[10px] text-slate-400 pt-0.5 line-clamp-1">
                          {cand.description}
                        </div>
                      )}
                    </div>

                    <div
                      className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}

              {/* Custom Choice */}
              <button
                type="button"
                onClick={() => setIsCustomRecipient(true)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isCustomRecipient
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                    <User className="size-3.5 text-slate-500" />
                    Pilih Karyawan Lain (Custom)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pilih atasan atau pejabat lainnya dari daftar seluruh karyawan aktif HERO.
                  </div>
                </div>

                <div
                  className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isCustomRecipient
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isCustomRecipient && <div className="size-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Searchable Select if Custom Recipient is Selected */}
        {isCustomRecipient && (
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3 animate-in fade-in duration-200">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Cari Karyawan Tujuan <span className="text-rose-500">*</span>
              </label>
              <HeroSearchableSelect
                options={employeeSelectOptions}
                value={customEmployeeId}
                onChange={handleCustomEmployeeSelect}
                placeholder="Cari berdasarkan nama, SN, atau jabatan..."
                className="w-full h-9 bg-white"
              />
            </div>

            {customEmployeeId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block">Email Penerima</label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="email@chitraparatama.co.id"
                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Jabatan / Role</label>
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Contoh: Section Head"
                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Recipient Status */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="size-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 text-[11px]">Email akan dikirim ke: </span>
              <span className="font-semibold text-slate-900">
                {activeRecipient.name || 'Belum dipilih'}
              </span>
              {activeRecipient.email && (
                <span className="text-slate-500 font-mono text-[11px] ml-1">
                  ({activeRecipient.email})
                </span>
              )}
            </div>
          </div>
          {activeRecipient.email ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" /> Siap Kirim
            </span>
          ) : (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <AlertCircle className="size-3 text-amber-600" /> Perlu Email
            </span>
          )}
        </div>

        {/* Optional Note */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600 block">
            Catatan Tambahan untuk Atasan (Opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Tambahkan pesan atau instruksi khusus untuk atasan yang dituju jika ada..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </HeroFormDialog>
  )
}
