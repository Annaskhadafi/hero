'use client'

import { startTransition, useActionState, useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, FileText, Upload, Check, X, Printer } from 'lucide-react'
import {
  manageCargoManifestAction,
  importCargoManifestsAction,
  getMasterSections,
  type CargoManifestRecord,
  type CargoManifestMutationState,
  type CargoImportState,
} from '@/app/actions/cargo-manifest'
import {
  getMasterGoods,
  getMasterLocations,
  getMasterRecipients,
  getMasterSites,
  createMasterGoods,
  createMasterSite,
  type MasterGoodsRecord,
  type MasterLocationRecord,
  type MasterRecipientRecord,
  type MasterSiteRecord,
} from '@/app/actions/cargo-master'
import { getWarehouseRepairItems } from '@/app/actions/warehouse-repair'
import { DEFAULT_REPAIR_SITES, resolveRepairSiteFromText } from '@/lib/repair-master'
import { Combobox } from '@/components/ui/combobox'
import { SignaturePad } from '@/components/signature-pad'
import { getUserSignatureAction } from '@/app/actions/user-signature'

function OnlineSignatureInput({
  defaultName = '',
  defaultSignature = '',
}: {
  defaultName?: string
  defaultSignature?: string
}) {
  const [signatureName, setSignatureName] = useState(defaultName)
  const [signatureDataUrl, setSignatureDataUrl] = useState(defaultSignature)

  useEffect(() => {
    if (!defaultName) {
      getUserSignatureAction().then((res) => {
        if (res.success && res.employeeName && !signatureName) {
          setSignatureName(res.employeeName)
        }
      })
    }
  }, [defaultName, signatureName])

  return (
    <div className="bg-surface-container-low ring-border/40 rounded-2xl p-3.5 ring-1 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 items-start">
        <Label className="grid gap-1.5 text-sm font-medium">
          Nama Penandatangan
          <Input
            name="signatureName"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Nama penandatangan..."
            className="h-9"
          />
        </Label>
        <div className="space-y-1">
          <input type="hidden" name="signatureDataUrl" value={signatureDataUrl} />
          <SignaturePad
            defaultDataUrl={defaultSignature}
            onDataUrlChange={(url) => setSignatureDataUrl(url || '')}
            height={130}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemRow = {
  no: number
  description: string
  serialNumber: string
  qty: number
  brand: string
  remark: string
}

const INITIAL_MUTATION: CargoManifestMutationState = { status: 'idle', message: '' }
const INITIAL_IMPORT: CargoImportState = { status: 'idle', message: '' }

const STATUS_OPTIONS = ['draft', 'sent', 'delivered', 'cancelled']

// ─── Item Row Editor ──────────────────────────────────────────────────────────

function ItemRowEditor({
  items,
  onChange,
  sourceSLoc = 'RS01',
}: {
  items: ItemRow[]
  onChange: (items: ItemRow[]) => void
  sourceSLoc?: string
}) {
  const [goodsOptions, setGoodsOptions] = useState<string[]>([])
  const [goodsData, setGoodsData] = useState<MasterGoodsRecord[]>([])
  const [repairItems, setRepairItems] = useState<any[]>([])

  useEffect(() => {
    Promise.all([getMasterGoods(), getWarehouseRepairItems()]).then(([goods, rItems]) => {
      setGoodsData(goods)
      setRepairItems(rItems)
      const optionsSet = new Set<string>()
      goods.forEach((g) => {
        if (g.goodsName) optionsSet.add(g.goodsName)
      })
      rItems.forEach((r) => {
        if (r.itemName) optionsSet.add(r.itemName)
        if (r.materialDesc && r.materialDesc !== r.itemName) optionsSet.add(r.materialDesc)
      })
      setGoodsOptions(Array.from(optionsSet).sort())
    })
  }, [])

  const addRow = () =>
    onChange([
      ...items,
      { no: items.length + 1, description: '', serialNumber: '', qty: 1, brand: '', remark: '' },
    ])

  const removeRow = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })))

  const updateRow = (idx: number, field: keyof ItemRow, value: string | number) => {
    if (field === 'description' && typeof value === 'string') {
      const trimmed = value.trim()
      const matchedGoods = goodsData.find((g) => g.goodsName === trimmed)
      const matchedRepair = repairItems.find(
        (r) =>
          r.itemName?.toLowerCase() === trimmed.toLowerCase() ||
          r.materialDesc?.toLowerCase() === trimmed.toLowerCase() ||
          r.itemCode?.toLowerCase() === trimmed.toLowerCase()
      )

      onChange(
        items.map((r, i) => {
          if (i !== idx) return r
          const brand = matchedGoods?.brand || ''
          const serialNumber = matchedRepair?.itemCode || r.serialNumber
          let remark = r.remark
          if (matchedRepair) {
            const locStock = repairItems.find(
              (ri) =>
                ri.id === matchedRepair.id ||
                (ri.itemCode === matchedRepair.itemCode &&
                  (ri.storageLocation === sourceSLoc || (!ri.storageLocation && sourceSLoc === 'RS01')))
            )
            const available = locStock ? locStock.stock : matchedRepair.stock
            remark = `Stok asal (${sourceSLoc}): ${available} pcs`
          }
          return {
            ...r,
            description: value,
            serialNumber,
            brand,
            remark: remark || r.remark,
          }
        })
      )

      // Auto-add to master goods if description is new
      if (trimmed && !goodsOptions.includes(trimmed)) {
        createMasterGoods({
          goodsName: trimmed,
          category: '',
          brand: '',
          unit: 'pcs',
          weight: '',
          dimensions: '',
          hsCode: '',
          description: '',
          notes: '',
          isActive: true,
        }).then((result) => {
          if (result.status === 'success') {
            getMasterGoods().then((data) => {
              setGoodsData(data)
              setGoodsOptions((prev) => Array.from(new Set([...prev, trimmed])).sort())
            })
          }
        })
      }
    } else {
      onChange(items.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-sm font-medium">Item Kargo</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-lg px-3 text-xs"
          onClick={addRow}
        >
          <Plus className="mr-1 size-3" /> Tambah Baris
        </Button>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="w-10 px-2 py-2 text-left font-medium">No</th>
              <th className="min-w-[140px] px-2 py-2 text-left font-medium">Description</th>
              <th className="min-w-[120px] px-2 py-2 text-left font-medium">Serial Number</th>
              <th className="w-16 px-2 py-2 text-left font-medium">Qty</th>
              <th className="min-w-[100px] px-2 py-2 text-left font-medium">Brand</th>
              <th className="min-w-[120px] px-2 py-2 text-left font-medium">Remark</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground py-4 text-center text-xs">
                  Belum ada item — klik &quot;Tambah Baris&quot;
                </td>
              </tr>
            )}
            {items.map((row, idx) => (
              <tr key={idx} className="border-border border-t">
                <td className="text-muted-foreground px-2 py-1.5 text-center">{row.no}</td>
                {/* Description */}
                <td className="px-1 py-1">
                  <Combobox
                    value={row.description}
                    onChange={(val) => updateRow(idx, 'description', val)}
                    options={goodsOptions}
                    placeholder="Deskripsi barang..."
                    allowCustom
                    className="h-7 border-0 bg-transparent text-xs"
                  />
                </td>
                {/* Serial Number */}
                <td className="px-1 py-1">
                  <input
                    className="focus:ring-primary/50 w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1"
                    value={row.serialNumber}
                    onChange={(e) => updateRow(idx, 'serialNumber', e.target.value)}
                    placeholder="S/N..."
                  />
                </td>
                {/* Qty */}
                <td className="px-1 py-1">
                  <input
                    className="focus:ring-primary/50 w-14 rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1"
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(e) => updateRow(idx, 'qty', parseInt(e.target.value) || 1)}
                  />
                </td>
                {/* Brand */}
                <td className="px-1 py-1">
                  <input
                    className="focus:ring-primary/50 w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1"
                    value={row.brand}
                    onChange={(e) => updateRow(idx, 'brand', e.target.value)}
                    placeholder="Brand..."
                  />
                </td>
                {/* Remark — free text */}
                <td className="px-1 py-1">
                  <input
                    className="focus:ring-primary/50 w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1"
                    type="text"
                    value={row.remark}
                    onChange={(e) => updateRow(idx, 'remark', e.target.value)}
                    placeholder="Catatan bebas..."
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 text-red-500 hover:text-red-700"
                    onClick={() => removeRow(idx)}
                  >
                    <X className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Manifest Form Fields ─────────────────────────────────────────────────────

function ManifestFormFields({
  defaultValues,
  items,
  onItemsChange,
}: {
  defaultValues?: Partial<CargoManifestRecord>
  items: ItemRow[]
  onItemsChange: (items: ItemRow[]) => void
}) {
  const [recipients, setRecipients] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [sites, setSites] = useState<MasterSiteRecord[]>([])
  const [transportHistory, setTransportHistory] = useState<string[]>([])
  const [shippedViaHistory, setShippedViaHistory] = useState<string[]>([])
  const [attention, setAttention] = useState(defaultValues?.attention || '')
  const [finalDestination, setFinalDestination] = useState(defaultValues?.finalDestination || '')
  const [transportVia, setTransportVia] = useState(defaultValues?.transportVia || '')
  const [shippedVia, setShippedVia] = useState(defaultValues?.shippedVia || '')
  const [siteId, setSiteId] = useState<string>(defaultValues?.siteId?.toString() || '')
  const [siteName, setSiteName] = useState<string>(defaultValues?.siteName || '')
  const [sections, setSections] = useState<Array<{ id: number; name: string; code: string }>>([])
  const [sectionId, setSectionId] = useState<string>(defaultValues?.sectionId?.toString() || '')
  const [sectionName, setSectionName] = useState<string>(defaultValues?.sectionName || '')
  const [sourceSLoc, setSourceSLoc] = useState<string>(defaultValues?.sourceSLoc || 'RS01')
  const [sourceSLocDesc, setSourceSLocDesc] = useState<string>(
    defaultValues?.sourceSLocDesc || 'CP Balikpapan'
  )
  const [destinationSLoc, setDestinationSLoc] = useState<string>(
    defaultValues?.destinationSLoc || ''
  )
  const [destinationSLocDesc, setDestinationSLocDesc] = useState<string>(
    defaultValues?.destinationSLocDesc || ''
  )

  useEffect(() => {
    // Load master data
    Promise.all([
      getMasterRecipients(),
      getMasterLocations(),
      getMasterSites(),
      getMasterSections(),
    ]).then(([recipientsData, locationsData, sitesData, sectionsData]) => {
      setRecipients(recipientsData.map((r) => r.recipientName))
      setLocations(locationsData.map((l) => l.locationName))
      setSites(sitesData)
      setSections(sectionsData)
      if (defaultValues?.sectionId) {
        const section = sectionsData.find((s) => s.id === defaultValues.sectionId)
        if (section) setSectionName(section.name)
      }
      if (defaultValues?.siteId) {
        const site = sitesData.find((s) => s.id === defaultValues.siteId)
        if (site) setSiteName(site.siteName)
      }
    })

    // Load transport history from localStorage
    const saved = localStorage.getItem('cargo_transport_history')
    if (saved) {
      try {
        setTransportHistory(JSON.parse(saved))
      } catch {}
    }

    // Load shipped via history from localStorage
    const savedShipped = localStorage.getItem('cargo_shipped_via_history')
    if (savedShipped) {
      try {
        setShippedViaHistory(JSON.parse(savedShipped))
      } catch {}
    }
  }, [])

  const handleTransportChange = (value: string) => {
    setTransportVia(value)
    // Save to history
    if (value && !transportHistory.includes(value)) {
      const newHistory = [value, ...transportHistory].slice(0, 20)
      setTransportHistory(newHistory)
      localStorage.setItem('cargo_transport_history', JSON.stringify(newHistory))
    }
  }

  const handleShippedViaChange = (value: string) => {
    setShippedVia(value)
    // Save to history
    if (value && !shippedViaHistory.includes(value)) {
      const newHistory = [value, ...shippedViaHistory].slice(0, 20)
      setShippedViaHistory(newHistory)
      localStorage.setItem('cargo_shipped_via_history', JSON.stringify(newHistory))
    }
  }

  return (
    <div className="grid gap-4">
      <input type="hidden" name="attention" value={attention} />
      <input type="hidden" name="finalDestination" value={finalDestination} />
      <input type="hidden" name="transportVia" value={transportVia} />
      <input type="hidden" name="shippedVia" value={shippedVia} />
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="sourceSLoc" value={sourceSLoc} />
      <input type="hidden" name="sourceSLocDesc" value={sourceSLocDesc} />
      <input type="hidden" name="destinationSLoc" value={destinationSLoc} />
      <input type="hidden" name="destinationSLocDesc" value={destinationSLocDesc} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-1.5 text-sm font-medium">
          Gudang Asal (S-Loc Pengirim)
          <select
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm font-semibold text-foreground"
            value={sourceSLoc}
            onChange={(e) => {
              const code = e.target.value
              setSourceSLoc(code)
              const matched = DEFAULT_REPAIR_SITES.find((s) => s.siteCode === code)
              if (matched) setSourceSLocDesc(matched.siteName)
            }}
          >
            {DEFAULT_REPAIR_SITES.map((site) => (
              <option key={`src-${site.siteCode}`} value={site.siteCode}>
                {site.siteCode} - {site.siteName}
              </option>
            ))}
          </select>
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Gudang Tujuan (S-Loc Penerima)
          <select
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm font-semibold text-foreground"
            value={destinationSLoc}
            onChange={(e) => {
              const code = e.target.value
              setDestinationSLoc(code)
              const matched = DEFAULT_REPAIR_SITES.find((s) => s.siteCode === code)
              if (matched) {
                setDestinationSLocDesc(matched.siteName)
                if (
                  !finalDestination ||
                  DEFAULT_REPAIR_SITES.some((s) => s.siteName === finalDestination)
                ) {
                  setFinalDestination(matched.siteName)
                }
              }
            }}
          >
            <option value="">Pilih Gudang / Site Tujuan...</option>
            {DEFAULT_REPAIR_SITES.map((site) => (
              <option key={`dst-${site.siteCode}`} value={site.siteCode}>
                {site.siteCode} - {site.siteName}
              </option>
            ))}
          </select>
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Tanggal (Date)
          <Input
            name="date"
            type="date"
            defaultValue={defaultValues?.date ?? new Date().toISOString().split('T')[0]}
            className="h-9"
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={defaultValues?.status ?? 'draft'}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Attention{' '}
          <span className="text-muted-foreground text-xs font-normal">
            (penerima / ditujukan kepada)
          </span>
          <Combobox
            value={attention}
            onChange={setAttention}
            options={recipients}
            placeholder="Nama penerima..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Final Destination
          <Combobox
            value={finalDestination}
            onChange={(val) => {
              setFinalDestination(val)
              const resolved = resolveRepairSiteFromText(val)
              if (resolved && !destinationSLoc) {
                setDestinationSLoc(resolved.siteCode)
                setDestinationSLocDesc(resolved.siteName)
              }
            }}
            options={locations}
            placeholder="Tujuan akhir pengiriman..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Transport Via
          <Combobox
            value={transportVia}
            onChange={handleTransportChange}
            options={transportHistory}
            placeholder="Nama ekspedisi / moda..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Note / Catatan
          <Combobox
            value={shippedVia}
            onChange={handleShippedViaChange}
            options={shippedViaHistory}
            placeholder="Catatan pengiriman..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Site
          <Combobox
            options={sites.map((s) => s.siteName)}
            value={siteName}
            onChange={async (name) => {
              const site = sites.find((s) => s.siteName === name)
              const resolved = resolveRepairSiteFromText(name)
              if (resolved) {
                setDestinationSLoc(resolved.siteCode)
                setDestinationSLocDesc(resolved.siteName)
                if (
                  !finalDestination ||
                  DEFAULT_REPAIR_SITES.some((s) => s.siteName === finalDestination)
                ) {
                  setFinalDestination(resolved.siteName)
                }
              }
              if (site) {
                setSiteId(site.id.toString())
                setSiteName(site.siteName)
              } else if (name) {
                // Create new site
                const result = await createMasterSite({
                  siteName: name,
                  location: '',
                  notes: '',
                  isActive: true,
                })
                if (result.status === 'success' && result.id) {
                  const newSites = await getMasterSites()
                  setSites(newSites)
                  setSiteId(result.id.toString())
                  setSiteName(name)
                }
              }
            }}
            placeholder="Pilih site..."
            emptyText="Site tidak ditemukan"
            allowCustom={true}
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Category Section
          <select
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            value={sectionId}
            onChange={(e) => {
              const val = e.target.value
              setSectionId(val)
              const sec = sections.find((s) => s.id.toString() === val)
              if (sec) setSectionName(sec.name)
            }}
          >
            <option value="">Pilih Section...</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Label>
      </div>
      <ItemRowEditor items={items} onChange={onItemsChange} sourceSLoc={sourceSLoc} />
      <OnlineSignatureInput
        defaultName={defaultValues?.signatureName}
        defaultSignature={defaultValues?.signatureDataUrl}
      />
    </div>
  )
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

export function CargoManifestCreateDialog({ canEdit = true }: { canEdit?: boolean }) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData
  ) => Promise<CargoManifestMutationState>
  const [state, dispatch] = useActionState(action, INITIAL_MUTATION)
  const [items, setItems] = useState<ItemRow[]>([])
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    fd.set('intent', 'create')
    fd.set('itemsJson', JSON.stringify(items))
    startTransition(() => dispatch(fd))
  }

  useEffect(() => {
    if (state.status === 'success' && open) {
      const timer = setTimeout(() => {
        setOpen(false)
        setItems([])
        formRef.current?.reset()
        window.location.reload()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state.status, open])

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="dense" className="rounded-lg px-3">
          <Plus className="size-4" /> Tambah Manifest
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-bright max-h-[90vh] max-w-4xl overflow-y-auto rounded-[1.4rem] border-0 p-0 shadow-[0_24px_70px_rgba(8,32,51,0.22)]">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1">
              <Plus className="size-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-semibold">
                Tambah Cargo Manifest
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Buat dokumen cargo manifest baru dengan detail pengiriman.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <ManifestFormFields items={items} onItemsChange={setItems} />
          {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
          {state.status === 'success' && <p className="text-sm text-green-600">{state.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-5">
              Simpan Manifest
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

export function CargoManifestEditDialog({
  row,
  canEdit = true,
}: {
  row: CargoManifestRecord
  canEdit?: boolean
}) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData
  ) => Promise<CargoManifestMutationState>
  const [state, dispatch] = useActionState(action, INITIAL_MUTATION)
  const [items, setItems] = useState<ItemRow[]>(row.items)
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    fd.set('intent', 'update')
    fd.set('id', String(row.id))
    fd.set('itemsJson', JSON.stringify(items))
    startTransition(() => dispatch(fd))
  }

  useEffect(() => {
    if (state.status === 'success' && open) {
      const timer = setTimeout(() => {
        setOpen(false)
        window.location.reload()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state.status, open])

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit manifest">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-bright max-h-[90vh] max-w-4xl overflow-y-auto rounded-[1.4rem] border-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-xl font-semibold">
            Edit Manifest {row.manifestNumber}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <ManifestFormFields defaultValues={row} items={items} onItemsChange={setItems} />
          {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
          {state.status === 'success' && <p className="text-sm text-green-600">{state.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-5">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Action ────────────────────────────────────────────────────────────

export function CargoManifestDeleteAction({
  id,
  canDelete = true,
}: {
  id: number
  canDelete?: boolean
}) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData
  ) => Promise<CargoManifestMutationState>
  const [, dispatch] = useActionState(action, INITIAL_MUTATION)

  if (!canDelete) return null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!confirm('Hapus manifest ini?')) return
        const fd = new FormData()
        fd.set('intent', 'delete')
        fd.set('id', String(id))
        startTransition(() => dispatch(fd))
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="text-red-500 hover:text-red-700"
        aria-label="Hapus"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  )
}

// ─── Status Inline Update ─────────────────────────────────────────────────────

export function CargoManifestStatusAction({
  id,
  currentStatus,
  canEdit = true,
}: {
  id: number
  currentStatus: string
  canEdit?: boolean
}) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData
  ) => Promise<CargoManifestMutationState>
  const [, dispatch] = useActionState(action, INITIAL_MUTATION)

  if (!canEdit) return null

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        fd.set('intent', 'update-status')
        fd.set('id', String(id))
        startTransition(() => dispatch(fd))
      }}
    >
      <select
        name="status"
        defaultValue={currentStatus}
        className="border-input bg-background h-8 rounded-lg border px-2 text-xs"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-8 rounded-lg"
        aria-label="Update status"
      >
        <Check className="size-4" />
      </Button>
    </form>
  )
}

// ─── PDF Preview Dialog ───────────────────────────────────────────────────────

export function CargoManifestPdfDialog({
  row,
  canEdit = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: {
  row: CargoManifestRecord
  canEdit?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  const handleDownloadPdf = () => {
    const content = document.getElementById('cargo-pdf-content')
    if (!content) return

    // Create new window with proper A4 dimensions
    const win = window.open('', '_blank', 'width=794,height=1123')
    if (!win) return

    win.document.write(`<!DOCTYPE html><html><head>
      <base href="${window.location.origin}" />
      <title>Cargo Manifest ${row.manifestNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        *,
        *::before,
        *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box !important;
        }
        html, body {
          width: 100%;
          max-width: 210mm;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: white !important;
        }
        .cargo-manifest-page {
          width: 100% !important;
          max-width: 210mm !important;
          height: 268mm !important;
          max-height: 268mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          position: relative !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .cargo-manifest-page:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
        .cargo-manifest-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        @media print {
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .cargo-manifest-page {
            width: 210mm !important;
            height: 268mm !important;
            max-height: 268mm !important;
            overflow: hidden !important;
          }
          .cargo-manifest-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          .cargo-manifest-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        .no-print { display: none !important; }
      </style>
    </head><body>${content.innerHTML}</body></html>`)
    win.document.close()

    // Wait for images to load
    setTimeout(() => {
      win.focus()
      win.print()
    }, 800)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" aria-label="Preview PDF">
              <FileText className="size-4" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[1.4rem] border-0 bg-white p-0">
        <DialogHeader className="no-print flex flex-row items-center justify-between px-6 pt-4 pb-2">
          <DialogTitle className="font-display text-lg">Preview — {row.manifestNumber}</DialogTitle>
          <div className="flex items-center gap-2">
            {canEdit && <CargoManifestEditDialog row={row} canEdit={canEdit} />}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              onClick={handleDownloadPdf}
            >
              <Printer className="size-4" /> Cetak / Download PDF
            </Button>
          </div>
        </DialogHeader>
        <div
          id="cargo-pdf-content"
          data-print-styles=".pdf-wrapper { padding: 10mm; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 9pt; } th { background: #f5f5f5; font-weight: 600; text-align: left; }"
          className="pdf-wrapper px-8 pt-4 pb-8"
        >
          <PdfContent row={row} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CargoManifestDirectExport({ row }: { row: CargoManifestRecord }) {
  const handleDirectExport = () => {
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)

    const root = document.createElement('div')
    tempDiv.appendChild(root)

    // Render PdfContent ke temporary div
    import('react-dom/client').then(({ createRoot }) => {
      const reactRoot = createRoot(root)
      reactRoot.render(<PdfContent row={row} />)

      setTimeout(() => {
        const win = window.open('', '_blank')
        if (!win) {
          document.body.removeChild(tempDiv)
          return
        }

        win.document.write(`<!DOCTYPE html><html><head>
          <base href="${window.location.origin}" />
          <title>Cargo Manifest ${row.manifestNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box !important; }
            html, body { width: 100%; max-width: 210mm; margin: 0 !important; padding: 0 !important; overflow: hidden !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
            .cargo-manifest-page { width: 100% !important; max-width: 210mm !important; height: 268mm !important; max-height: 268mm !important; box-sizing: border-box !important; overflow: hidden !important; position: relative !important; page-break-inside: avoid !important; break-inside: avoid !important; }
            .cargo-manifest-page:not(:last-child) { page-break-after: always !important; break-after: page !important; }
            .cargo-manifest-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
            @media print {
              html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
              .cargo-manifest-page { width: 210mm !important; height: 268mm !important; max-height: 268mm !important; overflow: hidden !important; }
              .cargo-manifest-page:not(:last-child) { page-break-after: always !important; break-after: page !important; }
              .cargo-manifest-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
            }
            .no-print { display: none !important; }
          </style>
        </head><body>${root.innerHTML}</body></html>`)
        win.document.close()
        win.focus()

        setTimeout(() => {
          win.print()
          win.close()
          document.body.removeChild(tempDiv)
        }, 500)
      }, 100)
    })
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Export PDF" onClick={handleDirectExport}>
      <Printer className="size-4" />
    </Button>
  )
}

function PdfContent({ row }: { row: CargoManifestRecord }) {
  // Accommodate up to 30 items on a single page before breaking to a new page ("mentok" layout),
  // and efficiently paginate larger batches:
  // - Page 1 (with shipping details box): up to 30 items
  // - Middle pages (without shipping details or signatures): up to 38 items
  // - Last page (with signatures): up to 34 items
  const pages: (typeof row.items)[] = []

  if (row.items.length === 0) {
    pages.push([])
  } else if (row.items.length <= 30) {
    pages.push(row.items)
  } else {
    const FIRST_PAGE_MAX = 30
    const MIDDLE_PAGE_MAX = 38
    const LAST_PAGE_MAX = 34

    pages.push(row.items.slice(0, FIRST_PAGE_MAX))
    let remaining = row.items.slice(FIRST_PAGE_MAX)

    while (remaining.length > 0) {
      if (remaining.length <= LAST_PAGE_MAX) {
        pages.push(remaining)
        break
      }
      pages.push(remaining.slice(0, MIDDLE_PAGE_MAX))
      remaining = remaining.slice(MIDDLE_PAGE_MAX)
    }
  }

  return (
    <>
      {pages.map((pageItems, pageIndex) => {
        const isCompact = pageItems.length > 10
        const cellPadding = isCompact ? '2.5px 4px' : '4px 4px'
        const tableFontSize = isCompact ? '7.5pt' : '8pt'

        return (
          <div
            key={pageIndex}
            className="cargo-manifest-page"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '9pt',
              color: '#000',
              boxSizing: 'border-box',
              height: '268mm',
              maxHeight: '268mm',
              width: '210mm',
              maxWidth: '210mm',
              backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
              padding: '30mm 16mm 40mm 16mm',
              position: 'relative',
              overflow: 'hidden',
              pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            {/* Header - Title Only (Logo sudah di background) */}
            <div style={{ textAlign: 'right', marginBottom: '6px' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '15pt',
                  color: '#003366',
                  letterSpacing: '1px',
                }}
              >
                CARGO MANIFEST
              </div>
              <div style={{ fontSize: '8pt', color: '#666', marginTop: '1px' }}>
                Shipping Document {pages.length > 1 && `- Page ${pageIndex + 1} of ${pages.length}`}
              </div>
            </div>

            {/* Document Info */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt' }}>
                <div>
                  <strong>Manifest No:</strong>{' '}
                  <span style={{ color: '#c0392b', fontWeight: 700, fontSize: '9.5pt' }}>
                    {row.manifestNumber}
                  </span>
                </div>
                <div>
                  <strong>Date:</strong> {row.date}
                </div>
              </div>
            </div>

            {/* Shipping Details - Only on first page */}
            {pageIndex === 0 && (
              <div
                style={{
                  border: '1px solid #003366',
                  borderRadius: '4px',
                  padding: '5px 8px',
                  marginBottom: '6px',
                  backgroundColor: 'rgba(248, 249, 250, 0.95)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                    fontSize: '8pt',
                  }}
                >
                  <div>
                    <strong>Attention:</strong> {row.attention || '-'}
                  </div>
                  <div>
                    <strong>Transport Via:</strong> {row.transportVia || '-'}
                  </div>
                  <div>
                    <strong>Shipped Via:</strong> {row.shippedVia || '-'}
                  </div>
                  <div>
                    <strong>Final Destination:</strong>{' '}
                    <span style={{ fontWeight: 600 }}>
                      {row.finalDestination
                        ? row.finalDestination.startsWith('PT Chitra Paratama Site')
                          ? row.finalDestination
                          : `PT Chitra Paratama Site | ${row.finalDestination}`
                        : 'PT Chitra Paratama Site | Site / Operations'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Items table */}
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: tableFontSize,
                marginBottom: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#003366', color: '#fff' }}>
                  <th
                    style={{
                      border: '1px solid #003366',
                      padding: '4px 4px',
                      width: '32px',
                      textAlign: 'center',
                    }}
                  >
                    No
                  </th>
                  <th style={{ border: '1px solid #003366', padding: '4px 4px', textAlign: 'left' }}>
                    Description of Goods
                  </th>
                  <th
                    style={{
                      border: '1px solid #003366',
                      padding: '4px 4px',
                      width: '110px',
                      textAlign: 'left',
                    }}
                  >
                    Serial Number
                  </th>
                  <th
                    style={{
                      border: '1px solid #003366',
                      padding: '4px 4px',
                      width: '40px',
                      textAlign: 'center',
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      border: '1px solid #003366',
                      padding: '4px 4px',
                      width: '85px',
                      textAlign: 'left',
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      border: '1px solid #003366',
                      padding: '4px 4px',
                      width: '100px',
                      textAlign: 'left',
                    }}
                  >
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            border: '1px solid #ccc',
                            padding: cellPadding,
                            textAlign: 'center',
                            height: '20px',
                          }}
                        >
                          {i + 1}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding }}>&nbsp;</td>
                        <td
                          style={{
                            border: '1px solid #ccc',
                            padding: cellPadding,
                            textAlign: 'center',
                          }}
                        >
                          &nbsp;
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding }}>&nbsp;</td>
                      </tr>
                    ))
                  : pageItems.map((item, i) => (
                      <tr
                        key={i}
                        style={{
                          backgroundColor:
                            i % 2 === 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(249, 249, 249, 0.95)',
                        }}
                      >
                        <td
                          style={{
                            border: '1px solid #ccc',
                            padding: cellPadding,
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.no}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding, lineHeight: 1.2 }}>
                          {item.description}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding, lineHeight: 1.2 }}>
                          {item.serialNumber}
                        </td>
                        <td
                          style={{
                            border: '1px solid #ccc',
                            padding: cellPadding,
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.qty}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding, lineHeight: 1.2 }}>
                          {item.brand}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: cellPadding, lineHeight: 1.2 }}>
                          {item.remark}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {/* Signatures - Only on last page */}
            {pageIndex === pages.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '22mm',
                  left: '16mm',
                  right: '16mm',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '20px',
                  fontSize: '8pt',
                  backgroundColor: 'rgba(255, 255, 255, 0.88)',
                  paddingTop: '2px',
                }}
              >
                <div style={{ position: 'relative', minHeight: '70px', textAlign: 'center' }}>
                  <div
                    style={{
                      marginBottom: row.signatureDataUrl ? '6px' : '38px',
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    <div>Delivered By</div>
                    <div>PT Chitra Paratama</div>
                  </div>
                  {row.signatureDataUrl && (
                    <img
                      src={row.signatureDataUrl}
                      alt="Signature"
                      style={{
                        height: '38px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        margin: '0 auto 2px',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      borderTop: '1px solid #000',
                      paddingTop: '2px',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {row.signatureName && row.signatureName.trim()
                        ? row.signatureName
                        : 'Administrator'}
                    </div>
                  </div>
                </div>
                <div style={{ position: 'relative', minHeight: '70px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '44px', fontWeight: 600 }}>Forwarder</div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      borderTop: '1px solid #000',
                      paddingTop: '2px',
                    }}
                  >
                    <div>&nbsp;</div>
                  </div>
                </div>
                <div style={{ position: 'relative', minHeight: '70px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '44px', fontWeight: 600 }}>Received by</div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      borderTop: '1px solid #000',
                      paddingTop: '2px',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Customer</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
// ─── Import Dialog ────────────────────────────────────────────────────────────

export function CargoManifestImportDialog({ canEdit = true }: { canEdit?: boolean }) {
  const action = importCargoManifestsAction as (
    prev: CargoImportState,
    formData: FormData
  ) => Promise<CargoImportState>
  const [state, dispatch] = useActionState(action, INITIAL_IMPORT)
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (state.status === 'success') setTimeout(() => setOpen(false), 1500)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const rawCsv = await file.text()
    const fd = new FormData()
    fd.set('rawCsv', rawCsv)
    startTransition(() => dispatch(fd))
  }

  const downloadTemplate = () => {
    const csv =
      'date,attention,transport_via,shipped_via,final_destination,status\n2026-01-01,John Doe,JNE,Darat,Jakarta,draft'
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cargo_manifest_template.csv'
    a.click()
  }

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="dense" variant="outline" className="rounded-lg px-3">
          <Upload className="mr-1 size-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-bright max-w-lg rounded-[1.4rem] border-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-xl font-semibold">
            Import Cargo Manifest
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Upload file CSV untuk import data manifest secara massal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={downloadTemplate}
          >
            Download Template CSV
          </Button>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Label className="grid gap-2 text-sm font-medium">
              File CSV
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="border-input bg-background h-9 rounded-lg border px-3 py-1.5 text-sm"
              />
            </Label>
            {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
            {state.status === 'success' && (
              <p className="text-sm text-green-600">{state.message}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" className="rounded-xl px-5">
                Import
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Row Actions (combined) ───────────────────────────────────────────────────

export function CargoManifestRowActions({
  row,
  canEdit = true,
  canDelete = true,
}: {
  row: CargoManifestRecord
  canEdit?: boolean
  canDelete?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <CargoManifestPdfDialog row={row} canEdit={canEdit} />
      {canEdit && <CargoManifestEditDialog row={row} canEdit={canEdit} />}
      {canDelete && <CargoManifestDeleteAction id={row.id} canDelete={canDelete} />}
    </div>
  )
}
