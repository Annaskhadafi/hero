'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  getSiteMonthlyHealthAutoFillData,
  upsertLaggingHealthAction,
} from '@/app/dashboard/safety/data/monthly-summary-actions'
import type { SiteMonthlySummaryItem } from './site-oshe-performance-dialog'

type SiteOption = {
  id: number
  name: string
  location?: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  masterSites: SiteOption[]
  defaultMonth: string // YYYY-MM
  initialData?: SiteMonthlySummaryItem | null
}

export function LaggingHealthDialog({
  isOpen,
  onClose,
  masterSites,
  defaultMonth,
  initialData,
}: Props) {
  const router = useRouter()
  const [siteId, setSiteId] = React.useState<string>(
    initialData ? String(initialData.siteId) : masterSites[0]?.id ? String(masterSites[0].id) : ''
  )
  const [month, setMonth] = React.useState<string>(
    initialData && initialData.month ? initialData.month.substring(0, 7) : defaultMonth
  )

  const [safetyManHours, setSafetyManHours] = React.useState<string>(
    initialData ? String(initialData.safetyManHours) : '0'
  )
  const [totalManpower, setTotalManpower] = React.useState<number>(initialData?.totalManpower ?? 0)
  const [sickEmployeesCount, setSickEmployeesCount] = React.useState<number>(
    initialData?.sickEmployeesCount ?? 0
  )
  const [lostDaysCount, setLostDaysCount] = React.useState<number>(initialData?.lostDaysCount ?? 0)
  const [sickLettersCount, setSickLettersCount] = React.useState<number>(
    initialData?.sickLettersCount ?? 0
  )
  const [occupationalDiseasesCount, setOccupationalDiseasesCount] = React.useState<number>(
    initialData?.occupationalDiseasesCount ?? 0
  )

  const [isFetchingAuto, setIsFetchingAuto] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [autoFillNotice, setAutoFillNotice] = React.useState<string | null>(null)

  // Auto-fetch data from system
  const handleAutoFill = React.useCallback(
    async (targetSiteId: number, targetMonth: string) => {
      if (!targetSiteId || !targetMonth) return
      setIsFetchingAuto(true)
      setErrorMsg(null)
      try {
        const res = await getSiteMonthlyHealthAutoFillData(targetSiteId, targetMonth)
        if (res.ok && res.data) {
          setSafetyManHours(String(res.data.safetyManHours))
          setTotalManpower(res.data.totalManpower)
          setSickEmployeesCount(res.data.sickEmployeesCount)
          setLostDaysCount(res.data.lostDaysCount)
          setSickLettersCount(res.data.sickLettersCount)
          setAutoFillNotice(
            `Data otomatis terisi dari sistem (Man Hours: ${res.data.safetyManHours.toLocaleString('id-ID')} Jam, Karyawan: ${res.data.totalManpower}, Cuti Sakit HC: ${res.data.sickEmployeesCount} org).`
          )
        }
      } catch (err: any) {
        console.error('Error fetching auto fill:', err)
      } finally {
        setIsFetchingAuto(false)
      }
    },
    []
  )

  // Trigger auto fill when site or month changes (if not editing existing)
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSiteId(String(initialData.siteId))
        setMonth(initialData.month ? initialData.month.substring(0, 7) : defaultMonth)
        setSafetyManHours(String(initialData.safetyManHours || 0))
        setTotalManpower(initialData.totalManpower ?? 0)
        setSickEmployeesCount(initialData.sickEmployeesCount ?? 0)
        setLostDaysCount(initialData.lostDaysCount ?? 0)
        setSickLettersCount(initialData.sickLettersCount ?? 0)
        setOccupationalDiseasesCount(initialData.occupationalDiseasesCount ?? 0)
        setAutoFillNotice(null)
      } else if (siteId && month) {
        handleAutoFill(parseInt(siteId, 10), month)
      }
    }
  }, [isOpen, initialData])

  const onSiteChange = (newSiteId: string) => {
    setSiteId(newSiteId)
    if (newSiteId && month) {
      handleAutoFill(parseInt(newSiteId, 10), month)
    }
  }

  const onMonthChange = (newMonth: string) => {
    setMonth(newMonth)
    if (siteId && newMonth) {
      handleAutoFill(parseInt(siteId, 10), newMonth)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteId) {
      setErrorMsg('Silakan pilih lokasi Site.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const fd = new FormData()
      fd.append('siteId', siteId)
      fd.append('month', month)
      fd.append('safetyManHours', safetyManHours)
      fd.append('totalManpower', String(totalManpower))
      fd.append('sickEmployeesCount', String(sickEmployeesCount))
      fd.append('lostDaysCount', String(lostDaysCount))
      fd.append('sickLettersCount', String(sickLettersCount))
      fd.append('occupationalDiseasesCount', String(occupationalDiseasesCount))

      const res = await upsertLaggingHealthAction(fd)
      if (res.ok) {
        setSuccessMsg('Data Lagging Health berhasil disimpan.')
        router.refresh()
        setTimeout(() => {
          onClose()
        }, 800)
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan data')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
              <HeartPulse className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Form Input Lagging Health
              </DialogTitle>
              <DialogDescription className="text-xs">
                Integrasi otomatis data jam kerja (man hours), cuti sakit HC, hari hilang, dan surat dokter.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lokasi Site (Master Data)</Label>
              <Select value={siteId} onValueChange={onSiteChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Site" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {masterSites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bulan Periode</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Auto Fill Information Pill / Notice */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3 border border-emerald-200/80 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-xs">Integrasi Otomatis Aktif</p>
                <p className="text-[11px] text-emerald-800">
                  {autoFillNotice || 'Nilai terisi otomatis dari Man Hours & Cuti Sakit HC.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingAuto}
              onClick={() => handleAutoFill(parseInt(siteId, 10), month)}
              className="h-7 text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 gap-1 shrink-0"
            >
              <RefreshCw className={`size-3 ${isFetchingAuto ? 'animate-spin' : ''}`} />
              Tarik Ulang
            </Button>
          </div>

          <div className="rounded-xl border border-border/80 bg-slate-50/50 p-3.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1.5">
              Indikator Kesehatan & Jam Kerja (Dapat Disesuaikan)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                  <Clock className="size-3 text-primary" />
                  Safety Man Hours Monthly
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safetyManHours}
                  onChange={(e) => setSafetyManHours(e.target.value)}
                  className="h-8 text-xs font-semibold tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                  <Users className="size-3 text-primary" />
                  Total Man Power
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={totalManpower}
                  onChange={(e) => setTotalManpower(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Pekerja Sakit (Orang)</Label>
                <Input
                  type="number"
                  min="0"
                  value={sickEmployeesCount}
                  onChange={(e) => setSickEmployeesCount(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Hari Hilang (Hari)</Label>
                <Input
                  type="number"
                  min="0"
                  value={lostDaysCount}
                  onChange={(e) => setLostDaysCount(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Surat Sakit Terlampir (Berkas)</Label>
                <Input
                  type="number"
                  min="0"
                  value={sickLettersCount}
                  onChange={(e) => setSickLettersCount(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Penyakit Akibat Kerja (Kasus)</Label>
                <Input
                  type="number"
                  min="0"
                  value={occupationalDiseasesCount}
                  onChange={(e) => setOccupationalDiseasesCount(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold tabular-nums"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Lagging Health'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
