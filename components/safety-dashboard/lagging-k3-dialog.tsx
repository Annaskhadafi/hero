'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Plus, ShieldAlert } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { upsertLaggingK3Action } from '@/app/dashboard/safety/data/monthly-summary-actions'
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

export function LaggingK3Dialog({
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
  const [nearmiss, setNearmiss] = React.useState<number>(initialData?.nearmiss ?? 0)
  const [propertyDamage, setPropertyDamage] = React.useState<number>(initialData?.propertyDamage ?? 0)
  const [firstAid, setFirstAid] = React.useState<number>(initialData?.firstAid ?? 0)
  const [medicalTreatment, setMedicalTreatment] = React.useState<number>(initialData?.medicalTreatment ?? 0)
  const [environmental, setEnvironmental] = React.useState<number>(initialData?.environmental ?? 0)
  const [majorInjury, setMajorInjury] = React.useState<number>(initialData?.majorInjury ?? 0)
  const [fatality, setFatality] = React.useState<number>(initialData?.fatality ?? 0)
  const [incidentNotes, setIncidentNotes] = React.useState<string>(initialData?.incidentNotes ?? 'Nihil')

  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Reset form saat initialData berubah
  React.useEffect(() => {
    if (initialData) {
      setSiteId(String(initialData.siteId))
      setMonth(initialData.month ? initialData.month.substring(0, 7) : defaultMonth)
      setNearmiss(initialData.nearmiss ?? 0)
      setPropertyDamage(initialData.propertyDamage ?? 0)
      setFirstAid(initialData.firstAid ?? 0)
      setMedicalTreatment(initialData.medicalTreatment ?? 0)
      setEnvironmental(initialData.environmental ?? 0)
      setMajorInjury(initialData.majorInjury ?? 0)
      setFatality(initialData.fatality ?? 0)
      setIncidentNotes(initialData.incidentNotes ?? 'Nihil')
    } else {
      setNearmiss(0)
      setPropertyDamage(0)
      setFirstAid(0)
      setMedicalTreatment(0)
      setEnvironmental(0)
      setMajorInjury(0)
      setFatality(0)
      setIncidentNotes('Nihil')
    }
    setErrorMsg(null)
    setSuccessMsg(null)
  }, [initialData, defaultMonth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteId) {
      setErrorMsg('Silakan pilih lokasi Site.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const fd = new FormData()
      fd.append('siteId', siteId)
      fd.append('month', month)
      fd.append('nearmiss', String(nearmiss))
      fd.append('propertyDamage', String(propertyDamage))
      fd.append('firstAid', String(firstAid))
      fd.append('medicalTreatment', String(medicalTreatment))
      fd.append('environmental', String(environmental))
      fd.append('majorInjury', String(majorInjury))
      fd.append('fatality', String(fatality))
      fd.append('incidentNotes', incidentNotes)

      const res = await upsertLaggingK3Action(fd)
      if (res.ok) {
        setSuccessMsg('Data Lagging K3 berhasil disimpan.')
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
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Form Input Lagging K3
              </DialogTitle>
              <DialogDescription className="text-xs">
                Input kuantitas insiden K3 (nearmiss, property damage, cedera, fatality) per site & bulan.
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
              <Select value={siteId} onValueChange={setSiteId}>
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
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-slate-50/50 p-3.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1.5">
              Kuantitas Insiden (Qty)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Nearmiss</Label>
                <Input
                  type="number"
                  min="0"
                  value={nearmiss}
                  onChange={(e) => setNearmiss(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Property Damage</Label>
                <Input
                  type="number"
                  min="0"
                  value={propertyDamage}
                  onChange={(e) => setPropertyDamage(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">First Aid (FAI)</Label>
                <Input
                  type="number"
                  min="0"
                  value={firstAid}
                  onChange={(e) => setFirstAid(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Medical Treatment (MTI)</Label>
                <Input
                  type="number"
                  min="0"
                  value={medicalTreatment}
                  onChange={(e) => setMedicalTreatment(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Environmental Inc.</Label>
                <Input
                  type="number"
                  min="0"
                  value={environmental}
                  onChange={(e) => setEnvironmental(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Major Injury</Label>
                <Input
                  type="number"
                  min="0"
                  value={majorInjury}
                  onChange={(e) => setMajorInjury(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-[11px] font-bold text-rose-700">Fatality</Label>
                <Input
                  type="number"
                  min="0"
                  value={fatality}
                  onChange={(e) => setFatality(parseInt(e.target.value || '0', 10))}
                  className="h-8 text-xs font-bold border-rose-300 text-rose-700"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Catatan Incident</Label>
            <Textarea
              value={incidentNotes}
              onChange={(e) => setIncidentNotes(e.target.value)}
              placeholder="Contoh: Nihil, atau rincian insiden terkait..."
              className="min-h-16 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-[#1e40af] hover:bg-[#1e40af]/90 text-white font-semibold gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Lagging K3'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
