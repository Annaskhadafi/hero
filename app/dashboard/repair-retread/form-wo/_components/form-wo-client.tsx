"use client"

import { Fragment, useEffect, useMemo, useState, useTransition, useRef } from "react"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Database,
  Download,
  Eye,
  FilePlus,
  Filter,
  Pencil,
  Plus,
  Printer,
  Search,
  Tag,
  Trash2,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"

// Master Data CAI Server Actions & Initial Constants
import {
  createFormWo,
  deleteFormWo,
  updateFormWo,
  saveWipPo,
} from "@/app/actions/form-wo"
import {
  createMasterDataCai,
  deleteMasterDataCai,
  updateMasterDataCai,
} from "@/app/actions/master-data-cai"
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

function getTodayFormattedDate(): string {
  const d = new Date()
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
  const day = String(d.getDate()).padStart(2, "0")
  return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Component: Create / Edit Form WO Dialog ──────────────────────────────────

function CreateOrEditWoDialog({
  open,
  onOpenChange,
  editItem,
  prefillWip,
  initialJenis = "service",
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editItem?: FormWoRow | null
  prefillWip?: WipRepairRecord | null
  initialJenis?: "service" | "repair" | "non_repair"
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [jenisPengajuan, setJenisPengajuan] = useState<"service" | "repair" | "non_repair">(initialJenis)
  const [hari, setHari] = useState(getTodayHari())
  const [tanggal, setTanggal] = useState(getTodayFormattedDate())
  const [pemohon, setPemohon] = useState("")
  const [catatanPengajuan, setCatatanPengajuan] = useState("")
  const [statusPengajuan, setStatusPengajuan] = useState<"pending" | "approved" | "rejected" | "diproses">("pending")
  const [noWoTerbit, setNoWoTerbit] = useState("")
  const [noPo, setNoPo] = useState("")
  const [tanggalPo, setTanggalPo] = useState("")

  // Multi-item tables
  const [serviceItems, setServiceItems] = useState<ServiceItemRow[]>([
    { id: "1", description: "Labour Service", job: "", customer: "", site: "", serialNo: "", refNo: "", noWoCp: "", price: "" },
  ])

  const [repairItems, setRepairItems] = useState<RepairItemRow[]>([
    { id: "1", description: "", noUnit: "", pos: "", size: "", site: "", customer: "", category: "R1", price: "", noWoCp: "" },
  ])

  useEffect(() => {
    if (open) {
      if (editItem) {
        setJenisPengajuan((editItem.jenisPengajuan as any) || "service")
        setHari(editItem.hari || getTodayHari())
        setTanggal(editItem.tanggal || getTodayFormattedDate())
        setPemohon(editItem.pemohon || "")
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
            },
          ])
          setRepairItems(parsed)
        }
      } else if (prefillWip) {
        setJenisPengajuan("repair")
        setHari(getTodayHari())
        setTanggal(getTodayFormattedDate())
        setPemohon("")
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
            noWoCp: prefillWip.id_wo || "",
          },
        ])
      } else {
        setJenisPengajuan(initialJenis)
        setHari(getTodayHari())
        setTanggal(getTodayFormattedDate())
        setPemohon("")
        setCatatanPengajuan("")
        setStatusPengajuan("pending")
        setNoWoTerbit("")
        setNoPo("")
        setTanggalPo("")
        setServiceItems([
          { id: "1", description: "Labour Service", job: "", customer: "", site: "", serialNo: "", refNo: "", noWoCp: "", price: "" },
        ])
        setRepairItems([
          { id: "1", description: "", noUnit: "", pos: "", size: "", site: "", customer: "", category: "R1", price: "", noWoCp: "" },
        ])
      }
    }
  }, [open, editItem, prefillWip, initialJenis])

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

  // Item Table Handlers for Repair
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
      next[index] = { ...next[index], [key]: value }
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

      const payload = {
        jenisPengajuan,
        hari: hari || undefined,
        tanggal: tanggal || undefined,
        pemohon: pemohon || undefined,
        catatanPengajuan: catatanPengajuan || undefined,
        statusPengajuan,
        noWoTerbit: noWoTerbit || undefined,
        noPo: noPo || undefined,
        tanggalPo: tanggalPo || undefined,
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
      <DialogContent className="max-w-[98vw] w-[98vw] sm:max-w-[98vw] lg:max-w-[1600px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Wrench className="h-5 w-5 text-indigo-600" />
            {editItem ? `Edit Form Work Order (${editItem.noPengajuan || ""})` : "Form Permintaan Work Order"}
          </DialogTitle>
          <DialogDescription>
            Pilih Jenis WO (Service atau Repair) dan isi tabel pekerjaan. Seluruh kolom bersifat opsional (tidak ada yang wajib).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Header Controls: WO Type Selector & Document Dates */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>
              </div>

              {/* Hari Header */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">Hari</Label>
                <Select value={hari} onValueChange={setHari}>
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {HARI_OPTIONS.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Header */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">Tanggal</Label>
                <Input
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  placeholder="e.g. 10 Aug 2026 / 03 Juli 2026"
                  className="h-9 bg-white text-xs"
                />
              </div>
            </div>

            {/* Additional Pemohon & Status Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">Pemohon</Label>
                <Input
                  value={pemohon}
                  onChange={(e) => setPemohon(e.target.value)}
                  placeholder="Nama Pemohon / Supervisor"
                  className="h-9 bg-white text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">Nomor PO (Optional)</Label>
                <Input
                  value={noPo}
                  onChange={(e) => setNoPo(e.target.value)}
                  placeholder="e.g. 401234565 / SUM REPAIR"
                  className="h-9 bg-white text-xs font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">Date PO (Optional)</Label>
                <Input
                  value={tanggalPo}
                  onChange={(e) => setTanggalPo(e.target.value)}
                  placeholder="e.g. 10.08.2026 / 2026-08-10"
                  className="h-9 bg-white text-xs font-mono"
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
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-slate-500">No. WO Terbit (Optional)</Label>
                <Input
                  value={noWoTerbit}
                  onChange={(e) => setNoWoTerbit(e.target.value)}
                  placeholder="e.g. WO/2026/00123"
                  className="h-9 bg-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Table Spreadsheet Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Rincian Pekerjaan ({jenisPengajuan === "service" ? "Form WO Service" : "Form WO Repair"})
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
                <Table className="text-xs w-full min-w-[1350px]">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[190px]">Description</TableHead>
                      <TableHead className="min-w-[260px]">Job</TableHead>
                      <TableHead className="min-w-[140px]">Customer</TableHead>
                      <TableHead className="min-w-[140px]">Site</TableHead>
                      <TableHead className="min-w-[150px]">Serial No</TableHead>
                      <TableHead className="min-w-[260px]">No Surat Jalan / Customer / PR / PO</TableHead>
                      <TableHead className="min-w-[150px]">No WO CP</TableHead>
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
                        <TableCell>
                          <Input
                            value={item.customer}
                            onChange={(e) => updateServiceRow(idx, "customer", e.target.value)}
                            placeholder="e.g. SIS"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.site}
                            onChange={(e) => updateServiceRow(idx, "site", e.target.value)}
                            placeholder="e.g. SIS"
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
                    {/* Yellow Total Amount Footer Matching Screenshot 1 */}
                    <TableRow className="bg-yellow-300/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <TableCell colSpan={8} className="text-center py-2.5 uppercase tracking-wider text-xs">
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

            {/* Table Spreadsheet Editor for REPAIR */}
            {jenisPengajuan === "repair" && (
              <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
                <Table className="text-xs w-full min-w-[1450px]">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      <TableHead className="min-w-[190px]">Description (Tire SN)</TableHead>
                      <TableHead className="min-w-[140px]">No Unit</TableHead>
                      <TableHead className="min-w-[80px] text-center">Pos</TableHead>
                      <TableHead className="min-w-[140px]">Size</TableHead>
                      <TableHead className="min-w-[160px]">Site</TableHead>
                      <TableHead className="min-w-[180px]">Customer</TableHead>
                      <TableHead className="min-w-[120px]">Category</TableHead>
                      <TableHead className="min-w-[160px] text-right">Price</TableHead>
                      <TableHead className="min-w-[160px]">No WO CP</TableHead>
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
                        <TableCell>
                          <Input
                            value={item.size}
                            onChange={(e) => updateRepairRow(idx, "size", e.target.value)}
                            placeholder="e.g. 27.00R49"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.site}
                            onChange={(e) => updateRepairRow(idx, "site", e.target.value)}
                            placeholder="e.g. BIB Sebamban"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.customer}
                            onChange={(e) => updateRepairRow(idx, "customer", e.target.value)}
                            placeholder="e.g. Cipta Kridatama"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.category}
                            onChange={(e) => updateRepairRow(idx, "category", e.target.value)}
                            placeholder="R1 / R2 / R3"
                            className="h-9 text-xs border-slate-200 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.price}
                            onChange={(e) => updateRepairRow(idx, "price", e.target.value)}
                            placeholder="7,200,000"
                            className="h-9 text-xs border-slate-200 text-right font-mono w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.noWoCp}
                            onChange={(e) => updateRepairRow(idx, "noWoCp", e.target.value)}
                            placeholder="No WO CP"
                            className="h-9 text-xs border-slate-200 font-mono w-full"
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
                    {/* Yellow Total Amount Footer Matching Screenshot 2 */}
                    <TableRow className="bg-yellow-300/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <TableCell colSpan={8} className="text-center py-2.5 uppercase tracking-wider text-xs">
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
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: FormWoRow | null
  onEdit: () => void
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
            <Button onClick={onEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Pencil className="h-4 w-4" />
              Edit Form WO
            </Button>
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
  caiList = [],
  customerList = [],
}: {
  data: WipRepairRecord[]
  onCreateWo: (item: WipRepairRecord) => void
  caiList?: MasterCaiRow[]
  customerList?: CustomerRecord[]
}) {
  const [query, setQuery] = useState("")
  const [poMap, setPoMap] = useState<Record<string, { noPo: string; poDate: string }>>({})

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
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Tidak ada unit Waiting WO yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, idx) => (
                  <TableRow key={item.id_wo || idx} className="hover:bg-muted/30">
                    <TableCell className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onCreateWo(item)}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-8 text-xs font-semibold"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Buat WO
                      </Button>
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
                ))
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
  onView,
  onEdit,
  onDelete,
}: {
  data: FormWoRow[]
  onView: (item: FormWoRow) => void
  onEdit: (item: FormWoRow) => void
  onDelete: (item: FormWoRow) => void
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER)
  const [jenisFilter, setJenisFilter] = useState(ALL_FILTER)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      const matchesQuery =
        !q ||
        [item.noPengajuan, item.idWo, item.tireSn, item.customer, item.site, item.brand, item.pemohon, item.deskripsiPekerjaan, item.noPo]
          .map((v) => nv(v).toLowerCase())
          .some((v) => v.includes(q))
      const matchesStatus = statusFilter === ALL_FILTER || item.statusPengajuan === statusFilter
      const matchesJenis = jenisFilter === ALL_FILTER || item.jenisPengajuan === jenisFilter
      return matchesQuery && matchesStatus && matchesJenis
    })
  }, [data, query, statusFilter, jenisFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter, jenisFilter, pageSize])

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

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari no. pengajuan, customer, site, pemohon, nomor PO, date PO..."
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
                <TableHead className="px-4 py-3 w-28">Aksi</TableHead>
                <TableHead className="px-4 py-3">No. Pengajuan</TableHead>
                <TableHead className="px-4 py-3">Jenis Form</TableHead>
                <TableHead className="px-4 py-3">Hari & Tanggal</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
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
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    {data.length === 0 ? "Belum ada pengajuan Form WO." : "Tidak ada data yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.statusPengajuan] ?? { label: item.statusPengajuan, cls: "" }
                  const jenisCfg = JENIS_CONFIG[item.jenisPengajuan] ?? { label: item.jenisPengajuan, cls: "" }
                  return (
                    <TableRow key={item.id} className="group hover:bg-muted/30">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1">
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
                      <TableCell className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.hari || "-"}</div>
                        <div className="text-slate-500">{item.tanggal || formatDate(item.tanggalPengajuan)}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs font-medium", statusCfg.cls)}>
                          {statusCfg.label}
                        </Badge>
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
                      <TableCell className="px-4 py-3 font-mono text-xs">{nv(item.noWoTerbit)}</TableCell>
                    </TableRow>
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
}: {
  data: MasterCaiRow[]
  onRefresh: () => void
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
              <Button type="button" onClick={handleOpenAdd} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah CAI
              </Button>
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

// ─── Main Client Component ─────────────────────────────────────────────────────

export function FormWoClient({
  waitingWoList,
  formWoList: initial,
  masterCaiList = [],
  customerList = [],
}: FormWoClientProps) {
  const [activeTab, setActiveTab] = useState("waiting")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createJenis, setCreateJenis] = useState<"service" | "repair" | "non_repair">("service")
  const [selectedWipItem, setSelectedWipItem] = useState<WipRepairRecord | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFormWo, setSelectedFormWo] = useState<FormWoRow | null>(null)

  function handleCreateWoFromWip(item: WipRepairRecord) {
    setSelectedWipItem(item)
    setSelectedFormWo(null)
    setCreateJenis("repair")
    setCreateDialogOpen(true)
  }

  function handleOpenNewWo(jenis: "service" | "repair") {
    setSelectedWipItem(null)
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
              Daftar Pengajuan
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
          </TabsList>

          {/* Quick Create Action Buttons for Service & Repair WO */}
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
          </div>
        </div>

        <TabsContent value="waiting">
          <WaitingWoTab
            data={waitingWoList}
            onCreateWo={handleCreateWoFromWip}
            caiList={masterCaiList}
            customerList={customerList}
          />
        </TabsContent>

        <TabsContent value="pengajuan">
          <DaftarPengajuanTab data={initial} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="master_cai">
          <MasterDataCaiTab data={masterCaiList} onRefresh={refreshList} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateOrEditWoDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        prefillWip={selectedWipItem}
        initialJenis={createJenis}
        onSuccess={refreshList}
      />

      {/* Edit Dialog */}
      <CreateOrEditWoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editItem={selectedFormWo}
        onSuccess={refreshList}
      />

      {/* WYSIWYG Document Detail & Print View Dialog */}
      <ViewDetailDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        item={selectedFormWo}
        onEdit={() => handleEdit(selectedFormWo!)}
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
