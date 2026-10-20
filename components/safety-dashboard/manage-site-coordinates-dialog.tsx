'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  updateSiteCoordinatesAction,
  resetSiteCoordinatesToDefaultAction,
} from '@/app/dashboard/safety/data/monthly-summary-actions'
import { SiteCoordinatePicker } from './site-coordinate-picker'

type SiteItem = {
  id: number
  name: string
  location?: string | null
  geoLatitude?: string | null
  geoLongitude?: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  sites: SiteItem[]
}

export function ManageSiteCoordinatesDialog({ isOpen, onClose, sites }: Props) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [coordinatesState, setCoordinatesState] = React.useState<
    Record<number, { lat: string; lng: string }>
  >({})
  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [isResetting, setIsResetting] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  // Picker modal state
  const [pickerSite, setPickerSite] = React.useState<SiteItem | null>(null)

  // Inisialisasi state koordinat
  React.useEffect(() => {
    const initial: Record<number, { lat: string; lng: string }> = {}
    for (const s of sites) {
      initial[s.id] = {
        lat: s.geoLatitude || '',
        lng: s.geoLongitude || '',
      }
    }
    setCoordinatesState(initial)
  }, [sites, isOpen])

  const filteredSites = React.useMemo(() => {
    if (!search.trim()) return sites
    const q = search.toLowerCase()
    return sites.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.location && s.location.toLowerCase().includes(q))
    )
  }, [sites, search])

  const handleCoordinateChange = (siteId: number, field: 'lat' | 'lng', val: string) => {
    setCoordinatesState((prev) => ({
      ...prev,
      [siteId]: {
        ...prev[siteId],
        [field]: val,
      },
    }))
  }

  const handleSaveSingle = async (siteId: number) => {
    const current = coordinatesState[siteId]
    if (!current) return

    setSavingId(siteId)
    setNotice(null)
    try {
      const res = await updateSiteCoordinatesAction(siteId, current.lat, current.lng)
      if (res.ok) {
        setNotice(`Koordinat site berhasil disimpan.`)
        router.refresh()
      } else {
        alert(res.error || 'Gagal menyimpan koordinat')
      }
    } finally {
      setSavingId(null)
    }
  }

  const handleApplyDefaults = async () => {
    if (!window.confirm('Terapkan koordinat default resmi untuk seluruh site di Indonesia?')) {
      return
    }

    setIsResetting(true)
    setNotice(null)
    try {
      const res = await resetSiteCoordinatesToDefaultAction()
      if (res.ok) {
        setNotice(res.message || 'Koordinat default berhasil diterapkan!')
        router.refresh()
      } else {
        alert(res.error || 'Gagal menerapkan koordinat default')
      }
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-4xl overflow-y-auto p-0 border-0 bg-white shadow-2xl">
        <DialogHeader className="p-5 border-b bg-slate-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <MapPin className="size-4" />
                </div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Setting Lokasi & Koordinat Site Operasional
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                Atur titik Latitude dan Longitude untuk setiap lokasi site agar pin marker tampil akurat di peta.
              </DialogDescription>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={isResetting}
              onClick={handleApplyDefaults}
              className="h-8 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs shrink-0"
            >
              {isResetting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Isi Semua Koordinat Default (1-Klik)
            </Button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {notice && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama site atau daerah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <span className="text-xs text-muted-foreground">
              Total {filteredSites.length} Site
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100 text-[11px] font-bold uppercase tracking-wider">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="w-48">Nama Site</TableHead>
                  <TableHead>Alamat / Wilayah</TableHead>
                  <TableHead className="w-32">Latitude</TableHead>
                  <TableHead className="w-32">Longitude</TableHead>
                  <TableHead className="w-28 text-center">Pilih di Peta</TableHead>
                  <TableHead className="w-24 text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site, idx) => {
                  const state = coordinatesState[site.id] || { lat: '', lng: '' }
                  const hasCoords = Boolean(state.lat && state.lng)
                  const isSaving = savingId === site.id

                  return (
                    <TableRow key={site.id} className="hover:bg-slate-50/60">
                      <TableCell className="text-center text-muted-foreground font-medium py-2.5">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{site.name}</span>
                          {hasCoords ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] px-1 py-0">
                              Ada GPS
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-rose-700 border-rose-200 text-[9px] px-1 py-0 bg-rose-50">
                              Kosong
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px] max-w-xs truncate py-2.5">
                        {site.location || '-'}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Input
                          type="text"
                          value={state.lat}
                          onChange={(e) => handleCoordinateChange(site.id, 'lat', e.target.value)}
                          placeholder="-1.2345"
                          className="h-7 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Input
                          type="text"
                          value={state.lng}
                          onChange={(e) => handleCoordinateChange(site.id, 'lng', e.target.value)}
                          placeholder="116.7890"
                          className="h-7 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPickerSite(site)}
                          className="h-7 text-xs px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 gap-1 font-medium"
                          title="Buka peta dan pilih titik lokasi"
                        >
                          <MapPin className="size-3 text-rose-600" />
                          Pilih Peta
                        </Button>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSaveSingle(site.id)}
                          className="h-7 text-xs px-2.5 bg-primary text-white hover:bg-primary/90 gap-1 font-semibold"
                        >
                          {isSaving ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Save className="size-3" />
                          )}
                          Simpan
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {pickerSite && (
          <SiteCoordinatePicker
            siteName={pickerSite.name}
            initialLat={coordinatesState[pickerSite.id]?.lat || pickerSite.geoLatitude || ''}
            initialLng={coordinatesState[pickerSite.id]?.lng || pickerSite.geoLongitude || ''}
            isOpen={Boolean(pickerSite)}
            onClose={() => setPickerSite(null)}
            onSelectCoordinates={(lat, lng) => {
              handleCoordinateChange(pickerSite.id, 'lat', lat)
              handleCoordinateChange(pickerSite.id, 'lng', lng)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
