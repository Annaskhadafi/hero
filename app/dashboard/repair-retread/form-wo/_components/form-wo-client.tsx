"use client"

import { Fragment, useEffect, useMemo, useState, useTransition, useRef } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Database,
  Download,
  Eye,
  FilePlus,
  FileSpreadsheet,
  Filter,
  Layers,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-client"

// Master Data CAI & Master Price Server Actions
import {
  createFormWo,
  deleteFormWo,
  updateFormWo,
  updateFormWoStatus,
  saveWipPo,
} from "@/app/actions/form-wo"
import {
  createMasterDataCai,
  deleteMasterDataCai,
  updateMasterDataCai,
} from "@/app/actions/master-data-cai"
import {
  createRepairMasterPrice,
  deleteRepairMasterPrice,
  updateRepairMasterPrice,
  bulkImportRepairMasterPrice,
} from "@/app/actions/master-price-repair-retread"
import type { RepairMasterPriceRecord } from "@/db/schema/repair-master-price"
import {
  INITIAL_KPC_CAI,
  INITIAL_OTHER_CAI,
} from "@/lib/constants/master-cai-initial"
import type { CustomerRecord } from "@/app/actions/customer-management"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { WipRepairRecord } from "@/lib/types/wip-repair"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceItemRow = {
  id: string
  description: string
  job: string
  customer: string
  site: string
  serialNo: string
  refNo: string // No Surat Jalan / WO Customer / No PR / No PO
  noWoCp: string
  price: string
}

export type RepairItemRow = {
  id: string
  description: string // Tire Serial No / Description
  noUnit: string
  pos: string
  size: string
  site: string
  customer: string
  category: string // R1, R2, R3
  price: string
  noWoCp: string
}

export type MasterCaiRow = {
  id: number
  customer: string
  size: string
  brand: string | null
  cai: string
  type: string
  createdAt?: Date
  updatedAt?: Date
}

type FormWoRow = {
  id: number
  jenisPengajuan: string // repair | service | non_repair
  idWo: string | null
  tireSn: string | null
  customer: string | null
  site: string | null
  storeLoc: string | null
  brand: string | null
  pattern: string | null
  size: string | null
  injury: string | null
  jobType: string | null
  remark: string | null
  deskripsiPekerjaan: string | null
  inspectDate: string | null
  inspector: string | null
  receivedDate: string | null
  receiver: string | null
  noPengajuan: string | null
  tanggalPengajuan: Date
  pemohon: string | null
  catatanPengajuan: string | null
  statusPengajuan: string
  noWoTerbit: string | null
  tanggalWoTerbit: Date | null
  hari: string | null
  tanggal: string | null
  totalAmount: string | null
  items: string | null // JSON string of ServiceItemRow[] or RepairItemRow[]
  noPo: string | null
  tanggalPo: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

type FormWoClientProps = {
  waitingWoList: WipRepairRecord[]
  formWoList: FormWoRow[]
  masterCaiList?: MasterCaiRow[]
  customerList?: CustomerRecord[]
  masterPriceList?: RepairMasterPriceRecord[]
  canEdit?: boolean
  canDelete?: boolean
}

type MultiSelectOption = { value: string; label: string }

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALL_FILTER = "__all__"
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

const HARI_OPTIONS = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu", "Minggu"]

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Pending",
    cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  diproses: {
    label: "Diproses",
    cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  },
  approved: {
    label: "Approved",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    cls: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  },
}

const JENIS_CONFIG: Record<string, { label: string; cls: string }> = {
  service: {
    label: "WO Service",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  repair: {
    label: "WO Repair",
    cls: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
  },
  non_repair: {
    label: "Non-Repair",
    cls: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nv(v: string | null | undefined) {
  return v?.trim() || "-"
}

function formatDate(v: string | Date | null | undefined) {
  if (!v) return "-"
  const d = typeof v === "string" ? new Date(v) : v
  if (isNaN(d.getTime())) return String(v)
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function formatCurrency(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return ""
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num)
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function HighlightText({ value, query }: { value: string | null | undefined; query: string }) {
  const text = nv(value)
  const q = query.trim()
  if (!q) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-yellow-950 dark:bg-yellow-400/30 dark:text-yellow-100">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

function parseItems<T>(jsonStr: string | null | undefined, defaultItems: T[]): T[] {
  if (!jsonStr) return defaultItems
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // ignore
  }
  return defaultItems
}

function getTodayHari(): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"]
  return days[new Date().getDay()]
}

const getTodayIsoDate = (): string => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function TableCustomerCell({
  value,
  onChange,
  customerOptions = [],
}: {
  value: string
  onChange: (v: string) => void
  customerOptions: string[]
}) {
  const [open, setOpen] = useState(false)
  const isPreset = customerOptions.includes(value)
  const [isCustom, setIsCustom] = useState(!isPreset && value !== "")

  useEffect(() => {
    if (value && !customerOptions.includes(value)) {
      setIsCustom(true)
    }
  }, [value, customerOptions])

  return (
    <div className="space-y-1 min-w-[200px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between bg-white text-xs border-slate-200 px-2 font-normal hover:bg-slate-50"
          >
            <span className="truncate">
              {value || "Pilih Customer..."}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari nama customer..." className="text-xs h-9" />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                Customer tidak ditemukan.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__custom__ input manual customer"
                  onSelect={() => {
                    setIsCustom(true)
                    setOpen(false)
                  }}
                  className="text-xs font-semibold text-primary cursor-pointer border-b mb-1"
                >
                  + Input Manual / Custom Customer
                </CommandItem>
                {customerOptions.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      onChange(name)
                      setIsCustom(false)
                      setOpen(false)
                    }}
                    className="text-xs cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value === name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isCustom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik Customer Manual..."
          className="h-8 text-xs border-indigo-300 font-medium bg-indigo-50/30 w-full"
        />
      )}
    </div>
  )
}

function TableSizeCell({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const PRESET_TIRE_SIZES = [
    "27.00R49",
    "12.00R24",
    "11.00R20",
    "13.00R22.5",
    "16.00R25",
    "18.00R33",
    "20.50R25",
    "24.00R35",
    "23.50R35",
    "26.5R25",
    "29.50R25",
    "325/95R24",
    "33.R51",
    "37R57",
    "35/65R33",
  ]

  const [open, setOpen] = useState(false)
  const isPreset = PRESET_TIRE_SIZES.includes(value)
  const [isCustom, setIsCustom] = useState(!isPreset && value !== "")

  useEffect(() => {
    if (value && !PRESET_TIRE_SIZES.includes(value)) {
      setIsCustom(true)
    }
  }, [value])

  return (
    <div className="space-y-1 min-w-[150px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between bg-white text-xs border-slate-200 px-2 font-normal hover:bg-slate-50 font-mono"
          >
            <span className="truncate">
              {value || "Pilih Size..."}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari size tire..." className="text-xs h-9" />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                Size tidak ditemukan.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__custom__ input manual size"
                  onSelect={() => {
                    setIsCustom(true)
                    setOpen(false)
                  }}
                  className="text-xs font-semibold text-primary cursor-pointer border-b mb-1"
                >
                  + Input Manual / Custom Size
                </CommandItem>
                {PRESET_TIRE_SIZES.map((sz) => (
                  <CommandItem
                    key={sz}
                    value={sz}
                    onSelect={() => {
                      onChange(sz)
                      setIsCustom(false)
                      setOpen(false)
                    }}
                    className="text-xs cursor-pointer font-mono"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value === sz ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {sz}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isCustom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik Size Manual..."
          className="h-8 text-xs border-indigo-300 font-medium bg-indigo-50/30 w-full"
        />
      )}
    </div>
  )
}

function TableCategoryCell({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const PRESET_CATEGORIES = ["R1", "R2", "R3"]
  const isPreset = PRESET_CATEGORIES.includes(value)
  const [isCustom, setIsCustom] = useState(!isPreset && value !== "")

  useEffect(() => {
    if (value && !PRESET_CATEGORIES.includes(value)) {
      setIsCustom(true)
    }
  }, [value])

  return (
    <div className="space-y-1 min-w-[130px]">
      <Select
        value={isCustom ? "__custom__" : value || "R1"}
        onValueChange={(val) => {
          if (val === "__custom__") {
            setIsCustom(true)
          } else {
            setIsCustom(false)
            onChange(val)
          }
        }}
      >
        <SelectTrigger className="h-9 text-xs border-slate-200 bg-white w-full">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="R1" className="text-xs font-medium">R1 (Minor Repair)</SelectItem>
          <SelectItem value="R2" className="text-xs font-medium">R2 (Medium Repair)</SelectItem>
          <SelectItem value="R3" className="text-xs font-medium">R3 (Major Repair)</SelectItem>
          <SelectItem value="__custom__" className="text-xs font-semibold text-primary">
            + Custom Category
          </SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik Category..."
          className="h-8 text-xs border-indigo-300 font-medium bg-indigo-50/30 w-full"
        />
      )}
    </div>
  )
}

function TablePriceCell({
  value,
  onChange,
  customer,
  site,
  size,
  category,
  jenisWo,
  masterPriceList = [],
}: {
  value: string
  onChange: (v: string) => void
  customer: string
  site: string
  size: string
  category: string
  jenisWo: "service" | "repair" | "retread" | "non_repair"
  masterPriceList: RepairMasterPriceRecord[]
}) {
  const targetCategory = jenisWo === "retread" ? "Retread" : "Repair"

  // Filter matching master prices ONLY if exact customer matches strictly
  const matchingPrices = useMemo(() => {
    if (!masterPriceList || masterPriceList.length === 0 || !customer || !customer.trim()) return []
    const catLower = targetCategory.toLowerCase()
    const custLower = customer.trim().toLowerCase()
    const sizeLower = (size || "").trim().toLowerCase()

    return masterPriceList.filter((p) => {
      const pCat = (p.category || "Repair").trim().toLowerCase()
      const pCust = (p.customer || "").trim().toLowerCase()
      const pSize = (p.size || "").trim().toLowerCase()

      if (pCat !== catLower) return false
      // STRICT REQUIREMENT: Only match records for this exact customer!
      if (pCust !== custLower) return false

      if (sizeLower && pSize && pSize !== sizeLower) {
        // optional size match priority
      }
      return true
    })
  }, [masterPriceList, targetCategory, customer, size])

  const [isCustom, setIsCustom] = useState(false)

  // Default to manual input if customer has no prices in master price list
  useEffect(() => {
    if (matchingPrices.length === 0) {
      setIsCustom(true)
    }
  }, [matchingPrices.length])

  return (
    <div className="space-y-1 min-w-[150px]">
      {matchingPrices.length > 0 && !isCustom ? (
        <Select
          value={value || ""}
          onValueChange={(val) => {
            if (val === "__custom__") {
              setIsCustom(true)
            } else {
              setIsCustom(false)
              onChange(val)
            }
          }}
        >
          <SelectTrigger className="h-9 text-xs border-slate-200 bg-white text-right font-mono w-full">
            <SelectValue placeholder="Pilih Price..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {matchingPrices.map((p) => {
              const num = parseFloat(p.price)
              const formattedPrice = !isNaN(num) && num > 0 ? num.toLocaleString("en-US") : p.price
              const label = `${formattedPrice} (${p.damageType || "R1"}${p.site ? ` - ${p.site}` : ""}${p.size ? ` [${p.size}]` : ""})`
              return (
                <SelectItem key={p.id} value={formattedPrice} className="text-xs font-mono">
                  {label}
                </SelectItem>
              )
            })}
            <SelectItem value="__custom__" className="text-xs font-semibold text-primary">
              + Input Manual Price
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="h-9 text-xs border-slate-200 text-right font-mono w-full"
          />
          {matchingPrices.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCustom(false)}
              title="Pilih dari Master Price Customer"
              className="h-7 w-7 text-xs shrink-0 text-slate-400 hover:text-indigo-600"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component: Create / Edit Form WO Dialog ──────────────────────────────────

// ─── Master Price Match Helper ───────────────────────────────────────────────

function findMatchingMasterPrice(
  masterPriceList: RepairMasterPriceRecord[] = [],
  targetCategory: "Repair" | "Retread",
  customer: string,
  size: string,
  damageType?: string
): string | null {
  if (!masterPriceList || masterPriceList.length === 0 || !customer || !customer.trim()) return null

  const targetCatLower = targetCategory.toLowerCase()
  const custLower = customer.trim().toLowerCase()
  const sizeLower = (size || "").trim().toLowerCase()
  const dtLower = (damageType || "R1").trim().toLowerCase()

  // STRICT REQUIREMENT: Only match if customer matches exact customer in Master Price!
  // 1. Exact match: category + customer + size + damageType
  const exact = masterPriceList.find((p) => {
    const pCat = (p.category || "Repair").trim().toLowerCase()
    const pCust = (p.customer || "").trim().toLowerCase()
    const pSize = (p.size || "").trim().toLowerCase()
    const pDt = (p.damageType || "R1").trim().toLowerCase()
    return pCat === targetCatLower && pCust === custLower && pSize === sizeLower && pDt === dtLower
  })
  if (exact && exact.price && exact.price !== "0") return exact.price

  // 2. Match category + customer + size
  const matchCustSize = masterPriceList.find((p) => {
    const pCat = (p.category || "Repair").trim().toLowerCase()
    const pCust = (p.customer || "").trim().toLowerCase()
    const pSize = (p.size || "").trim().toLowerCase()
    return pCat === targetCatLower && pCust === custLower && pSize === sizeLower
  })
  if (matchCustSize && matchCustSize.price && matchCustSize.price !== "0") return matchCustSize.price

  // 3. Match category + customer (any size for this exact customer)
  const matchCustOnly = masterPriceList.find((p) => {
    const pCat = (p.category || "Repair").trim().toLowerCase()
    const pCust = (p.customer || "").trim().toLowerCase()
    return pCat === targetCatLower && pCust === custLower
  })
  if (matchCustOnly && matchCustOnly.price && matchCustOnly.price !== "0") return matchCustOnly.price

  // DO NOT FALL BACK TO OTHER CUSTOMERS!
  return null
}

// ─── Modal Create/Edit Work Order ──────────────────────────────────────────────

function CreateOrEditWoDialog({
  open,
  onOpenChange,
  editItem,
  prefillWip,
  prefillWipList,
  initialJenis = "service",
  customerList = [],
  masterPriceList = [],
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editItem?: FormWoRow | null
  prefillWip?: WipRepairRecord | null
  prefillWipList?: WipRepairRecord[] | null
  initialJenis?: "service" | "repair" | "retread" | "non_repair"
  customerList?: CustomerRecord[]
  masterPriceList?: RepairMasterPriceRecord[]
  onSuccess: () => void
}) {
  const { data: session } = useSession()
  const activeUser = session?.user?.name || session?.user?.email || "Nama Pengguna"

  const [isPending, startTransition] = useTransition()
  const [jenisPengajuan, setJenisPengajuan] = useState<"service" | "repair" | "retread" | "non_repair">(initialJenis)
  const [tanggal, setTanggal] = useState(getTodayIsoDate())
  const [pemohon, setPemohon] = useState("")
  const [catatanPengajuan, setCatatanPengajuan] = useState("")
  const [statusPengajuan, setStatusPengajuan] = useState<"pending" | "approved" | "rejected" | "diproses">("pending")
  const [noWoTerbit, setNoWoTerbit] = useState("")
  const [noPo, setNoPo] = useState("")
  const [tanggalPo, setTanggalPo] = useState("")

  // Multi-item tables
  const [serviceItems, setServiceItems] = useState<ServiceItemRow[]>([
    { id: "1", description: "Labour Service", job: "", customer: "", site: "", serialNo: "", refNo: "", noWoCp: "", price: "", noPo: "", tanggalPo: "" },
  ])

  const [repairItems, setRepairItems] = useState<RepairItemRow[]>([
    { id: "1", description: "", noUnit: "", pos: "", size: "", site: "", customer: "", category: "R1", price: "", noWoCp: "", noPo: "", tanggalPo: "" },
  ])

  const allCustomerOptions = useMemo(() => {
    const set = new Set<string>()
    set.add("OTHER CUSTOMER")
    if (Array.isArray(customerList)) {
      customerList.forEach((c) => {
        if (c.name?.trim()) set.add(c.name.trim())
      })
    }
    const PRESETS = [
      "PT Kaltim Prima Coal",
      "PT Berau Coal",
      "PT Adaro Indonesia",
      "PT Bukit Asam Tbk",
      "PT Freeport Indonesia",
      "PT Arutmin Indonesia",
      "PT Saptaindra Sejati",
      "PT Pamapersada Nusantara",
      "PT Putra Perkasa Abadi",
      "PT Darma Henwa Tbk",
      "PT Delta Dunia Makmur Tbk (BUMA)",
      "PT Vale Indonesia Tbk",
      "PT Amman Mineral Nusa Tenggara",
      "PT Borneo Indobara",
      "PT Kideco Jaya Agung",
    ]
    PRESETS.forEach((c) => set.add(c))
    return Array.from(set).sort()
  }, [customerList])

  useEffect(() => {
    if (open) {
      const userDefault = activeUser
      if (editItem) {
        setJenisPengajuan((editItem.jenisPengajuan as any) || "service")
        setTanggal(editItem.tanggal || getTodayIsoDate())
        setPemohon(editItem.pemohon && editItem.pemohon !== "User Logged In" ? editItem.pemohon : userDefault)
        setCatatanPengajuan(editItem.catatanPengajuan || "")
        setStatusPengajuan((editItem.statusPengajuan as any) || "pending")
        setNoWoTerbit(editItem.noWoTerbit || "")
        setNoPo(editItem.noPo || "")
        setTanggalPo(editItem.tanggalPo || "")

        if (editItem.jenisPengajuan === "service") {
          const parsed = parseItems<ServiceItemRow>(editItem.items, [
            {
              id: "1",
              description: editItem.deskripsiPekerjaan || "Labour Service",
              job: editItem.jobType || "",
              customer: editItem.customer || "",
              site: editItem.site || "",
              serialNo: editItem.tireSn || "",
              refNo: editItem.storeLoc || "",
              noWoCp: editItem.noWoTerbit || "",
              price: editItem.totalAmount || "",
              noPo: editItem.noPo || "",
              tanggalPo: editItem.tanggalPo || "",
            },
          ])
          setServiceItems(parsed)
        } else {
          const parsed = parseItems<RepairItemRow>(editItem.items, [
            {
              id: "1",
              description: editItem.tireSn || editItem.deskripsiPekerjaan || "",
              noUnit: editItem.storeLoc || "",
              pos: editItem.pattern || "",
              size: editItem.size || "",
              site: editItem.site || "",
              customer: editItem.customer || "",
              category: editItem.brand || "R1",
              price: editItem.totalAmount || "",
              noWoCp: editItem.noWoTerbit || "",
              noPo: editItem.noPo || "",
              tanggalPo: editItem.tanggalPo || "",
            },
          ])
          setRepairItems(parsed)
        }
      } else if (prefillWipList && prefillWipList.length > 0) {
        setJenisPengajuan("repair")
        setTanggal(getTodayIsoDate())
        setPemohon(userDefault)
        setCatatanPengajuan("")

        const posList = Array.from(new Set(prefillWipList.map((i) => i.po).filter(Boolean)))
        setNoPo(posList.join(", "))

        const firstPoDate = prefillWipList[0]?.po_date || prefillWipList[0]?.inspect_date || ""
        setTanggalPo(firstPoDate)

        setRepairItems(
          prefillWipList.map((item, idx) => ({
            id: String(idx + 1),
            description: item.tire_sn || "",
            noUnit: item.store_loc || "",
            pos: "",
            size: item.size || "",
            site: item.site || "",
            customer: item.customer || "",
            category: "R1",
            price: "",
            noWoCp: "",
            noPo: item.po || "",
            tanggalPo: item.po_date || item.inspect_date || "",
          }))
        )
      } else if (prefillWip) {
        setJenisPengajuan("repair")
        setTanggal(getTodayIsoDate())
        setPemohon(userDefault)
        setCatatanPengajuan("")
        setNoPo(prefillWip.po || "")
        setTanggalPo(prefillWip.po_date || prefillWip.inspect_date || "")
        setRepairItems([
          {
            id: "1",
            description: prefillWip.tire_sn || "",
            noUnit: prefillWip.store_loc || "",
            pos: "",
            size: prefillWip.size || "",
            site: prefillWip.site || "",
            customer: prefillWip.customer || "",
            category: "R1",
            price: "",
            noWoCp: "",
            noPo: prefillWip.po || "",
            tanggalPo: prefillWip.po_date || "",
          },
        ])
      } else {
        setJenisPengajuan(initialJenis)
        setTanggal(getTodayIsoDate())
        setPemohon(userDefault)
        setCatatanPengajuan("")
        setStatusPengajuan("pending")
        setNoWoTerbit("")
        setNoPo("")
        setTanggalPo("")
        setServiceItems([
          { id: "1", description: "Labour Service", job: "", customer: "", site: "", serialNo: "", refNo: "", noWoCp: "", price: "", noPo: "", tanggalPo: "" },
        ])
        setRepairItems([
          { id: "1", description: "", noUnit: "", pos: "", size: "", site: "", customer: "", category: "R1", price: "", noWoCp: "", noPo: "", tanggalPo: "" },
        ])
      }
    }
  }, [open, editItem, prefillWip, prefillWipList, initialJenis, activeUser])

  useEffect(() => {
    if (open && session?.user?.name && (!pemohon || pemohon === "User Logged In" || pemohon === "Nama Pengguna")) {
      setPemohon(session.user.name)
    }
  }, [open, session?.user?.name])

  // Calculation helpers
  const totalServiceAmount = useMemo(() => {
    return serviceItems.reduce((sum, item) => {
      const p = parseFloat(item.price.replace(/[^0-9.-]+/g, ""))
      return sum + (isNaN(p) ? 0 : p)
    }, 0)
  }, [serviceItems])

  const totalRepairAmount = useMemo(() => {
    return repairItems.reduce((sum, item) => {
      const p = parseFloat(item.price.replace(/[^0-9.-]+/g, ""))
      return sum + (isNaN(p) ? 0 : p)
    }, 0)
  }, [repairItems])

  // Item Table Handlers for Service
  const addServiceRow = () => {
    setServiceItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "Labour Service",
        job: "",
        customer: prev[0]?.customer || "",
        site: prev[0]?.site || "",
        serialNo: "",
        refNo: "",
        noWoCp: "",
        price: "",
        noPo: noPo || "",
        tanggalPo: tanggalPo || "",
      },
    ])
  }

  const removeServiceRow = (index: number) => {
    if (serviceItems.length <= 1) return
    setServiceItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateServiceRow = (index: number, key: keyof ServiceItemRow, value: string) => {
    setServiceItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  // Item Table Handlers for Repair / Retread
  const addRepairRow = () => {
    setRepairItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        noUnit: "",
        pos: "",
        size: prev[0]?.size || "",
        site: prev[0]?.site || "",
        customer: prev[0]?.customer || "",
        category: "R1",
        price: "",
        noWoCp: "",
        noPo: noPo || "",
        tanggalPo: tanggalPo || "",
      },
    ])
  }

  const removeRepairRow = (index: number) => {
    if (repairItems.length <= 1) return
    setRepairItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRepairRow = (index: number, key: keyof RepairItemRow, value: string) => {
    setRepairItems((prev) => {
      const next = [...prev]
      const updatedRow = { ...next[index], [key]: value }

      // Auto-fill price from Master Price when customer, size, or category is selected
      if (key === "customer" || key === "size" || key === "category") {
        const targetCategory = jenisPengajuan === "retread" ? "Retread" : "Repair"
        const foundPrice = findMatchingMasterPrice(
          masterPriceList,
          targetCategory,
          updatedRow.customer,
          updatedRow.size,
          updatedRow.category
        )
        if (foundPrice) {
          const num = parseFloat(foundPrice.replace(/[^0-9.-]+/g, ""))
          if (!isNaN(num) && num > 0) {
            updatedRow.price = num.toLocaleString("en-US")
          } else {
            updatedRow.price = foundPrice
          }
        }
      }

      next[index] = updatedRow
      return next
    })
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const firstService = serviceItems[0]
      const firstRepair = repairItems[0]

      const isService = jenisPengajuan === "service"
      const currentTotalAmount = isService ? totalServiceAmount : totalRepairAmount
      const itemsJson = JSON.stringify(isService ? serviceItems : repairItems)

      const headerNoPo = noPo || (isService ? firstService?.noPo : firstRepair?.noPo)
      const headerTanggalPo = tanggalPo || (isService ? firstService?.tanggalPo : firstRepair?.tanggalPo)

      const payload = {
        jenisPengajuan,
        tanggal: tanggal || undefined,
        pemohon: pemohon || undefined,
        catatanPengajuan: catatanPengajuan || undefined,
        statusPengajuan,
        noWoTerbit: noWoTerbit || undefined,
        noPo: headerNoPo || undefined,
        tanggalPo: headerTanggalPo || undefined,
        totalAmount: currentTotalAmount > 0 ? String(currentTotalAmount) : undefined,
        items: itemsJson,
        // Header summary values
        customer: isService ? firstService?.customer || undefined : firstRepair?.customer || undefined,
        site: isService ? firstService?.site || undefined : firstRepair?.site || undefined,
        jobType: isService ? firstService?.job || undefined : firstRepair?.category || undefined,
        deskripsiPekerjaan: isService ? firstService?.description || undefined : firstRepair?.description || undefined,
        tireSn: isService ? firstService?.serialNo || undefined : firstRepair?.description || undefined,
        size: isService ? undefined : firstRepair?.size || undefined,
        storeLoc: isService ? firstService?.refNo || undefined : firstRepair?.noUnit || undefined,
        noWoCp: isService ? firstService?.noWoCp || undefined : firstRepair?.noWoCp || undefined,
      }

      let result
      if (editItem) {
        result = await updateFormWo(editItem.id, payload)
      } else {
        result = await createFormWo(payload)
      }

      if (result.success) {
        toast.success(editItem ? "Form WO berhasil diperbarui." : `Form WO berhasil dibuat (${result.noPengajuan || ""})`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Terjadi kesalahan saat menyimpan.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[99vw] w-[99vw] sm:max-w-[99vw] lg:max-w-[99vw] xl:max-w-[99vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Wrench className="h-5 w-5 text-indigo-600" />
            {editItem ? `Edit Form Work Order (${editItem.noPengajuan || ""})` : "Form Permintaan Work Order"}
          </DialogTitle>
          <DialogDescription>
            Pilih Jenis WO (Service, Repair, atau Retread) dan isi tabel pekerjaan. Seluruh kolom bersifat opsional (tidak ada yang wajib).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Header Controls: WO Type Selector & Document Dates */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Jenis Form WO Selector */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">Jenis Form WO</Label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setJenisPengajuan("service")}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-semibold transition",
                      jenisPengajuan === "service" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    WO Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisPengajuan("repair")}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-semibold transition",
                      jenisPengajuan === "repair" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    WO Repair
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisPengajuan("retread")}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-semibold transition",
                      jenisPengajuan === "retread" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    WO Retread
                  </button>
                </div>
              </div>

              {/* Tanggal Header (Date Picker Default Today) */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">Tanggal</Label>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="h-9 bg-white text-xs font-medium"
                />
              </div>
            </div>

            {/* Additional Pemohon & Status Fields (PO & No WO Terbit fields removed as requested) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">Pemohon</Label>
                <Input
                  value={pemohon}
                  onChange={(e) => setPemohon(e.target.value)}
                  placeholder="Nama Pengguna"
                  className="h-9 bg-white text-xs font-semibold text-indigo-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">Status Pengajuan</Label>
                <Select value={statusPengajuan} onValueChange={(v) => setStatusPengajuan(v as any)}>
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="diproses">Diproses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table Spreadsheet Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Rincian Pekerjaan ({jenisPengajuan === "service" ? "Form WO Service" : jenisPengajuan === "retread" ? "Form WO Retread" : "Form WO Repair"})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={jenisPengajuan === "service" ? addServiceRow : addRepairRow}
                className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Tambah Baris Pekerjaan
              </Button>
            </div>

            {/* Table Spreadsheet Editor for SERVICE */}
            {jenisPengajuan === "service" && (
              <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
                <Table className="text-xs w-full min-w-[1550px]">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[190px]">Description</TableHead>
                      <TableHead className="min-w-[220px]">Job</TableHead>
                      <TableHead className="min-w-[200px]">Customer</TableHead>
                      <TableHead className="min-w-[140px]">Site</TableHead>
                      <TableHead className="min-w-[140px]">Serial No</TableHead>
                      <TableHead className="min-w-[200px]">No Surat Jalan / Ref</TableHead>
                      <TableHead className="min-w-[140px]">Nomor PO</TableHead>
                      <TableHead className="min-w-[140px]">Date PO</TableHead>
                      <TableHead className="min-w-[140px]">No WO CP</TableHead>
                      <TableHead className="min-w-[150px] text-right">Price / Amount</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {serviceItems.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/60">
                        <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateServiceRow(idx, "description", e.target.value)}
                            placeholder="e.g. Labour Service"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.job}
                            onChange={(e) => updateServiceRow(idx, "job", e.target.value)}
                            placeholder="e.g. Software License Install & Local Support"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>

                        {/* Customer Dropdown + Manual Input */}
                        <TableCell>
                          <TableCustomerCell
                            value={item.customer}
                            onChange={(val) => updateServiceRow(idx, "customer", val)}
                            customerOptions={allCustomerOptions}
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            value={item.site}
                            onChange={(e) => updateServiceRow(idx, "site", e.target.value)}
                            placeholder="e.g. Sangatta"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.serialNo}
                            onChange={(e) => updateServiceRow(idx, "serialNo", e.target.value)}
                            placeholder="Serial No"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.refNo}
                            onChange={(e) => updateServiceRow(idx, "refNo", e.target.value)}
                            placeholder="e.g. 1011957695"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.noPo || ""}
                            onChange={(e) => updateServiceRow(idx, "noPo", e.target.value)}
                            placeholder="No PO"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={item.tanggalPo || ""}
                            onChange={(e) => updateServiceRow(idx, "tanggalPo", e.target.value)}
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.noWoCp}
                            onChange={(e) => updateServiceRow(idx, "noWoCp", e.target.value)}
                            placeholder="No WO CP"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.price}
                            onChange={(e) => updateServiceRow(idx, "price", e.target.value)}
                            placeholder="0"
                            className="h-9 text-xs border-slate-200 text-right font-mono w-full"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={serviceItems.length <= 1}
                            onClick={() => removeServiceRow(idx)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Yellow Total Amount Footer */}
                    <TableRow className="bg-yellow-300/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <TableCell colSpan={10} className="text-center py-2.5 uppercase tracking-wider text-xs">
                        Total Amount
                      </TableCell>
                      <TableCell className="text-right py-2.5 font-mono text-xs">
                        {totalServiceAmount > 0 ? formatCurrency(totalServiceAmount) : "-"}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Table Spreadsheet Editor for REPAIR & RETREAD */}
            {(jenisPengajuan === "repair" || jenisPengajuan === "retread") && (
              <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
                <Table className="text-xs w-full min-w-[1750px]">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      <TableHead className="min-w-[180px]">Description (Tire SN)</TableHead>
                      <TableHead className="min-w-[130px]">No Unit</TableHead>
                      <TableHead className="min-w-[70px] text-center">Pos</TableHead>
                      <TableHead className="min-w-[200px]">Customer</TableHead>
                      <TableHead className="min-w-[140px]">Site</TableHead>
                      <TableHead className="min-w-[160px]">Size</TableHead>
                      <TableHead className="min-w-[140px]">Category</TableHead>
                      <TableHead className="min-w-[140px]">Nomor PO</TableHead>
                      <TableHead className="min-w-[140px]">Date PO</TableHead>
                      <TableHead className="min-w-[140px]">No WO CP</TableHead>
                      <TableHead className="min-w-[160px] text-right">Price</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {repairItems.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/60">
                        <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateRepairRow(idx, "description", e.target.value)}
                            placeholder="e.g. VCJO256S8A"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.noUnit}
                            onChange={(e) => updateRepairRow(idx, "noUnit", e.target.value)}
                            placeholder="e.g. CO4205"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.pos}
                            onChange={(e) => updateRepairRow(idx, "pos", e.target.value)}
                            placeholder="1-6"
                            className="h-9 text-xs border-slate-200 text-center w-full"
                          />
                        </TableCell>

                        {/* 1. Customer Dropdown (Searchable) */}
                        <TableCell>
                          <TableCustomerCell
                            value={item.customer}
                            onChange={(val) => updateRepairRow(idx, "customer", val)}
                            customerOptions={allCustomerOptions}
                          />
                        </TableCell>

                        {/* 2. Site */}
                        <TableCell>
                          <Input
                            value={item.site}
                            onChange={(e) => updateRepairRow(idx, "site", e.target.value)}
                            placeholder="e.g. BIB Sebamban"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>

                        {/* 3. Size Dropdown (Searchable) */}
                        <TableCell>
                          <TableSizeCell
                            value={item.size}
                            onChange={(val) => updateRepairRow(idx, "size", val)}
                          />
                        </TableCell>

                        {/* 4. Category Dropdown (R1, R2, R3) */}
                        <TableCell>
                          <TableCategoryCell
                            value={item.category}
                            onChange={(val) => updateRepairRow(idx, "category", val)}
                          />
                        </TableCell>

                        {/* 5. Nested Nomor PO */}
                        <TableCell>
                          <Input
                            value={item.noPo || ""}
                            onChange={(e) => updateRepairRow(idx, "noPo", e.target.value)}
                            placeholder="No PO"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>

                        {/* 6. Nested Date PO (Date Picker) */}
                        <TableCell>
                          <Input
                            type="date"
                            value={item.tanggalPo || ""}
                            onChange={(e) => updateRepairRow(idx, "tanggalPo", e.target.value)}
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>

                        {/* 7. No WO CP */}
                        <TableCell>
                          <Input
                            value={item.noWoCp}
                            onChange={(e) => updateRepairRow(idx, "noWoCp", e.target.value)}
                            placeholder="No WO CP"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
                          />
                        </TableCell>

                        {/* 8. Price Dropdown (Filtered by Customer + Site + Size + Repair/Retread) */}
                        <TableCell>
                          <TablePriceCell
                            value={item.price}
                            onChange={(val) => updateRepairRow(idx, "price", val)}
                            customer={item.customer}
                            site={item.site}
                            size={item.size}
                            category={item.category}
                            jenisWo={jenisPengajuan}
                            masterPriceList={masterPriceList}
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={repairItems.length <= 1}
                            onClick={() => removeRepairRow(idx)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Yellow Total Amount Footer */}
                    <TableRow className="bg-yellow-300/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <TableCell colSpan={10} className="text-center py-2.5 uppercase tracking-wider text-xs">
                        Total Amount
                      </TableCell>
                      <TableCell className="text-right py-2.5 font-mono text-xs">
                        {totalRepairAmount > 0 ? formatCurrency(totalRepairAmount) : "-"}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Label className="text-xs font-semibold text-slate-500">Catatan Pengajuan (Optional)</Label>
            <Textarea
              value={catatanPengajuan}
              onChange={(e) => setCatatanPengajuan(e.target.value)}
              placeholder="Catatan tambahan untuk tim operasional atau invoice..."
              rows={2}
              className="text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            {isPending ? "Menyimpan..." : editItem ? "Simpan Perubahan WO" : "Simpan Form WO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── WYSIWYG Document Preview & Print Dialog ───────────────────────────────────

function ViewDetailDialog({
  open,
  onOpenChange,
  item,
  onEdit,
  canEdit = true,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: FormWoRow | null
  onEdit: () => void
  canEdit?: boolean
}) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!item) return null

  const isService = item.jenisPengajuan === "service"
  const serviceItemsList = parseItems<ServiceItemRow>(item.items, [
    {
      id: "1",
      description: item.deskripsiPekerjaan || "Labour Service",
      job: item.jobType || "",
      customer: item.customer || "",
      site: item.site || "",
      serialNo: item.tireSn || "",
      refNo: item.storeLoc || "",
      noWoCp: item.noWoTerbit || "",
      price: item.totalAmount || "",
    },
  ])

  const repairItemsList = parseItems<RepairItemRow>(item.items, [
    {
      id: "1",
      description: item.tireSn || item.deskripsiPekerjaan || "",
      noUnit: item.storeLoc || "",
      pos: item.pattern || "",
      size: item.size || "",
      site: item.site || "",
      customer: item.customer || "",
      category: item.brand || "R1",
      price: item.totalAmount || "",
      noWoCp: item.noWoTerbit || "",
    },
  ])

  const serviceTotal = serviceItemsList.reduce((sum, r) => sum + (parseFloat((r.price || "").replace(/[^0-9.-]+/g, "")) || 0), 0)
  const repairTotal = repairItemsList.reduce((sum, r) => sum + (parseFloat((r.price || "").replace(/[^0-9.-]+/g, "")) || 0), 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[96vw] lg:max-w-[1400px] w-[96vw] max-h-[92vh] overflow-y-auto p-0 border border-slate-300 rounded-2xl shadow-xl">
        {/* Printable WYSIWYG Wrapper */}
        <div ref={printRef} className="pdf-wrapper bg-white p-6 sm:p-10 space-y-6 text-slate-900 font-sans">
          {/* Top Document Header matching Excel Screenshots */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-6 gap-4">
            {/* Chitra Paratama Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xl shadow-md">
                CP
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Chitra Paratama</h2>
                <p className="text-xs font-semibold text-teal-700 tracking-wide">Total Tire Solution</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center sm:text-right">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                Form Permintaan Work Order
              </h1>
              <p className="text-xs font-mono text-slate-500 mt-1">
                No. Pengajuan: <strong className="text-slate-900">{item.noPengajuan || "-"}</strong>
              </p>
            </div>
          </div>

          {/* Document Sub-Header: Hari & Tanggal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-medium block">Hari</span>
              <strong className="text-slate-900 text-sm">{item.hari || getTodayHari()}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Tanggal</span>
              <strong className="text-slate-900 text-sm">{item.tanggal || formatDate(item.tanggalPengajuan)}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Jenis Form</span>
              <Badge variant="outline" className={cn("text-xs font-bold mt-0.5", JENIS_CONFIG[item.jenisPengajuan]?.cls)}>
                {JENIS_CONFIG[item.jenisPengajuan]?.label ?? item.jenisPengajuan}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Pemohon</span>
              <strong className="text-slate-900 text-sm">{item.pemohon || "-"}</strong>
            </div>
          </div>

          {/* WO SERVICE TABLE matching Screenshot 1 */}
          {isService ? (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Decription</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Job</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Customer</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Site</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Serial No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">No Surat Jalan / WO Customer / No PR / No PO</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">No WO CP</th>
                    <th className="py-2.5 px-3 text-right">Price / Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serviceItemsList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.description || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.job || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.customer || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.site || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono">{row.serialNo || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono">{row.refNo || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono">{row.noWoCp || "-"}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.price ? formatCurrency(row.price) : "-"}
                      </td>
                    </tr>
                  ))}

                  {/* Yellow Total Amount Footer matching Screenshot 1 */}
                  <tr className="bg-yellow-300 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={8} className="py-2.5 px-4 text-center uppercase tracking-wider text-xs border-r border-slate-400">
                      Total Amount
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs">
                      {serviceTotal > 0 ? formatCurrency(serviceTotal) : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* WO REPAIR TABLE matching Screenshot 2 */
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Decription</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">No Unit</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-12">Pos</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Size</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Site</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Customer</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Category</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">Price</th>
                    <th className="py-2.5 px-3 text-center">No WO CP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repairItemsList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium">{row.description || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono">{row.noUnit || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">{row.pos || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.size || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.site || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.customer || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{row.category || "-"}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">
                        {row.price ? formatCurrency(row.price) : "-"}
                      </td>
                      <td className="py-2 px-3 font-mono text-center">{row.noWoCp || "-"}</td>
                    </tr>
                  ))}

                  {/* Yellow Total Amount Footer matching Screenshot 2 */}
                  <tr className="bg-yellow-300 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={8} className="py-2.5 px-4 text-center uppercase tracking-wider text-xs border-r border-slate-400">
                      Total Amount
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs border-r border-slate-400">
                      {repairTotal > 0 ? formatCurrency(repairTotal) : "-"}
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {item.catatanPengajuan && (
            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Catatan Pengajuan:</span>
              <p className="text-slate-700 leading-relaxed">{item.catatanPengajuan}</p>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between no-print">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak / Export Document
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            {canEdit && (
              <Button onClick={onEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Pencil className="h-4 w-4" />
                Edit Form WO
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: FormWoRow | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!item) return
    startTransition(async () => {
      const result = await deleteFormWo(item.id)
      if (result.success) {
        toast.success("Pengajuan berhasil dihapus")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Gagal menghapus pengajuan")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Pengajuan WO?</DialogTitle>
          <DialogDescription>
            Pengajuan <span className="font-semibold">{nv(item?.noPengajuan)}</span> akan dihapus permanen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Waiting WO Tab Component ──────────────────────────────────────────────────

function buildOrderDesc(
  customer: string | null | undefined,
  site: string | null | undefined,
  size: string | null | undefined,
  sn: string | null | undefined,
  brand: string | null | undefined
): string {
  const custUpper = (customer || "").toUpperCase()
  const isKpc = custUpper.includes("KPC") || custUpper.includes("KALTIM PRIMA COAL")

  const cleanSz = (size || "").trim()
  const cleanSn = (sn || "").trim()
  const cleanBr = (brand || "").trim()
  const cleanCust = (customer || site || "").trim()

  if (isKpc) {
    // ORDER KPC : DESC GABUNGAN ANTARA SIZE SN DAN BRAND (Repair 53/80R63 S4LSC0326 BRIDGESTONE)
    return `Repair ${cleanSz} ${cleanSn} ${cleanBr}`.replace(/\s+/g, " ").trim()
  } else {
    // ORDER OTHER CUSTOMER : DESC GABUNGAN ANTARA CUSTOMER SIZE SN (Repair PPA BIB 27.00R49 S4LSC0326)
    return `Repair ${cleanCust} ${cleanSz} ${cleanSn}`.replace(/\s+/g, " ").trim()
  }
}

function findCaiCode(
  customer: string | null | undefined,
  size: string | null | undefined,
  brand: string | null | undefined,
  caiList: MasterCaiRow[]
): string {
  const cust = (customer || "").trim().toLowerCase()
  const sz = (size || "").replace(/\s+/g, "").toLowerCase()
  const br = (brand || "").replace(/\s+/g, "").toLowerCase()

  if (!sz) return ""

  const activeList =
    caiList.length > 0
      ? caiList
      : [
          ...INITIAL_KPC_CAI.map((x, i) => ({ id: i, customer: x.customer, size: x.size, brand: x.brand, cai: x.cai, type: "Tire Repair" })),
          ...INITIAL_OTHER_CAI.map((x, i) => ({ id: i + 100, customer: x.customer, size: x.size, brand: x.brand, cai: x.cai, type: "Tire Repair" })),
        ]

  if (cust.includes("kaltim prima coal") || cust.includes("kpc")) {
    const found = activeList.find((item) => {
      const isKpc = item.customer.toLowerCase().includes("kpc") || item.customer.toLowerCase().includes("kaltim prima coal")
      if (!isKpc) return false
      const itemSz = item.size.replace(/\s+/g, "").toLowerCase()
      const itemBr = (item.brand || "").replace(/\s+/g, "").toLowerCase()
      return itemSz === sz && (itemBr === br || !br || !itemBr)
    })
    if (found) return found.cai
  }

  const foundOther = activeList.find((item) => {
    const itemSz = item.size.replace(/\s+/g, "").toLowerCase()
    return itemSz === sz
  })
  if (foundOther) return foundOther.cai

  return ""
}

function normalizeCustomerName(str: string): string {
  return str
    .toLowerCase()
    .replace(/^pt\.?\s*/i, "")
    .replace(/^cv\.?\s*/i, "")
    .replace(/[^a-z0-9]/g, "")
}

function findCustomerMatchFuzzy(
  searchName: string | null | undefined,
  customerList: CustomerRecord[] = []
): { idCode: string; name: string } {
  if (!searchName || !searchName.trim()) return { idCode: "", name: "" }
  const target = searchName.trim()
  const normTarget = normalizeCustomerName(target)

  if (!normTarget || customerList.length === 0) {
    return { idCode: target, name: target }
  }

  // 1. Exact match on name (case-insensitive)
  let match = customerList.find((c) => c.name.trim().toLowerCase() === target.toLowerCase())
  if (match) {
    return {
      idCode: match.customerCode?.trim() || match.name.trim(),
      name: match.name.trim(),
    }
  }

  // 2. Exact match on normalized name (stripping PT/CV/punctuation/spaces)
  match = customerList.find((c) => normalizeCustomerName(c.name) === normTarget)
  if (match) {
    return {
      idCode: match.customerCode?.trim() || match.name.trim(),
      name: match.name.trim(),
    }
  }

  // 3. Substring / partial fuzzy match
  match = customerList.find((c) => {
    const cNorm = normalizeCustomerName(c.name)
    return cNorm.length >= 3 && (normTarget.includes(cNorm) || cNorm.includes(normTarget))
  })
  if (match) {
    return {
      idCode: match.customerCode?.trim() || match.name.trim(),
      name: match.name.trim(),
    }
  }

  // Fallback to original target customer name if no match found
  return { idCode: target, name: target }
}

function formatDateDot(dateStr: string | Date | null | undefined): string {
  if (!dateStr) {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
  }
  if (typeof dateStr === "string") {
    if (dateStr.includes(".")) return dateStr
    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, "0")}.${parts[1].padStart(2, "0")}.${parts[0]}`
      }
      return `${parts[0].padStart(2, "0")}.${parts[1].padStart(2, "0")}.${parts[2]}`
    }
  }
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
}

function WaitingWoTab({
  data,
  onCreateWo,
  onCreateBulkWo,
  caiList = [],
  customerList = [],
  canEdit = true,
}: {
  data: WipRepairRecord[]
  onCreateWo: (item: WipRepairRecord) => void
  onCreateBulkWo: (items: WipRepairRecord[]) => void
  caiList?: MasterCaiRow[]
  customerList?: CustomerRecord[]
  canEdit?: boolean
}) {
  const [query, setQuery] = useState("")
  const [poMap, setPoMap] = useState<Record<string, { noPo: string; poDate: string }>>({})
  const [selectedWipIds, setSelectedWipIds] = useState<string[]>([])

  useEffect(() => {
    const map: Record<string, { noPo: string; poDate: string }> = {}
    data.forEach((item) => {
      if (item.id_wo) {
        map[item.id_wo] = {
          noPo: item.po ?? "",
          poDate: item.po_date !== null && item.po_date !== undefined ? item.po_date : (item.inspect_date || ""),
        }
      }
    })
    setPoMap(map)
  }, [data])

  const handlePoChange = (idWo: string, field: "noPo" | "poDate", val: string) => {
    setPoMap((prev) => ({
      ...prev,
      [idWo]: {
        noPo: field === "noPo" ? val : (prev[idWo]?.noPo ?? ""),
        poDate: field === "poDate" ? val : (prev[idWo]?.poDate ?? ""),
      },
    }))
  }

  const handlePoBlur = async (idWo: string) => {
    const entry = poMap[idWo] || { noPo: "", poDate: "" }
    const res = await saveWipPo(idWo, entry.noPo, entry.poDate)
    if (res.success) {
      toast.success(`Nomor & Date PO untuk ID WO '${idWo}' tersimpan!`, { duration: 1500 })
    } else {
      toast.error(res.error || "Gagal menyimpan Nomor/Date PO")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((item) => {
      const entry = poMap[item.id_wo]
      const currentPo = entry?.noPo ?? item.po ?? ""
      const currentPoDate = entry?.poDate ?? item.po_date ?? item.inspect_date ?? ""
      return [item.id_wo, item.tire_sn, item.customer, item.site, item.brand, item.size, item.inspector, currentPo, currentPoDate]
        .map((v) => nv(v).toLowerCase())
        .some((v) => v.includes(q))
    })
  }, [data, query, poMap])

  // Bulk Selection Helpers & Validation
  const selectedRecords = useMemo(() => {
    return data.filter((item) => selectedWipIds.includes(item.id_wo))
  }, [data, selectedWipIds])

  const selectedCustomer = useMemo(() => {
    return selectedRecords.length > 0 ? selectedRecords[0].customer : null
  }, [selectedRecords])

  const handleToggleRow = (item: WipRepairRecord) => {
    const isSelected = selectedWipIds.includes(item.id_wo)
    if (isSelected) {
      setSelectedWipIds((prev) => prev.filter((id) => id !== item.id_wo))
    } else {
      if (selectedCustomer && item.customer !== selectedCustomer) {
        toast.error(
          `⚠️ Customer harus sama! Unit ini milik "${item.customer}", sedangkan seleksi saat ini milik "${selectedCustomer}".`,
          { duration: 4000 }
        )
        return
      }
      setSelectedWipIds((prev) => [...prev, item.id_wo])
    }
  }

  const isAllSelected =
    filtered.length > 0 && filtered.every((item) => selectedWipIds.includes(item.id_wo))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedWipIds([])
    } else {
      if (filtered.length === 0) return
      const targetCustomer = filtered[0].customer
      const sameCustomerItems = filtered.filter((i) => i.customer === targetCustomer)
      const ids = sameCustomerItems.map((i) => i.id_wo)
      setSelectedWipIds(ids)

      if (sameCustomerItems.length < filtered.length) {
        toast.info(
          `Memilih ${sameCustomerItems.length} unit milik customer "${targetCustomer}". Unit customer lain tidak dipilih otomatis.`,
          { duration: 4000 }
        )
      } else {
        toast.success(`${sameCustomerItems.length} unit berhasil dipilih!`)
      }
    }
  }

  async function handleExportPowerAutomate() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data Waiting WO untuk diekspor")
      return
    }

    const todayDot = formatDateDot(new Date())

    const rows = filtered.map((item) => {
      const orderDesc = buildOrderDesc(item.customer, item.site, item.size, item.tire_sn, item.brand)
      const caiCode = findCaiCode(item.customer, item.size, item.brand, caiList)

      const entry = poMap[item.id_wo]
      const rawPo = entry?.noPo !== undefined ? entry.noPo : (item.po || "")
      const userPo = rawPo.trim()

      const rawPoDate = entry?.poDate !== undefined ? entry.poDate : (item.po_date || item.inspect_date || "")
      const poDateDot = formatDateDot(rawPoDate || item.inspect_date)

      const custMatch = findCustomerMatchFuzzy(item.customer, customerList)

      return {
        order: orderDesc,
        cai: caiCode,
        sn: item.tire_sn || "",
        po: userPo,
        "po date": poDateDot,
        "Sold-to party": custMatch.idCode,
        "Sort Field": todayDot,
        "Customer Name": custMatch.name,
      }
    })

    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Power Automate WO")
    XLSX.writeFile(wb, `Waiting_WO_Power_Automate_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success("File Excel Power Automate berhasil di-export!")
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Bulk Action Toolbar Bar */}
        {selectedWipIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Badge variant="secondary" className="bg-violet-600 text-white font-bold text-xs px-3 py-1">
                {selectedWipIds.length} Unit Dipilih
              </Badge>
              <div className="text-xs font-medium text-slate-700">
                Customer: <span className="font-bold text-violet-800">{selectedCustomer}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onCreateBulkWo(selectedRecords)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg h-9 text-xs font-bold shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  BUAT WO TERGABUNG ({selectedWipIds.length} Unit)
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedWipIds([])}
                className="h-9 text-xs font-semibold rounded-lg border-slate-300 text-slate-600 hover:bg-white"
              >
                Batal Seleksi
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ID WO, Tire SN, Customer, Site, Brand, Nomor PO, Date PO..."
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportPowerAutomate()}
            className="h-10 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs shrink-0 shadow-xs"
          >
            <Download className="mr-1.5 h-4 w-4 text-emerald-600" />
            Export Excel (Power Automate)
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10 px-3 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleToggleSelectAll}
                    title="Pilih semua unit customer ini"
                  />
                </TableHead>
                <TableHead className="px-4 py-3">Aksi</TableHead>
                <TableHead className="px-4 py-3">ID WO</TableHead>
                <TableHead className="px-4 py-3">Tire SN</TableHead>
                <TableHead className="px-4 py-3">Customer / Site</TableHead>
                <TableHead className="px-4 py-3">Brand / Size</TableHead>
                <TableHead className="px-4 py-3 min-w-[180px]">Nomor PO (Editable)</TableHead>
                <TableHead className="px-4 py-3 min-w-[150px]">Date PO (Editable)</TableHead>
                <TableHead className="px-4 py-3">Job Type</TableHead>
                <TableHead className="px-4 py-3">Inspect Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    Tidak ada unit Waiting WO yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, idx) => {
                  const isChecked = selectedWipIds.includes(item.id_wo)
                  const isDiffCustomer = selectedCustomer !== null && item.customer !== selectedCustomer

                  return (
                    <TableRow key={item.id_wo || idx} className={cn("hover:bg-muted/30 transition-colors", isChecked && "bg-violet-50/70")}>
                      <TableCell className="w-10 px-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleRow(item)}
                          className={cn(isDiffCustomer && "opacity-40 cursor-not-allowed")}
                          title={isDiffCustomer ? `Customer berbeda (${item.customer})` : "Pilih unit"}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {canEdit && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onCreateWo(item)}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-8 text-xs font-semibold"
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Buat WO
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs font-bold text-violet-700">
                        {nv(item.id_wo)}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold">
                        {nv(item.tire_sn)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-900">{nv(item.customer)}</div>
                        <div className="text-slate-500">{nv(item.site)}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <div>{nv(item.brand)}</div>
                        <div className="text-slate-500 font-mono">{nv(item.size)}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 min-w-[180px]">
                        <Input
                          value={poMap[item.id_wo]?.noPo ?? item.po ?? ""}
                          onChange={(e) => handlePoChange(item.id_wo, "noPo", e.target.value)}
                          onBlur={() => void handlePoBlur(item.id_wo)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void handlePoBlur(item.id_wo)
                              ;(e.target as HTMLInputElement).blur()
                            }
                          }}
                          placeholder="Ketik Nomor PO..."
                          className="h-8 text-xs font-mono border-slate-200 bg-white"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 min-w-[150px]">
                        <Input
                          value={poMap[item.id_wo]?.poDate ?? item.po_date ?? item.inspect_date ?? ""}
                          onChange={(e) => handlePoChange(item.id_wo, "poDate", e.target.value)}
                          onBlur={() => void handlePoBlur(item.id_wo)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void handlePoBlur(item.id_wo)
                              ;(e.target as HTMLInputElement).blur()
                            }
                          }}
                          placeholder="e.g. 10.08.2026"
                          className="h-8 text-xs font-mono border-slate-200 bg-white"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">{nv(item.job_type)}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-500">{nv(item.inspect_date)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Daftar Pengajuan Tab Component ────────────────────────────────────────────

function DaftarPengajuanTab({
  data,
  initialJenisFilter = ALL_FILTER,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: {
  data: FormWoRow[]
  initialJenisFilter?: string
  onView: (item: FormWoRow) => void
  onEdit: (item: FormWoRow) => void
  onDelete: (item: FormWoRow) => void
  canEdit?: boolean
  canDelete?: boolean
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER)
  const [jenisFilter, setJenisFilter] = useState(initialJenisFilter)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setJenisFilter(initialJenisFilter)
  }, [initialJenisFilter])

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      // 1. Root level row fields
      const rootText = [
        item.noPengajuan,
        item.idWo,
        item.tireSn,
        item.customer,
        item.site,
        item.brand,
        item.pemohon,
        item.deskripsiPekerjaan,
        item.noPo,
        item.tanggalPo,
        item.noWoTerbit,
      ]

      // 2. Nested line items fields (Tire SN, Serial No, Unit, Size, PO, Ref No, Job)
      let itemsText = ""
      if (item.items) {
        try {
          const parsed = typeof item.items === "string" ? JSON.parse(item.items) : item.items
          if (Array.isArray(parsed)) {
            itemsText = parsed
              .map((sub: any) =>
                [sub.description, sub.serialNo, sub.noUnit, sub.pos, sub.size, sub.category, sub.noPo, sub.noWoCp, sub.refNo, sub.job]
                  .filter(Boolean)
                  .join(" ")
              )
              .join(" ")
          }
        } catch {}
      }

      const fullSearchable = [...rootText.map((v) => nv(v)), itemsText].join(" ").toLowerCase()
      const matchesQuery = !q || fullSearchable.includes(q)

      const matchesStatus = statusFilter === ALL_FILTER || item.statusPengajuan === statusFilter
      const matchesJenis = jenisFilter === ALL_FILTER || item.jenisPengajuan === jenisFilter
      return matchesQuery && matchesStatus && matchesJenis
    })
  }, [data, query, statusFilter, jenisFilter])

  // AUTO EXPAND rows when user types a search query (especially Tire SN)
  useEffect(() => {
    if (query.trim()) {
      const autoExpanded: Record<string, boolean> = {}
      filtered.forEach((item) => {
        autoExpanded[item.id] = true
      })
      setExpandedRows(autoExpanded)
    }
  }, [query, filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter, jenisFilter, pageSize])

  // Inline Server Actions
  async function handleInlineStatusChange(id: number, status: "pending" | "diproses" | "approved" | "rejected") {
    const res = await updateFormWoStatus(id, status)
    if (res.success) {
      toast.success(`Status pengajuan diperbarui ke ${STATUS_CONFIG[status]?.label || status}`)
    } else {
      toast.error(res.error || "Gagal memperbarui status")
    }
  }

  async function handleInlineNoWoTerbit(id: number, noWoTerbit: string) {
    const res = await updateFormWo(id, { noWoTerbit })
    if (res.success) {
      toast.success("No WO Terbit berhasil diperbarui")
    } else {
      toast.error(res.error || "Gagal memperbarui No WO Terbit")
    }
  }

  async function handleInlineSubItemUpdate(item: FormWoRow, subIdx: number, field: string, val: string) {
    let parsed: any[] = []
    try {
      parsed = typeof item.items === "string" ? JSON.parse(item.items) : item.items || []
    } catch {}

    if (!parsed[subIdx]) return
    parsed[subIdx][field] = val

    let newTotal = 0
    parsed.forEach((r: any) => {
      if (r.price) {
        const clean = String(r.price).replace(/,/g, "")
        const num = parseFloat(clean)
        if (!isNaN(num)) newTotal += num
      }
    })

    const firstSub = parsed[0]
    const res = await updateFormWo(item.id, {
      items: JSON.stringify(parsed),
      totalAmount: newTotal > 0 ? String(newTotal) : item.totalAmount,
      noPo: field === "noPo" ? val : (firstSub?.noPo || item.noPo || undefined),
    })

    if (res.success) {
      toast.success("Item berhasil diperbarui")
    } else {
      toast.error("Gagal memperbarui item")
    }
  }

  async function handleExport() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }
    const rows = filtered.map((item) => ({
      "No. Pengajuan": nv(item.noPengajuan),
      Jenis: JENIS_CONFIG[item.jenisPengajuan]?.label ?? item.jenisPengajuan,
      Hari: nv(item.hari),
      Tanggal: nv(item.tanggal) || formatDate(item.tanggalPengajuan),
      Status: STATUS_CONFIG[item.statusPengajuan]?.label ?? item.statusPengajuan,
      Customer: nv(item.customer),
      Site: nv(item.site),
      "Nomor PO": nv(item.noPo),
      "Date PO": nv(item.tanggalPo),
      Pemohon: nv(item.pemohon),
      "Total Amount": item.totalAmount ? formatCurrency(item.totalAmount) : "-",
      "No WO Terbit": nv(item.noWoTerbit),
    }))
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Form WO")
    XLSX.writeFile(wb, `Form_WO_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const countService = data.filter((i) => i.jenisPengajuan === "service").length
  const countRepair = data.filter((i) => i.jenisPengajuan === "repair").length
  const countRetread = data.filter((i) => i.jenisPengajuan === "retread").length
  const countNonRepair = data.filter((i) => i.jenisPengajuan === "non_repair").length

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4">
            {/* Top Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setJenisFilter(ALL_FILTER)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  jenisFilter === ALL_FILTER ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua List WO ({data.length})
              </button>
              <button
                type="button"
                onClick={() => setJenisFilter("service")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5",
                  jenisFilter === "service" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                🛠️ WO Service ({countService})
              </button>
              <button
                type="button"
                onClick={() => setJenisFilter("repair")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5",
                  jenisFilter === "repair" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                )}
              >
                🔧 WO Repair ({countRepair})
              </button>
              <button
                type="button"
                onClick={() => setJenisFilter("retread")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5",
                  jenisFilter === "retread" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                )}
              >
                ⚙️ WO Retread ({countRetread})
              </button>
              {countNonRepair > 0 && (
                <button
                  type="button"
                  onClick={() => setJenisFilter("non_repair")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5",
                    jenisFilter === "non_repair" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                  )}
                >
                  📄 Non-Repair ({countNonRepair})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari no. pengajuan, Tire SN / Serial No, customer, site, pemohon, PO..."
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <Button type="button" variant="outline" className="h-10 rounded-xl shrink-0" onClick={() => void handleExport()}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Semua jenis</SelectItem>
                  <SelectItem value="service">WO Service</SelectItem>
                  <SelectItem value="repair">WO Repair</SelectItem>
                  <SelectItem value="retread">WO Retread</SelectItem>
                  <SelectItem value="non_repair">Non-Repair</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Semua status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="diproses">Diproses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-4 py-3 w-32">Aksi</TableHead>
                <TableHead className="px-4 py-3">No. Pengajuan</TableHead>
                <TableHead className="px-4 py-3">Jenis Form</TableHead>
                <TableHead className="px-4 py-3 text-center">QTY</TableHead>
                <TableHead className="px-4 py-3">Hari & Tanggal</TableHead>
                <TableHead className="px-4 py-3">Status (Inline)</TableHead>
                <TableHead className="px-4 py-3">Customer / Site</TableHead>
                <TableHead className="px-4 py-3">Nomor PO</TableHead>
                <TableHead className="px-4 py-3">Date PO</TableHead>
                <TableHead className="px-4 py-3">Pemohon</TableHead>
                <TableHead className="px-4 py-3 text-right">Total Amount</TableHead>
                <TableHead className="px-4 py-3">No WO Terbit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                    {data.length === 0 ? "Belum ada pengajuan Form WO." : "Tidak ada data yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.statusPengajuan] ?? { label: item.statusPengajuan, cls: "" }
                  const jenisCfg = JENIS_CONFIG[item.jenisPengajuan] ?? { label: item.jenisPengajuan, cls: "" }
                  const isExpanded = !!expandedRows[item.id]

                  // Parse items safely for row expansion detail
                  let parsedItems: any[] = []
                  if (item.items) {
                    try {
                      const p = typeof item.items === "string" ? JSON.parse(item.items) : item.items
                      if (Array.isArray(p)) parsedItems = p
                    } catch {}
                  }

                  const itemQty = parsedItems.length > 0 ? parsedItems.length : 1

                  return (
                    <Fragment key={item.id}>
                      <TableRow className={cn("group hover:bg-muted/30 transition-colors", isExpanded && "bg-slate-50/90")}>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 rounded-lg p-0 text-slate-500 hover:text-indigo-600 transition-transform duration-200",
                                isExpanded && "rotate-90 text-indigo-600 bg-indigo-50"
                              )}
                              title={isExpanded ? "Sembunyikan rincian item" : "Tampilkan detail rincian item"}
                              onClick={() => toggleExpand(item.id)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-slate-600 hover:text-indigo-600"
                              title="Lihat document / print"
                              onClick={() => onView(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0 text-slate-600 hover:text-blue-600"
                                title="Edit"
                                onClick={() => onEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0 text-red-500 hover:text-red-700"
                                title="Hapus"
                                onClick={() => onDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-xs font-semibold">
                          <HighlightText value={item.noPengajuan} query={query} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-semibold", jenisCfg.cls)}>
                            {jenisCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100">
                            {itemQty} Item
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{item.hari || "-"}</div>
                          <div className="text-slate-500">{item.tanggal || formatDate(item.tanggalPengajuan)}</div>
                        </TableCell>

                        {/* INLINE EDIT STATUS BADGE */}
                        <TableCell className="px-4 py-3">
                          <Select
                            value={item.statusPengajuan}
                            onValueChange={(val: any) => void handleInlineStatusChange(item.id, val)}
                          >
                            <SelectTrigger className="h-7 border-none bg-transparent p-0 focus:ring-0 shadow-none w-auto">
                              <Badge variant="outline" className={cn("text-xs font-medium cursor-pointer hover:opacity-80 transition flex items-center gap-1", statusCfg.cls)}>
                                {statusCfg.label}
                                <ChevronDown className="h-3 w-3 opacity-60" />
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                              <SelectItem value="diproses" className="text-xs">Diproses</SelectItem>
                              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                              <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-xs">
                          <div className="font-semibold text-slate-900">
                            <HighlightText value={item.customer} query={query} />
                          </div>
                          <div className="text-slate-500">{nv(item.site)}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-violet-700">
                          <HighlightText value={item.noPo} query={query} />
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-xs text-slate-600">
                          <HighlightText value={item.tanggalPo} query={query} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          <HighlightText value={item.pemohon} query={query} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-right text-slate-900">
                          {item.totalAmount ? formatCurrency(item.totalAmount) : "-"}
                        </TableCell>

                        {/* INLINE EDIT NO WO TERBIT */}
                        <TableCell className="px-4 py-3 font-mono text-xs">
                          <Input
                            defaultValue={item.noWoTerbit || ""}
                            placeholder="Ketik No WO..."
                            onBlur={(e) => {
                              const val = e.target.value.trim()
                              if (val !== (item.noWoTerbit || "")) {
                                void handleInlineNoWoTerbit(item.id, val)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = (e.target as HTMLInputElement).value.trim()
                                if (val !== (item.noWoTerbit || "")) {
                                  void handleInlineNoWoTerbit(item.id, val)
                                }
                              }
                            }}
                            className="h-8 text-xs border-slate-200 focus:border-indigo-500 font-mono w-28 bg-white"
                          />
                        </TableCell>
                      </TableRow>

                      {/* Collapsible Expanded Detail Sub-row with Inline Editing */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/90 border-b border-slate-200">
                          <TableCell colSpan={12} className="p-3 pl-10">
                            <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-inner space-y-2">
                              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                                  Rincian Pekerjaan ({parsedItems.length > 0 ? parsedItems.length : 1} Baris Item - Bisa Edit Inline)
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono text-indigo-700 bg-indigo-50/50">
                                  {item.noPengajuan}
                                </Badge>
                              </div>

                              {parsedItems.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <Table className="text-xs w-full bg-white">
                                    <TableHeader className="bg-slate-100/90 text-slate-700 font-semibold">
                                      <TableRow className="h-8">
                                        <TableHead className="h-8 px-2 text-center w-8">#</TableHead>
                                        {item.jenisPengajuan === "service" ? (
                                          <>
                                            <TableHead className="h-8 px-2">Description</TableHead>
                                            <TableHead className="h-8 px-2">Job</TableHead>
                                            <TableHead className="h-8 px-2">Serial No</TableHead>
                                            <TableHead className="h-8 px-2">Customer / Site</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Nomor PO</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Date PO</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Nomor WO</TableHead>
                                            <TableHead className="h-8 px-2 text-right">Price</TableHead>
                                          </>
                                        ) : (
                                          <>
                                            <TableHead className="h-8 px-2">Description (Tire SN)</TableHead>
                                            <TableHead className="h-8 px-2">Unit / Pos</TableHead>
                                            <TableHead className="h-8 px-2">Customer / Site</TableHead>
                                            <TableHead className="h-8 px-2">Size</TableHead>
                                            <TableHead className="h-8 px-2">Category</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Nomor PO</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Date PO</TableHead>
                                            <TableHead className="h-8 px-2 font-mono">Nomor WO</TableHead>
                                            <TableHead className="h-8 px-2 text-right">Price</TableHead>
                                          </>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-slate-100">
                                      {parsedItems.map((sub: any, subIdx: number) => (
                                        <TableRow key={subIdx} className="h-9 hover:bg-slate-50/80 font-mono text-xs">
                                          <TableCell className="px-2 text-center font-sans text-slate-400 font-semibold">{subIdx + 1}</TableCell>
                                          {item.jenisPengajuan === "service" ? (
                                            <>
                                              <TableCell className="px-2 font-sans font-medium text-slate-900">
                                                <Input
                                                  defaultValue={sub.description || ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.description || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "description", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-sans font-medium bg-white w-36"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-sans text-slate-600">{sub.job || "-"}</TableCell>
                                              <TableCell className="px-2 font-mono text-indigo-700 font-bold">
                                                <Input
                                                  defaultValue={sub.serialNo || ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.serialNo || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "serialNo", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono font-bold text-indigo-700 bg-white w-32"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-sans text-slate-700">
                                                {sub.customer || item.customer} {sub.site ? `(${sub.site})` : ""}
                                              </TableCell>
                                              <TableCell className="px-2 font-mono text-slate-600">
                                                <Input
                                                  defaultValue={sub.noPo || item.noPo || ""}
                                                  placeholder="No PO"
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.noPo || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "noPo", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-28"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-mono text-slate-600">
                                                <Input
                                                  type="date"
                                                  defaultValue={sub.tanggalPo || item.tanggalPo || ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.tanggalPo || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "tanggalPo", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-32"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-mono font-semibold text-slate-800">
                                                <Input
                                                  defaultValue={sub.noWoCp || item.noWoCp || item.noWoTerbit || ""}
                                                  placeholder="No WO"
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.noWoCp || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "noWoCp", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-28"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {sub.price ? formatCurrency(sub.price) : "-"}
                                              </TableCell>
                                            </>
                                          ) : (
                                            <>
                                              {/* TIRE SN / DESCRIPTION INLINE EDIT */}
                                              <TableCell className="px-2 font-mono font-bold text-indigo-700">
                                                <Input
                                                  defaultValue={sub.description || item.tireSn || ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.description || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "description", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono font-bold text-indigo-700 bg-white w-36"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-sans text-slate-700">
                                                <Input
                                                  defaultValue={sub.noUnit || ""}
                                                  placeholder="Unit"
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.noUnit || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "noUnit", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-sans bg-white w-20"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-sans text-slate-700">
                                                {sub.customer || item.customer} {sub.site ? `(${sub.site})` : ""}
                                              </TableCell>
                                              <TableCell className="px-2 font-mono font-semibold text-slate-800">{sub.size || "-"}</TableCell>
                                              <TableCell className="px-2">
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium bg-slate-100 text-slate-800">
                                                  {sub.category || "R1"}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="px-2 font-mono text-slate-600">
                                                <Input
                                                  defaultValue={sub.noPo || item.noPo || ""}
                                                  placeholder="No PO"
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.noPo || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "noPo", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-28"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-mono text-slate-600">
                                                <Input
                                                  type="date"
                                                  defaultValue={sub.tanggalPo || item.tanggalPo || ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.tanggalPo || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "tanggalPo", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-32"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 font-mono font-semibold text-slate-800">
                                                <Input
                                                  defaultValue={sub.noWoCp || item.noWoCp || item.noWoTerbit || ""}
                                                  placeholder="No WO"
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim()
                                                    if (val !== (sub.noWoCp || "")) {
                                                      void handleInlineSubItemUpdate(item, subIdx, "noWoCp", val)
                                                    }
                                                  }}
                                                  className="h-7 text-xs border-slate-200 font-mono bg-white w-28"
                                                />
                                              </TableCell>
                                              <TableCell className="px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                                {sub.price ? formatCurrency(sub.price) : "-"}
                                              </TableCell>
                                            </>
                                          )}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 italic py-1">
                                  Tire SN / Serial No: <span className="font-mono font-bold text-indigo-700">{item.tireSn || "-"}</span> | Customer: {item.customer} | Site: {item.site || "-"} | PO: {item.noPo || "-"}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

// ─── Master Data CAI Tab Component ─────────────────────────────────────────────

function MasterDataCaiTab({
  data,
  onRefresh,
  canEdit = true,
  canDelete = true,
}: {
  data: MasterCaiRow[]
  onRefresh: () => void
  canEdit?: boolean
  canDelete?: boolean
}) {
  const [query, setQuery] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Dialog states
  const [addEditOpen, setAddEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterCaiRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<MasterCaiRow | null>(null)

  // Fallback data if DB list is empty yet
  const listData = useMemo(() => {
    if (data.length > 0) return data
    const fallbackKpc = INITIAL_KPC_CAI.map((item, idx) => ({
      id: idx + 1,
      customer: item.customer,
      size: item.size,
      brand: item.brand,
      cai: item.cai,
      type: "Tire Repair",
    }))
    const fallbackOther = INITIAL_OTHER_CAI.map((item, idx) => ({
      id: idx + 100,
      customer: item.customer,
      size: item.size,
      brand: item.brand,
      cai: item.cai,
      type: "Tire Repair",
    }))
    return [...fallbackKpc, ...fallbackOther]
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listData.filter((item) => {
      const matchesCustomer =
        customerFilter === "all" ||
        (customerFilter === "kpc" && item.customer === "PT Kaltim Prima Coal") ||
        (customerFilter === "other" && item.customer === "OTHER CUSTOMER")
      const matchesQuery =
        !q ||
        [item.customer, item.size, item.brand, item.cai, `${item.size}${item.brand || ""}`]
          .map((v) => nv(v).toLowerCase())
          .some((v) => v.includes(q))
      return matchesCustomer && matchesQuery
    })
  }, [listData, query, customerFilter])

  const handleCopyCai = (caiCode: string) => {
    void navigator.clipboard.writeText(caiCode)
    setCopiedCode(caiCode)
    toast.success(`Kode CAI '${caiCode}' disalin!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function handleExport() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data CAI untuk diekspor")
      return
    }
    const rows = filtered.map((item) => ({
      Customer: item.customer,
      Type: item.type,
      SIZE: item.size,
      BRAND: item.brand || "-",
      Merge: `${item.size}${item.brand || ""}`,
      CAI: item.cai,
    }))
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Master CAI")
    XLSX.writeFile(wb, `Master_Data_CAI_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  function handleOpenAdd() {
    setEditItem(null)
    setAddEditOpen(true)
  }

  function handleOpenEdit(item: MasterCaiRow) {
    setEditItem(item)
    setAddEditOpen(true)
  }

  function handleOpenDelete(item: MasterCaiRow) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari Customer, Size, Brand, atau Kode CAI..."
                  className="h-10 rounded-xl pl-9 text-xs"
                />
              </div>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-10 w-44 rounded-xl text-xs">
                  <SelectValue placeholder="Semua Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Customer</SelectItem>
                  <SelectItem value="kpc">PT Kaltim Prima Coal</SelectItem>
                  <SelectItem value="other">OTHER CUSTOMER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-xl shrink-0 text-xs" onClick={() => void handleExport()}>
                <Download className="mr-1.5 h-4 w-4" />
                Export Excel
              </Button>
              {canEdit && (
                <Button type="button" onClick={handleOpenAdd} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Tambah CAI
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-4 py-3 w-28">Aksi</TableHead>
                <TableHead className="px-4 py-3">Customer</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">SIZE</TableHead>
                <TableHead className="px-4 py-3">BRAND</TableHead>
                <TableHead className="px-4 py-3">Merge (Size + Brand)</TableHead>
                <TableHead className="px-4 py-3">Kode CAI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Tidak ada data Master Data CAI yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-slate-600 hover:text-indigo-600"
                          title="Salin Kode CAI"
                          onClick={() => handleCopyCai(item.cai)}
                        >
                          {copiedCode === item.cai ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 text-slate-600 hover:text-blue-600"
                            title="Edit CAI"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 text-red-500 hover:text-red-700"
                            title="Hapus CAI"
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs font-semibold text-slate-900">
                      <Badge variant="outline" className={item.customer === "PT Kaltim Prima Coal" ? "border-purple-200 bg-purple-50 text-purple-700 font-bold" : "border-slate-200 bg-slate-100 text-slate-700 font-bold"}>
                        {item.customer}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs">
                      <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 font-semibold text-xs">
                        {item.type || "Tire Repair"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                      <HighlightText value={item.size} query={query} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs">
                      {item.brand ? (
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold text-xs">
                          <HighlightText value={item.brand} query={query} />
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-slate-500">
                      {`${item.size}${item.brand || ""}`}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="font-mono font-extrabold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200 text-xs inline-block shadow-xs">
                        <HighlightText value={item.cai} query={query} />
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit CAI Modal */}
      <CreateOrEditCaiModal
        open={addEditOpen}
        onOpenChange={setAddEditOpen}
        editItem={editItem}
        onSuccess={onRefresh}
      />

      {/* Delete CAI Confirm Modal */}
      <DeleteCaiModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deleteItem}
        onSuccess={onRefresh}
      />
    </div>
  )
}

// ─── Modal Add/Edit Master Data CAI ──────────────────────────────────────────

function CreateOrEditCaiModal({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editItem: MasterCaiRow | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [customer, setCustomer] = useState("OTHER CUSTOMER")
  const [size, setSize] = useState("")
  const [brand, setBrand] = useState("")
  const [cai, setCai] = useState("")
  const [type, setType] = useState("Tire Repair")

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCustomer(editItem.customer || "OTHER CUSTOMER")
        setSize(editItem.size || "")
        setBrand(editItem.brand || "")
        setCai(editItem.cai || "")
        setType(editItem.type || "Tire Repair")
      } else {
        setCustomer("OTHER CUSTOMER")
        setSize("")
        setBrand("")
        setCai("")
        setType("Tire Repair")
      }
    }
  }, [open, editItem])

  const handleSubmit = () => {
    startTransition(async () => {
      const payload = {
        customer: customer || "OTHER CUSTOMER",
        size: size || "-",
        brand: brand || undefined,
        cai: cai || "-",
        type: type || "Tire Repair",
      }

      let result
      if (editItem) {
        result = await updateMasterDataCai(editItem.id, payload)
      } else {
        result = await createMasterDataCai(payload)
      }

      if (result.success) {
        toast.success(editItem ? "Master Data CAI berhasil diperbarui!" : "Master Data CAI berhasil ditambahkan!")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Gagal menyimpan Master Data CAI")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-600" />
            {editItem ? "Edit Master Data CAI" : "Tambah Master Data CAI Baru"}
          </DialogTitle>
          <DialogDescription>
            Isi atau ubah informasi referensi Kode CAI. Seluruh kolom bersifat opsional (tidak ada yang wajib).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 text-xs">
          <div className="flex flex-col gap-1.5">
            <Label className="font-semibold text-slate-700">Customer</Label>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger className="h-9 bg-white text-xs">
                <SelectValue placeholder="Pilih Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PT Kaltim Prima Coal">PT Kaltim Prima Coal</SelectItem>
                <SelectItem value="OTHER CUSTOMER">OTHER CUSTOMER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-slate-700">SIZE (Ukuran Ban)</Label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 53/80R63 / 27.00 R 49"
                className="h-9 bg-white text-xs font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-slate-700">BRAND (Optional)</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. BRIDGESTONE / MICHELIN"
                className="h-9 bg-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-slate-700">Kode CAI</Label>
              <Input
                value={cai}
                onChange={(e) => setCai(e.target.value)}
                placeholder="e.g. 615163A101 / 699149C101"
                className="h-9 bg-white text-xs font-mono font-bold text-violet-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-slate-700">Type</Label>
              <Input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Tire Repair"
                className="h-9 bg-white text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
            {isPending ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Tambah CAI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Delete Master Data CAI ──────────────────────────────────────────────

function DeleteCaiModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: MasterCaiRow | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!item) return
    startTransition(async () => {
      const result = await deleteMasterDataCai(item.id)
      if (result.success) {
        toast.success("Master Data CAI berhasil dihapus")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Gagal menghapus Master Data CAI")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Master Data CAI?</DialogTitle>
          <DialogDescription>
            Master Data CAI Kode <span className="font-semibold font-mono text-violet-700">{item?.cai}</span> ({item?.customer} - {item?.size}) akan dihapus.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Menghapus..." : "Hapus CAI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Master Price Repair & Retread Tab Components ───────────────────────────────

const PRESET_TIRE_SIZES = [
  "27.00R49",
  "12.00R24",
  "11.00R20",
  "13.00R22.5",
  "16.00R25",
  "18.00R33",
  "20.50R25",
  "24.00R35",
  "23.50R35",
  "26.5R25",
  "29.50R25",
  "325/95R24",
  "33.R51",
  "37R57",
  "35/65R33",
] as const

function CreateOrEditPriceDialog({
  open,
  onOpenChange,
  editItem,
  customerList = [],
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editItem?: RepairMasterPriceRecord | null
  customerList?: CustomerRecord[]
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<"Repair" | "Retread">("Repair")
  const [selectedCustomer, setSelectedCustomer] = useState("OTHER CUSTOMER")
  const [customCustomer, setCustomCustomer] = useState("")
  const [selectedSize, setSelectedSize] = useState("27.00R49")
  const [customSize, setCustomSize] = useState("")
  const [damageType, setDamageType] = useState<"R1" | "R2" | "R3">("R1")
  const [site, setSite] = useState("")
  const [price, setPrice] = useState("")

  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)

  const allCustomerOptions = useMemo(() => {
    const list: Array<{ name: string; code?: string }> = []
    const seen = new Set<string>()

    const addCust = (name: string, code?: string) => {
      const trimmed = name.trim()
      if (!trimmed || trimmed.toUpperCase() === "OTHER CUSTOMER" || seen.has(trimmed.toLowerCase())) return
      seen.add(trimmed.toLowerCase())
      list.push({ name: trimmed, code })
    }

    if (Array.isArray(customerList)) {
      customerList.forEach((c) => addCust(c.name, c.customerCode || (c as any).code))
    }

    const PRESETS = [
      "PT Kaltim Prima Coal",
      "PT Berau Coal",
      "PT Adaro Indonesia",
      "PT Bukit Asam Tbk",
      "PT Freeport Indonesia",
      "PT Arutmin Indonesia",
      "PT Saptaindra Sejati",
      "PT Pamapersada Nusantara",
      "PT Putra Perkasa Abadi",
      "PT Darma Henwa Tbk",
      "PT Delta Dunia Makmur Tbk (BUMA)",
      "PT Vale Indonesia Tbk",
      "PT Amman Mineral Nusa Tenggara",
      "PT Borneo Indobara",
      "PT Kideco Jaya Agung",
    ]
    PRESETS.forEach((p) => addCust(p))

    return list
  }, [customerList])

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCategory((editItem.category as any) || "Repair")
        const cust = editItem.customer || "OTHER CUSTOMER"
        const foundCust = allCustomerOptions.find((c) => c.name === cust || c.code === cust)
        if (foundCust) {
          setSelectedCustomer(foundCust.name)
          setCustomCustomer("")
        } else if (cust === "OTHER CUSTOMER") {
          setSelectedCustomer("OTHER CUSTOMER")
          setCustomCustomer("")
        } else {
          setSelectedCustomer("OTHER CUSTOMER")
          setCustomCustomer(cust)
        }

        const sz = editItem.size || ""
        if (PRESET_TIRE_SIZES.includes(sz as any)) {
          setSelectedSize(sz)
          setCustomSize("")
        } else {
          setSelectedSize("__custom__")
          setCustomSize(sz)
        }

        setDamageType((editItem.damageType as any) || "R1")
        setSite(editItem.site || "")
        setPrice(editItem.price ? String(editItem.price) : "")
      } else {
        setCategory("Repair")
        setSelectedCustomer("OTHER CUSTOMER")
        setCustomCustomer("")
        setSelectedSize("27.00R49")
        setCustomSize("")
        setDamageType("R1")
        setSite("")
        setPrice("")
      }
    }
  }, [open, editItem, allCustomerOptions])

  const finalCustomerName =
    selectedCustomer === "OTHER CUSTOMER"
      ? customCustomer.trim() || "OTHER CUSTOMER"
      : selectedCustomer.trim()

  const finalSizeName =
    selectedSize === "__custom__" ? customSize.trim() : selectedSize.trim()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalSizeName) {
      toast.error("Size Tire wajib diisi")
      return
    }

    startTransition(async () => {
      const payload = {
        category,
        customer: finalCustomerName,
        site: site.trim(),
        size: finalSizeName,
        damageType,
        price,
      }

      let res
      if (editItem) {
        res = await updateRepairMasterPrice(editItem.id, payload)
      } else {
        res = await createRepairMasterPrice(payload)
      }

      if (res.success) {
        toast.success(
          editItem
            ? "Master Price berhasil diperbarui"
            : "Master Price berhasil ditambahkan"
        )
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error ?? "Gagal menyimpan Master Price")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit Master Price" : "Tambah Master Price Baru"}
          </DialogTitle>
          <DialogDescription>
            Isi detail kategori, customer, ukuran ban, tingkat kerusakan, dan harga.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* 0. Category */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">0. Category</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={category === "Repair" ? "default" : "outline"}
                onClick={() => setCategory("Repair")}
                className={cn(
                  "h-10 text-xs font-semibold rounded-xl",
                  category === "Repair" && "bg-violet-600 hover:bg-violet-700 text-white"
                )}
              >
                Repair
              </Button>
              <Button
                type="button"
                variant={category === "Retread" ? "default" : "outline"}
                onClick={() => setCategory("Retread")}
                className={cn(
                  "h-10 text-xs font-semibold rounded-xl",
                  category === "Retread" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                Retread
              </Button>
            </div>
          </div>

          {/* 1. Nama Customer */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">1. Nama Customer</Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerPopoverOpen}
                  className="h-10 w-full justify-between rounded-xl text-xs font-normal"
                >
                  <span className="truncate">
                    {selectedCustomer === "OTHER CUSTOMER"
                      ? "OTHER CUSTOMER (Input Manual / Lainnya)"
                      : selectedCustomer}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari nama customer..." className="h-9 text-xs" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                      Customer tidak ditemukan.
                    </CommandEmpty>
                    <CommandGroup heading="Preset Master Customer">
                      <CommandItem
                        value="OTHER CUSTOMER"
                        onSelect={() => {
                          setSelectedCustomer("OTHER CUSTOMER")
                          setCustomerPopoverOpen(false)
                        }}
                        className="text-xs font-medium cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            selectedCustomer === "OTHER CUSTOMER" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        OTHER CUSTOMER (Opsi Custom)
                      </CommandItem>
                      {allCustomerOptions.map((c) => (
                        <CommandItem
                          key={c.name}
                          value={c.name}
                          onSelect={() => {
                            setSelectedCustomer(c.name)
                            setCustomerPopoverOpen(false)
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3.5 w-3.5",
                              selectedCustomer === c.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCustomer === "OTHER CUSTOMER" && (
              <div className="pt-1">
                <Input
                  value={customCustomer}
                  onChange={(e) => setCustomCustomer(e.target.value)}
                  placeholder="Ketik Nama Customer Custom / Spesifik..."
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          {/* 2. Size Tire */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">2. Size Tire</Label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue placeholder="Pilih Size Tire..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_TIRE_SIZES.map((sz) => (
                  <SelectItem key={sz} value={sz} className="text-xs">
                    {sz}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__" className="text-xs font-semibold text-primary">
                  + Input Size Manual / Custom
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedSize === "__custom__" && (
              <div className="pt-1">
                <Input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="Ketik Size Tire Manual (misal: 40.00R57)..."
                  className="h-10 rounded-xl text-xs"
                  required
                />
              </div>
            )}
          </div>

          {/* 3. Kerusakan */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">3. Kerusakan</Label>
            <Select value={damageType} onValueChange={(v) => setDamageType(v as any)}>
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue placeholder="Pilih Kerusakan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="R1" className="text-xs">R1 (Minor Repair)</SelectItem>
                <SelectItem value="R2" className="text-xs">R2 (Medium Repair)</SelectItem>
                <SelectItem value="R3" className="text-xs">R3 (Major Repair / Complex)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Site Customer */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">4. Site Customer</Label>
            <Input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Misal: Sangatta, Batu Hijau, Melak, dll..."
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* 5. Price */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">5. Price (Rp)</Label>
            <Input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Misal: 5.000.000"
              className="h-10 rounded-xl text-xs font-mono"
              required
            />
            {price && !isNaN(parseFloat(price.replace(/[^0-9.-]+/g, ""))) && (
              <p className="text-xs text-muted-foreground">
                Preview: {formatCurrency(price)}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
            >
              {isPending ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Tambah Price"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePriceConfirmDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: RepairMasterPriceRecord | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!item) return
    startTransition(async () => {
      const res = await deleteRepairMasterPrice(item.id)
      if (res.success) {
        toast.success("Master Price berhasil dihapus")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error ?? "Gagal menghapus Master Price")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Master Price?</DialogTitle>
          <DialogDescription>
            Master Price untuk <span className="font-semibold text-foreground">{item?.customer}</span> -{" "}
            <span className="font-semibold text-foreground">{item?.size}</span> ({item?.damageType}) sebesar{" "}
            <span className="font-semibold text-emerald-600">{formatCurrency(item?.price)}</span> akan dihapus permanen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="rounded-xl text-xs">
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending} className="rounded-xl text-xs">
            {isPending ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ImportedPriceRow = {
  id: string
  category: string
  customer: string
  originalCustomer: string
  site: string
  size: string
  damageType: string
  price: string
  isMatched: boolean
}

function ImportPriceCsvDialog({
  open,
  onOpenChange,
  customerList = [],
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customerList?: CustomerRecord[]
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)

  // File & Excel state
  const [fileName, setFileName] = useState<string>("")
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>("")
  const [workbookRef, setWorkbookRef] = useState<any>(null)
  const [rawRows, setRawRows] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])

  // Column Mapping
  const [mapping, setMapping] = useState({
    category: "",
    customer: "",
    site: "",
    size: "",
    damageType: "",
    price: "",
  })

  // Parsed Items in Step 2
  const [parsedItems, setParsedItems] = useState<ImportedPriceRow[]>([])

  // Step 2 Filters & Batch Match State
  const [filterMode, setFilterMode] = useState<"all" | "unmatched" | "matched">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUnmatched, setSelectedUnmatched] = useState<string>("")
  const [batchTargetCustomer, setBatchTargetCustomer] = useState<string>("")

  // All Customer Options for Combobox/Select dropdown
  const allCustomerOptions = useMemo(() => {
    const set = new Set<string>()
    set.add("OTHER CUSTOMER")
    customerList.forEach((c) => {
      if (c.name?.trim()) set.add(c.name.trim())
    })
    return Array.from(set).sort()
  }, [customerList])

  // Reset dialog state when closed
  useEffect(() => {
    if (!open) {
      setStep(1)
      setFileName("")
      setSheetNames([])
      setSelectedSheet("")
      setWorkbookRef(null)
      setRawRows([])
      setHeaders([])
      setParsedItems([])
      setMapping({ category: "", customer: "", site: "", size: "", damageType: "", price: "" })
      setFilterMode("all")
      setSearchQuery("")
      setSelectedUnmatched("")
      setBatchTargetCustomer("")
    }
  }, [open])

  function handleDownloadTemplate() {
    const csvContent =
      "Category,Customer,Site,Size,DamageType,Price\n" +
      "Repair,PT Kaltim Prima Coal,Sangatta,27.00R49,R1,5000000\n" +
      "Retread,PT Berau Coal,Batu Hijau,12.00R24,R2,3500000\n"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Template_Master_Price_Repair_Retread.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const XLSX = await import("xlsx")
      const wb = XLSX.read(buffer, { type: "array" })
      setWorkbookRef(wb)
      setSheetNames(wb.SheetNames)
      const firstSheet = wb.SheetNames[0] || ""
      setSelectedSheet(firstSheet)
      loadSheetData(XLSX, wb, firstSheet)
    } catch (err) {
      toast.error("Gagal membaca file Excel/CSV")
    }
  }

  function loadSheetData(XLSX: any, wb: any, sheetName: string) {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
    if (data.length === 0) {
      setRawRows([])
      setHeaders([])
      return
    }

    const headerRow = data[0].map((h: any) => String(h).trim())
    setHeaders(headerRow)
    setRawRows(data.slice(1))

    // Auto-detect columns
    const lowerHeaders = headerRow.map((h) => h.toLowerCase())
    const catIdx = lowerHeaders.findIndex((h) => h.includes("category") || h.includes("kategori") || h.includes("jenis"))
    const custIdx = lowerHeaders.findIndex((h) => h.includes("customer") || h.includes("pelanggan") || h.includes("client") || h.includes("nama"))
    const siteIdx = lowerHeaders.findIndex((h) => h.includes("site") || h.includes("lokasi") || h.includes("cabang"))
    const sizeIdx = lowerHeaders.findIndex((h) => h.includes("size") || h.includes("ukuran") || h.includes("dimensi"))
    const damIdx = lowerHeaders.findIndex((h) => h.includes("damage") || h.includes("kerusakan") || h.includes("r1") || h.includes("r2"))
    const priceIdx = lowerHeaders.findIndex((h) => h.includes("price") || h.includes("harga") || h.includes("nominal") || h.includes("tarif"))

    setMapping({
      category: catIdx >= 0 ? headerRow[catIdx] : "",
      customer: custIdx >= 0 ? headerRow[custIdx] : "",
      site: siteIdx >= 0 ? headerRow[siteIdx] : "",
      size: sizeIdx >= 0 ? headerRow[sizeIdx] : "",
      damageType: damIdx >= 0 ? headerRow[damIdx] : "",
      price: priceIdx >= 0 ? headerRow[priceIdx] : "",
    })
  }

  async function handleSheetChange(sheetName: string) {
    setSelectedSheet(sheetName)
    if (workbookRef) {
      const XLSX = await import("xlsx")
      loadSheetData(XLSX, workbookRef, sheetName)
    }
  }

  function handleProceedToReview() {
    if (!mapping.customer) {
      toast.error("Wajib memilih pemetaan kolom untuk Customer Name")
      return
    }
    if (!mapping.size) {
      toast.error("Wajib memilih pemetaan kolom untuk Size Tire")
      return
    }

    const catIdx = headers.indexOf(mapping.category)
    const custIdx = headers.indexOf(mapping.customer)
    const siteIdx = headers.indexOf(mapping.site)
    const sizeIdx = headers.indexOf(mapping.size)
    const damIdx = headers.indexOf(mapping.damageType)
    const priceIdx = headers.indexOf(mapping.price)

    const items: ImportedPriceRow[] = []

    rawRows.forEach((row, idx) => {
      const sizeVal = sizeIdx >= 0 ? String(row[sizeIdx] || "").trim() : ""
      if (!sizeVal) return // skip empty rows

      const rawCust = custIdx >= 0 ? String(row[custIdx] || "").trim() : "OTHER CUSTOMER"

      // Match against DB customer list
      let mappedCustomer = rawCust
      let isMatched = false

      if (rawCust) {
        const matchResult = findCustomerMatchFuzzy(rawCust, customerList)
        if (matchResult && matchResult.name && matchResult.name !== rawCust) {
          mappedCustomer = matchResult.name
          isMatched = true
        } else if (matchResult && matchResult.name === rawCust) {
          const exactExists = customerList.some((c) => c.name.trim().toLowerCase() === rawCust.toLowerCase())
          isMatched = exactExists
        }
      }

      items.push({
        id: `row-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        category: catIdx >= 0 ? String(row[catIdx] || "").trim() || "Repair" : "Repair",
        customer: mappedCustomer,
        originalCustomer: rawCust,
        site: siteIdx >= 0 ? String(row[siteIdx] || "").trim() : "",
        size: sizeVal,
        damageType: damIdx >= 0 ? String(row[damIdx] || "").trim() || "R1" : "R1",
        price: priceIdx >= 0 ? String(row[priceIdx] || "").trim() || "0" : "0",
        isMatched,
      })
    })

    if (items.length === 0) {
      toast.error("Tidak ada data valid yang bisa dibaca. Pastikan kolom Size Tire terisi.")
      return
    }

    setParsedItems(items)
    setStep(2)
  }

  // Count stats
  const matchedCount = parsedItems.filter((i) => i.isMatched).length
  const unmatchedCount = parsedItems.filter((i) => !i.isMatched).length

  // List unique unmatched customer names from file
  const uniqueUnmatchedNames = useMemo(() => {
    const list = new Set<string>()
    parsedItems.forEach((i) => {
      if (!i.isMatched && i.originalCustomer) {
        list.add(i.originalCustomer)
      }
    })
    return Array.from(list).sort()
  }, [parsedItems])

  function handleBatchApplyCustomer() {
    if (!selectedUnmatched || !batchTargetCustomer) {
      toast.error("Pilih Nama Customer dari File dan Customer Tujuan DB")
      return
    }

    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.originalCustomer === selectedUnmatched || item.customer === selectedUnmatched) {
          return {
            ...item,
            customer: batchTargetCustomer,
            isMatched: true,
          }
        }
        return item
      })
    )

    toast.success(`Berhasil mengubah semua "${selectedUnmatched}" menjadi "${batchTargetCustomer}"`)
    setSelectedUnmatched("")
    setBatchTargetCustomer("")
  }

  function handleUpdateRowCustomer(rowId: string, newCustName: string) {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const exactExists = customerList.some((c) => c.name.trim().toLowerCase() === newCustName.toLowerCase()) || newCustName === "OTHER CUSTOMER"
          return {
            ...item,
            customer: newCustName,
            isMatched: exactExists,
          }
        }
        return item
      })
    )
  }

  // Filter items for review table
  const filteredPreviewItems = useMemo(() => {
    return parsedItems.filter((item) => {
      if (filterMode === "unmatched" && item.isMatched) return false
      if (filterMode === "matched" && !item.isMatched) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${item.category} ${item.customer} ${item.originalCustomer} ${item.size} ${item.site} ${item.damageType}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [parsedItems, filterMode, searchQuery])

  function handleImportSubmit() {
    if (!parsedItems.length) {
      toast.error("Tidak ada data untuk diimpor")
      return
    }

    startTransition(async () => {
      const payload = parsedItems.map((item) => ({
        category: item.category,
        customer: item.customer,
        site: item.site,
        size: item.size,
        damageType: item.damageType,
        price: item.price,
      }))

      const res = await bulkImportRepairMasterPrice(payload)
      if (res.success) {
        toast.success(`Berhasil mengimpor ${res.count} Master Price`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.error ?? "Gagal mengimpor data")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 1 ? "sm:max-w-xl" : "sm:max-w-5xl max-h-[90vh] flex flex-col"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Import Master Price (Excel / CSV)
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Unggah file Excel (.xlsx, .xls) atau CSV, lalu tentukan pemetaan kolomnya."
              : "Review hasil pemetaan dan sesuaikan Nama Customer agar sinkron dengan Database Customer."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          /* ──────── STEP 1: Upload File & Mapping ──────── */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
              <span>Format file didukung: .xlsx, .xls, .csv</span>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-7 text-xs bg-white border-blue-200">
                <Download className="mr-1 h-3.5 w-3.5" />
                Download Template CSV
              </Button>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label className="text-xs font-semibold">1. Pilih File Excel / CSV</Label>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="h-10 rounded-xl text-xs" />
              {fileName && <p className="text-xs text-emerald-600 font-medium">Terpilih: {fileName}</p>}
            </div>

            {sheetNames.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pilih Sheet Excel</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((name) => (
                      <SelectItem key={name} value={name} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {headers.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-bold text-foreground">2. Pemetaan Kolom ({rawRows.length} Baris Data)</span>
                  <span className="text-[11px] text-muted-foreground">Sesuaikan header file dengan kolom target</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Category (Kategori)</Label>
                    <Select value={mapping.category} onValueChange={(val) => setMapping({ ...mapping, category: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="(Default: Repair)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs text-muted-foreground">(Tanpa Kolom / Default Repair)</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-rose-600">Customer Name *</Label>
                    <Select value={mapping.customer} onValueChange={(val) => setMapping({ ...mapping, customer: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg border-rose-200">
                        <SelectValue placeholder="Pilih Header Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-rose-600">Size Tire *</Label>
                    <Select value={mapping.size} onValueChange={(val) => setMapping({ ...mapping, size: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg border-rose-200">
                        <SelectValue placeholder="Pilih Header Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Kerusakan (Damage Type)</Label>
                    <Select value={mapping.damageType} onValueChange={(val) => setMapping({ ...mapping, damageType: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="(Default: R1)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs text-muted-foreground">(Tanpa Kolom / Default R1)</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Site Customer</Label>
                    <Select value={mapping.site} onValueChange={(val) => setMapping({ ...mapping, site: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="(Opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs text-muted-foreground">(Tanpa Kolom)</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Price (Harga)</Label>
                    <Select value={mapping.price} onValueChange={(val) => setMapping({ ...mapping, price: val })}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="(Default: 0)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs text-muted-foreground">(Tanpa Kolom / Default 0)</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ──────── STEP 2: Customer Alignment & Review Table ──────── */
          <div className="flex-1 overflow-hidden space-y-3 py-2 flex flex-col">
            {/* Header Stats & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white font-mono text-xs">
                  Total: <strong>{parsedItems.length}</strong> Baris
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Sesuai DB: <strong>{matchedCount}</strong>
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Tidak Sesuai: <strong>{unmatchedCount}</strong>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Tampilkan Semua ({parsedItems.length})</SelectItem>
                    <SelectItem value="unmatched" className="text-xs font-semibold text-amber-700">Hanya Tidak Sesuai ({unmatchedCount})</SelectItem>
                    <SelectItem value="matched" className="text-xs text-emerald-700">Hanya Sesuai DB ({matchedCount})</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari..."
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Batch Alignment Tool (Baris Ganti Masal) */}
            {uniqueUnmatchedNames.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Pengeditan Massal Nama Customer Tidak Sesuai ({uniqueUnmatchedNames.length} nama berbeda di file):
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Select Unmatched from File */}
                  <Select value={selectedUnmatched} onValueChange={setSelectedUnmatched}>
                    <SelectTrigger className="h-8 flex-1 min-w-[200px] text-xs bg-white border-amber-300">
                      <SelectValue placeholder="Pilih Nama dari File..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueUnmatchedNames.map((name) => {
                        const count = parsedItems.filter((i) => i.originalCustomer === name || i.customer === name).length
                        return (
                          <SelectItem key={name} value={name} className="text-xs">
                            {name} ({count} baris)
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />

                  {/* Target DB Customer Dropdown */}
                  <Select value={batchTargetCustomer} onValueChange={setBatchTargetCustomer}>
                    <SelectTrigger className="h-8 flex-1 min-w-[220px] text-xs bg-white border-amber-300">
                      <SelectValue placeholder="Pilih Customer Database..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allCustomerOptions.map((name) => (
                        <SelectItem key={name} value={name} className="text-xs">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBatchApplyCustomer}
                    disabled={!selectedUnmatched || !batchTargetCustomer}
                    className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg px-3"
                  >
                    Terapkan Ke Semua
                  </Button>
                </div>
              </div>
            )}

            {/* Preview Data Table */}
            <div className="flex-1 overflow-auto rounded-xl border bg-white min-h-[250px] max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50 text-xs">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-20">Kategori</TableHead>
                    <TableHead className="min-w-[240px]">Customer (Database Mapping)</TableHead>
                    <TableHead className="w-28">Size Tire</TableHead>
                    <TableHead className="w-20">Kerusakan</TableHead>
                    <TableHead className="w-24">Site</TableHead>
                    <TableHead className="w-28 text-right">Harga (Price)</TableHead>
                    <TableHead className="w-28 text-center">Status DB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredPreviewItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Tidak ada data yang cocok dengan filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPreviewItems.map((item, idx) => (
                      <TableRow key={item.id} className={item.isMatched ? "hover:bg-emerald-50/30" : "bg-amber-50/30 hover:bg-amber-50/60"}>
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {item.category}
                          </Badge>
                        </TableCell>

                        {/* Editable / Selectable Customer Name */}
                        <TableCell className="space-y-1">
                          <Select value={item.customer} onValueChange={(val) => handleUpdateRowCustomer(item.id, val)}>
                            <SelectTrigger className={`h-8 text-xs ${item.isMatched ? "bg-white border-slate-200" : "bg-white border-amber-400 font-semibold text-amber-950"}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {item.originalCustomer && !allCustomerOptions.includes(item.originalCustomer) && (
                                <SelectItem value={item.originalCustomer} className="text-xs font-mono text-amber-700">
                                  {item.originalCustomer} (Asli File)
                                </SelectItem>
                              )}
                              {allCustomerOptions.map((name) => (
                                <SelectItem key={name} value={name} className="text-xs">
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {item.originalCustomer && item.originalCustomer !== item.customer && (
                            <p className="text-[10px] text-muted-foreground italic pl-1">
                              Asli File: &quot;{item.originalCustomer}&quot;
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="font-mono font-medium">{item.size}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {item.damageType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.site || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.isMatched ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Sesuai DB
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Tidak Sesuai
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 gap-2">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleProceedToReview}
                disabled={!mapping.customer || !mapping.size || rawRows.length === 0}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs"
              >
                Lanjut ke Review & Customer Mapping →
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isPending} className="rounded-xl text-xs">
                ← Kembali ke Pemetaan Kolom
              </Button>
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={isPending || parsedItems.length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                {isPending ? "Mengimpor Data..." : `Jalankan Import (${parsedItems.length} Data)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MasterPriceRepairRetreadTab({
  data = [],
  customerList = [],
  onRefresh,
  canEdit = true,
  canDelete = true,
}: {
  data: RepairMasterPriceRecord[]
  customerList?: CustomerRecord[]
  onRefresh: () => void
  canEdit?: boolean
  canDelete?: boolean
}) {
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [damageFilter, setDamageFilter] = useState("all")

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Dialog states
  const [addEditOpen, setAddEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<RepairMasterPriceRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<RepairMasterPriceRecord | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      const matchCat = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase()
      const matchDam = damageFilter === "all" || item.damageType.toLowerCase() === damageFilter.toLowerCase()

      const matchQ =
        !q ||
        [item.category, item.customer, item.site, item.size, item.damageType, String(item.price)]
          .map((v) => nv(v).toLowerCase())
          .some((v) => v.includes(q))

      return matchCat && matchDam && matchQ
    })
  }, [data, query, categoryFilter, damageFilter])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [query, categoryFilter, damageFilter, pageSize])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  async function handleExport() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data Master Price untuk diekspor")
      return
    }
    const rows = filtered.map((item, idx) => ({
      No: idx + 1,
      Category: item.category,
      Customer: item.customer,
      Site: item.site || "-",
      "Size Tire": item.size,
      Kerusakan: item.damageType,
      Price: Number(item.price),
      "Formatted Price": formatCurrency(item.price),
    }))
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Master Price")
    XLSX.writeFile(wb, `Master_Price_Repair_Retread_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  function handleOpenAdd() {
    setEditItem(null)
    setAddEditOpen(true)
  }

  function handleOpenEdit(item: RepairMasterPriceRecord) {
    setEditItem(item)
    setAddEditOpen(true)
  }

  function handleOpenDelete(item: RepairMasterPriceRecord) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Header Card */}
      <Card className="rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari Category, Customer, Size Tire, Site, atau Harga..."
                  className="h-10 rounded-xl pl-9 text-xs"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 w-36 rounded-xl text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Category</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="retread">Retread</SelectItem>
                </SelectContent>
              </Select>

              {/* Damage Type Filter */}
              <Select value={damageFilter} onValueChange={setDamageFilter}>
                <SelectTrigger className="h-10 w-36 rounded-xl text-xs">
                  <SelectValue placeholder="Kerusakan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kerusakan</SelectItem>
                  <SelectItem value="r1">R1</SelectItem>
                  <SelectItem value="r2">R2</SelectItem>
                  <SelectItem value="r3">R3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button type="button" variant="outline" onClick={() => setImportOpen(true)} className="h-10 rounded-xl shrink-0 text-xs">
                  <Upload className="mr-1.5 h-4 w-4" />
                  Import CSV
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => void handleExport()} className="h-10 rounded-xl shrink-0 text-xs">
                <Download className="mr-1.5 h-4 w-4" />
                Export Excel
              </Button>
              {canEdit && (
                <Button type="button" onClick={handleOpenAdd} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Tambah Master Price
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Site Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Size Tire</TableHead>
                  <TableHead className="text-xs font-semibold">Kerusakan</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Price (Rp)</TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      {query || categoryFilter !== "all" || damageFilter !== "all"
                        ? "Tidak ada data Master Price yang sesuai filter"
                        : "Belum ada data Master Price Repair & Retread. Klik 'Tambah Master Price' untuk menambahkan."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNo = (currentPage - 1) * pageSize + idx + 1
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {rowNo}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              item.category === "Retread"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                            )}
                          >
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <HighlightText value={item.customer} query={query} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <HighlightText value={item.site || "-"} query={query} />
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-foreground">
                          <HighlightText value={item.size} query={query} />
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[11px] font-bold font-mono",
                              item.damageType === "R1" && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
                              item.damageType === "R2" && "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
                              item.damageType === "R3" && "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200"
                            )}
                          >
                            {item.damageType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(item)}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                title="Edit Master Price"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDelete(item)}
                                className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                title="Hapus Master Price"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls Footer */}
          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-20 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>dari {filtered.length} total data</span>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <CreateOrEditPriceDialog
        open={addEditOpen}
        onOpenChange={setAddEditOpen}
        editItem={editItem}
        customerList={customerList}
        onSuccess={onRefresh}
      />

      {/* Delete Dialog */}
      <DeletePriceConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deleteItem}
        onSuccess={onRefresh}
      />

      {/* Import CSV/Excel Dialog */}
      <ImportPriceCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        customerList={customerList}
        onSuccess={onRefresh}
      />
    </div>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export function FormWoClient({
  waitingWoList,
  formWoList: initial,
  masterCaiList = [],
  customerList = [],
  masterPriceList = [],
  canEdit = true,
  canDelete = true,
}: FormWoClientProps) {
  const [activeTab, setActiveTab] = useState("waiting")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createJenis, setCreateJenis] = useState<"service" | "repair" | "retread" | "non_repair">("service")
  const [selectedWipItem, setSelectedWipItem] = useState<WipRepairRecord | null>(null)
  const [selectedWipList, setSelectedWipList] = useState<WipRepairRecord[] | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFormWo, setSelectedFormWo] = useState<FormWoRow | null>(null)

  function handleCreateWoFromWip(item: WipRepairRecord) {
    setSelectedWipItem(item)
    setSelectedWipList(null)
    setSelectedFormWo(null)
    setCreateJenis("repair")
    setCreateDialogOpen(true)
  }

  function handleCreateBulkWoFromWip(items: WipRepairRecord[]) {
    setSelectedWipItem(null)
    setSelectedWipList(items)
    setSelectedFormWo(null)
    setCreateJenis("repair")
    setCreateDialogOpen(true)
  }

  function handleOpenNewWo(jenis: "service" | "repair" | "retread") {
    setSelectedWipItem(null)
    setSelectedWipList(null)
    setSelectedFormWo(null)
    setCreateJenis(jenis)
    setCreateDialogOpen(true)
  }

  function handleView(item: FormWoRow) {
    setSelectedFormWo(item)
    setViewDialogOpen(true)
  }

  function handleEdit(item: FormWoRow) {
    setSelectedFormWo(item)
    setSelectedWipItem(null)
    setSelectedWipList(null)
    setViewDialogOpen(false)
    setEditDialogOpen(true)
  }

  function handleDelete(item: FormWoRow) {
    setSelectedFormWo(item)
    setDeleteDialogOpen(true)
  }

  function refreshList() {
    window.location.reload()
  }

  const totalCaiCount = masterCaiList.length > 0 ? masterCaiList.length : INITIAL_KPC_CAI.length + INITIAL_OTHER_CAI.length

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-10 rounded-xl bg-muted/50">
            <TabsTrigger value="waiting" className="rounded-lg px-5 text-sm font-medium">
              <ClipboardList className="mr-2 h-4 w-4" />
              Waiting WO
              {waitingWoList.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                  {waitingWoList.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pengajuan" className="rounded-lg px-5 text-sm font-medium">
              <FilePlus className="mr-2 h-4 w-4" />
              Daftar Form WO
              {initial.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                  {initial.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="master_cai" className="rounded-lg px-5 text-sm font-medium">
              <Database className="mr-2 h-4 w-4 text-violet-600" />
              Master Data CAI
              <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                {totalCaiCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="master_price" className="rounded-lg px-5 text-sm font-medium">
              <Tag className="mr-2 h-4 w-4 text-emerald-600" />
              Master Price Repair &amp; Retread
              <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                {masterPriceList.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quick Create Action Buttons for Service, Repair & Retread WO */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => handleOpenNewWo("service")}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm text-xs"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Buat WO Service
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenNewWo("repair")}
                className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm text-xs"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Buat WO Repair
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenNewWo("retread")}
                className="h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm text-xs"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Buat WO Retread
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="waiting">
          <WaitingWoTab
            data={waitingWoList}
            onCreateWo={handleCreateWoFromWip}
            onCreateBulkWo={handleCreateBulkWoFromWip}
            caiList={masterCaiList}
            customerList={customerList}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="pengajuan">
          <DaftarPengajuanTab
            data={initial}
            initialJenisFilter="__all__"
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="master_cai">
          <MasterDataCaiTab
            data={masterCaiList}
            onRefresh={refreshList}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="master_price">
          <MasterPriceRepairRetreadTab
            data={masterPriceList}
            customerList={customerList}
            onRefresh={refreshList}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateOrEditWoDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        prefillWip={selectedWipItem}
        prefillWipList={selectedWipList}
        initialJenis={createJenis}
        customerList={customerList}
        masterPriceList={masterPriceList}
        onSuccess={refreshList}
      />

      {/* Edit Dialog */}
      <CreateOrEditWoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editItem={selectedFormWo}
        customerList={customerList}
        masterPriceList={masterPriceList}
        onSuccess={refreshList}
      />

      {/* WYSIWYG Document Detail & Print View Dialog */}
      <ViewDetailDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        item={selectedFormWo}
        onEdit={() => handleEdit(selectedFormWo!)}
        canEdit={canEdit}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        item={selectedFormWo}
        onSuccess={refreshList}
      />
    </>
  )
}
