'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, FileImage, Send, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  submitAttendancePermission,
  getAttendancePermissionApproverCandidates,
} from '@/app/actions/attendance'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'

export type ApproverCandidateData = {
  defaultApproverId: string | null
  defaultApproverLabel: string
  isDirectManager: boolean
  candidates: Array<{ value: string; label: string }>
}

type PermissionRequestFormProps = {
  variant?: 'desktop' | 'mobile'
  initialApproverData?: ApproverCandidateData | null
}

export function PermissionRequestForm({
  variant = 'desktop',
  initialApproverData = null,
}: PermissionRequestFormProps) {
  const router = useRouter()
  const [type, setType] = useState('sick')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sickCategory, setSickCategory] = useState('Demam')
  const [lateReason, setLateReason] = useState('Keperluan Keluarga')
  const [returnTime, setReturnTime] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [approverData, setApproverData] = useState<ApproverCandidateData | null>(initialApproverData)
  const [selectedApproverId, setSelectedApproverId] = useState<string>(
    initialApproverData?.defaultApproverId ?? ''
  )
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(!initialApproverData)

  useEffect(() => {
    if (!initialApproverData) {
      let isMounted = true
      setIsLoadingApprovers(true)
      getAttendancePermissionApproverCandidates()
        .then((data) => {
          if (!isMounted) return
          setApproverData(data)
          if (data.defaultApproverId) {
            setSelectedApproverId(data.defaultApproverId)
          }
        })
        .catch((err) => {
          console.error('Failed to load approver candidates:', err)
        })
        .finally(() => {
          if (isMounted) setIsLoadingApprovers(false)
        })
      return () => {
        isMounted = false
      }
    }
  }, [initialApproverData])

  const title = variant === 'mobile' ? 'Izin / Sakit' : 'Pengajuan Izin Attendance'
  const helper = useMemo(
    () =>
      type === 'sick'
        ? 'Izin sakit lebih dari 1 hari wajib lampirkan surat keterangan dokter.'
        : 'Izin terlambat wajib isi alasan dan jam kembali/masuk kantor.',
    [type]
  )
  const isMultiDaySick = type === 'sick' && endDate > date

  function handleSubmit(formData: FormData) {
    setError('')
    setMessage('')
    startTransition(async () => {
      const result = await submitAttendancePermission(formData)
      if (!result.success) {
        const nextError = result.error || 'Pengajuan gagal.'
        setError(nextError)
        toast.error(nextError)
        return
      }
      const nextMessage = result.message || 'Izin tersimpan.'
      setMessage(nextMessage)
      toast.success(nextMessage)
      router.refresh()
    })
  }

  return (
    <Card className="surface-module-card w-full min-w-0 max-w-full overflow-hidden rounded-[1.1rem] border-0 p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
            Attendance Exception
          </p>
          <h1 className="font-display text-foreground mt-1 text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{helper}</p>
        </div>
        <div className="bg-surface-container-low text-muted-foreground rounded-full p-2 shrink-0">
          <CalendarDays className="size-5" />
        </div>
      </div>

      <form action={handleSubmit} className="mt-4 grid w-full min-w-0 max-w-full gap-4">
        <div className={cn("grid gap-3", variant === 'mobile' ? "grid-cols-1" : "sm:grid-cols-2")}>
          <div className="space-y-1.5 min-w-0">
            <Label>Tipe Izin</Label>
            <select
              name="permissionType"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="flex h-10 w-full min-w-0 max-w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-3 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] outline-none focus:border-b-primary focus:bg-surface-container-lowest"
            >
              <option value="sick">Sakit</option>
              <option value="late">Terlambat</option>
            </select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label>Tanggal</Label>
            <Input
              type="date"
              name="requestDate"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              suppressHydrationWarning
            />
          </div>
        </div>
        {type === 'sick' ? (
          <div className={cn("grid gap-3", variant === 'mobile' ? "grid-cols-1" : "sm:grid-cols-2")}>
            <div className="space-y-1.5 min-w-0">
              <Label>Tanggal Akhir Sakit</Label>
              <Input
                type="date"
                name="endDate"
                value={endDate}
                min={date}
                onChange={(event) => setEndDate(event.target.value)}
                required
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Kategori Sakit</Label>
              <select
                name="sickCategory"
                value={sickCategory}
                onChange={(event) => setSickCategory(event.target.value)}
                className="flex h-10 w-full min-w-0 max-w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-3 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] outline-none focus:border-b-primary focus:bg-surface-container-lowest"
              >
                <option>Demam</option>
                <option>Flu / Batuk</option>
                <option>Sakit Kepala</option>
                <option>Gangguan Pencernaan</option>
                <option>Nyeri Badan</option>
                <option>Rawat Jalan</option>
                <option>Lainnya</option>
              </select>
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-3", variant === 'mobile' ? "grid-cols-1" : "sm:grid-cols-2")}>
            <div className="space-y-1.5 min-w-0">
              <Label>Alasan Terlambat</Label>
              <select
                name="lateReason"
                value={lateReason}
                onChange={(event) => setLateReason(event.target.value)}
                className="flex h-10 w-full min-w-0 max-w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-3 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] outline-none focus:border-b-primary focus:bg-surface-container-lowest"
              >
                <option>Keperluan Keluarga</option>
                <option>Keperluan Pribadi</option>
                <option>Kendala Cuaca</option>
                <option>Ban Bocor</option>
              </select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Jam Kembali / Masuk Kantor</Label>
              <Input type="time" name="returnTime" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} required />
            </div>
          </div>
        )}
        <div className="space-y-1.5 min-w-0">
          <Label>{type === 'sick' ? 'Catatan Sakit' : 'Detail Alasan'}</Label>
          <Textarea
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={type === 'sick' ? 'Contoh: demam tinggi sejak malam' : 'Contoh: hujan deras dan akses jalan tertutup'}
          />
        </div>
        <div className="space-y-1.5 min-w-0">
          <Label className="inline-flex items-center gap-2">
            <FileImage className="size-4" /> {isMultiDaySick ? 'Surat Dokter (Wajib)' : 'Foto Surat / Bukti (Opsional)'}
          </Label>
          <input type="hidden" name="uploadTarget" value="attendance" />
          <Input type="file" name="file" accept="image/*" />
        </div>

        {/* Approver Selection Section (Daily Activity Style) */}
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-sky-200/80 bg-sky-50/50 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <UserCheck className="size-4 text-sky-700 shrink-0" />
              <Label className="text-xs font-bold text-slate-900 truncate">
                Pilih Approver (Atasan / PJO)
              </Label>
              <span className="text-[10px] font-semibold text-rose-600 shrink-0">*</span>
            </div>
            {approverData?.isDirectManager ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Atasan Langsung Terdeteksi
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-100/90 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                Default Site / PJO
              </span>
            )}
          </div>

          <input type="hidden" name="targetApproverId" value={selectedApproverId} />

          {isLoadingApprovers ? (
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200/70" />
          ) : (
            <div className="w-full min-w-0 max-w-full">
              <SearchableSelect
                label="Approver"
                value={selectedApproverId}
                onValueChange={(val) => setSelectedApproverId(val)}
                options={approverData?.candidates ?? []}
                placeholder="-- PILIH APPROVER (ATASAN / PJO) --"
                widthClassName="w-full min-w-0 max-w-full"
              />
            </div>
          )}

          <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <span className="font-semibold text-sky-700 shrink-0">•</span>
            <p className="leading-tight">
              Default terisi otomatis sesuai Atasan Langsung. Anda dapat menggantinya bila perlu.
              <span className="block font-medium text-slate-700 mt-0.5">
                Tembusan (CC): Notifikasi lonceng & email otomatis dikirim ke tim Human Capital (HR).
              </span>
            </p>
          </div>
        </div>

        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
          <Send className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Kirim Izin'}
        </Button>
      </form>
    </Card>
  )
}
