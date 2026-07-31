"use client"

import { Fragment, useEffect, useMemo, useState, useTransition } from "react"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FilePlus,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  createFormWo,
  deleteFormWo,
  updateFormWo,
} from "@/app/actions/form-wo"
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

type FormWoRow = {
  id: number
  jenisPengajuan: string
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
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

type FormWoClientProps = {
  waitingWoList: WipRepairRecord[]
  formWoList: FormWoRow[]
}

type MultiSelectOption = { value: string; label: string }

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALL_FILTER = "__all__"
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

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
  repair: {
    label: "Repair Tire",
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

function MultiSelectFilter({
  title,
  placeholder,
  options,
  value,
  onChange,
}: {
  title: string
  placeholder: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedSet = useMemo(() => new Set(value), [value])
  const selected = options.filter((o) => selectedSet.has(o.value))
  const summary =
    selected.length === 0
      ? title
      : selected.length <= 2
        ? selected.map((o) => o.label).join(", ")
        : `${selected.slice(0, 2).map((o) => o.label).join(", ")} +${selected.length - 2}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 w-full justify-between rounded-xl font-normal sm:min-w-44", selected.length === 0 && "text-muted-foreground")}
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <div className="flex items-center justify-between border-b px-2 py-1.5">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(options.map((o) => o.value))}>Pilih Semua</Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>Kosongkan</Button>
          </div>
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    const next = new Set(value)
                    next.has(opt.value) ? next.delete(opt.value) : next.add(opt.value)
                    onChange(Array.from(next))
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedSet.has(opt.value) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Pagination({
  safePage,
  totalPages,
  start,
  pageSize,
  total,
  onPrev,
  onNext,
  onPageSize,
}: {
  safePage: number
  totalPages: number
  start: number
  pageSize: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPageSize: (v: number) => void
}) {
  const displayStart = total > 0 ? start + 1 : 0
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Baris per halaman:</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-16 rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {displayStart}–{Math.min(start + pageSize, total)} dari {total.toLocaleString("id-ID")}
        </span>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" disabled={safePage <= 1} onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" disabled={safePage >= totalPages} onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting WO Tab ────────────────────────────────────────────────────────────

function WaitingWoTab({
  data,
  onCreateWo,
}: {
  data: WipRepairRecord[]
  onCreateWo: (item: WipRepairRecord) => void
}) {
  const [query, setQuery] = useState("")
  const [siteFilter, setSiteFilter] = useState(ALL_FILTER)
  const [brandFilter, setBrandFilter] = useState(ALL_FILTER)
  const [customerFilters, setCustomerFilters] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25)

  const siteOptions = useMemo(
    () => Array.from(new Set(data.map((d) => nv(d.site)).filter((v) => v !== "-"))).sort(),
    [data]
  )
  const brandOptions = useMemo(
    () => Array.from(new Set(data.map((d) => nv(d.brand)).filter((v) => v !== "-"))).sort(),
    [data]
  )
  const customerOptions = useMemo<MultiSelectOption[]>(
    () => Array.from(new Set(data.map((d) => nv(d.customer)).filter((v) => v !== "-"))).sort().map((v) => ({ value: v, label: v })),
    [data]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      const matchesQuery = !q || [item.id_wo, item.tire_sn, item.customer, item.site, item.brand, item.pattern, item.injury, item.inspector]
        .map((v) => nv(v).toLowerCase()).some((v) => v.includes(q))
      const matchesSite = siteFilter === ALL_FILTER || nv(item.site) === siteFilter
      const matchesBrand = brandFilter === ALL_FILTER || nv(item.brand) === brandFilter
      const matchesCustomer = customerFilters.length === 0 || customerFilters.includes(nv(item.customer))
      return matchesQuery && matchesSite && matchesBrand && matchesCustomer
    })
  }, [data, query, siteFilter, brandFilter, customerFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)

  useEffect(() => { setCurrentPage(1) }, [query, siteFilter, brandFilter, customerFilters, pageSize])

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border/60 py-0 shadow-sm">
        <CardContent className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari ID WO, tire SN, customer, site, brand..." className="h-10 rounded-xl pl-9" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Semua site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Semua site</SelectItem>
                  {siteOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Semua brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Semua brand</SelectItem>
                  {brandOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <MultiSelectFilter title="Semua customer" placeholder="Cari customer..." options={customerOptions} value={customerFilters} onChange={setCustomerFilters} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-4 py-3">Aksi</TableHead>
                <TableHead className="px-4 py-3">ID WO</TableHead>
                <TableHead className="px-4 py-3">Tire SN</TableHead>
                <TableHead className="px-4 py-3">Customer / Site</TableHead>
                <TableHead className="px-4 py-3">Brand / Pattern</TableHead>
                <TableHead className="px-4 py-3">Size</TableHead>
                <TableHead className="px-4 py-3">Injury</TableHead>
                <TableHead className="px-4 py-3">Job Type</TableHead>
                <TableHead className="px-4 py-3">Inspect Date</TableHead>
                <TableHead className="px-4 py-3">Inspector</TableHead>
                <TableHead className="px-4 py-3">Received</TableHead>
                <TableHead className="px-4 py-3">Receiver</TableHead>
                <TableHead className="px-4 py-3">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
                    {data.length === 0 ? "Tidak ada data Waiting WO saat ini." : "Tidak ada data yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((item, idx) => (
                  <TableRow key={`${item.id_wo}-${item.tire_sn}-${idx}`} className="group hover:bg-muted/30">
                    <TableCell className="px-4 py-3">
                      <Button type="button" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={() => onCreateWo(item)}>
                        <FilePlus className="h-3.5 w-3.5" />
                        Ajukan WO
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs"><HighlightText value={item.id_wo} query={query} /></TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs"><HighlightText value={item.tire_sn} query={query} /></TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium"><HighlightText value={item.customer} query={query} /></span>
                        <span className="text-xs text-muted-foreground"><HighlightText value={item.site} query={query} /></span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium"><HighlightText value={item.brand} query={query} /></span>
                        <span className="text-xs text-muted-foreground"><HighlightText value={item.pattern} query={query} /></span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">{nv(item.size)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm"><HighlightText value={item.injury} query={query} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm">{nv(item.job_type)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(item.inspect_date)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">{nv(item.inspector)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(item.received_date)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">{nv(item.receiver)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm max-w-[200px] truncate" title={nv(item.remark)}>{nv(item.remark)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination safePage={safePage} totalPages={totalPages} start={start} pageSize={pageSize} total={filtered.length}
          onPrev={() => setCurrentPage(safePage - 1)} onNext={() => setCurrentPage(safePage + 1)} onPageSize={(v) => setPageSize(v as typeof pageSize)} />
      </Card>
    </div>
  )
}

// ─── Daftar Pengajuan Tab ──────────────────────────────────────────────────────

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
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      const matchesQuery = !q || [item.noPengajuan, item.idWo, item.tireSn, item.customer, item.site, item.brand, item.pemohon, item.deskripsiPekerjaan]
        .map((v) => nv(v).toLowerCase()).some((v) => v.includes(q))
      const matchesStatus = statusFilter === ALL_FILTER || item.statusPengajuan === statusFilter
      const matchesJenis = jenisFilter === ALL_FILTER || item.jenisPengajuan === jenisFilter
      return matchesQuery && matchesStatus && matchesJenis
    })
  }, [data, query, statusFilter, jenisFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)

  useEffect(() => { setCurrentPage(1) }, [query, statusFilter, jenisFilter, pageSize])

  async function handleExport() {
    if (filtered.length === 0) { toast.error("Tidak ada data untuk diekspor"); return }
    const rows = filtered.map((item) => ({
      "No. Pengajuan": nv(item.noPengajuan),
      "Jenis": JENIS_CONFIG[item.jenisPengajuan]?.label ?? item.jenisPengajuan,
      "Tgl. Pengajuan": formatDate(item.tanggalPengajuan),
      "Status": STATUS_CONFIG[item.statusPengajuan]?.label ?? item.statusPengajuan,
      "ID WO": nv(item.idWo),
      "Tire SN": nv(item.tireSn),
      "Customer": nv(item.customer),
      "Site": nv(item.site),
      "Brand": nv(item.brand),
      "Pattern": nv(item.pattern),
      "Size": nv(item.size),
      "Injury": nv(item.injury),
      "Job Type": nv(item.jobType),
      "Deskripsi Pekerjaan": nv(item.deskripsiPekerjaan),
      "Inspect Date": nv(item.inspectDate),
      "Inspector": nv(item.inspector),
      "Pemohon": nv(item.pemohon),
      "Catatan": nv(item.catatanPengajuan),
      "No WO Terbit": nv(item.noWoTerbit),
      "Remark": nv(item.remark),
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
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari no. pengajuan, ID WO, tire SN, customer, pemohon, deskripsi..." className="h-10 rounded-xl pl-9" />
              </div>
              <Button type="button" variant="outline" className="h-10 rounded-xl shrink-0" onClick={() => void handleExport()}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Semua jenis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Semua jenis</SelectItem>
                  <SelectItem value="repair">Repair Tire</SelectItem>
                  <SelectItem value="non_repair">Non-Repair</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Semua status" /></SelectTrigger>
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
                <TableHead className="px-4 py-3">Aksi</TableHead>
                <TableHead className="px-4 py-3">No. Pengajuan</TableHead>
                <TableHead className="px-4 py-3">Jenis</TableHead>
                <TableHead className="px-4 py-3">Tgl. Pengajuan</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Customer / Site</TableHead>
                <TableHead className="px-4 py-3">Deskripsi Pekerjaan</TableHead>
                <TableHead className="px-4 py-3">ID WO / Tire SN</TableHead>
                <TableHead className="px-4 py-3">Brand / Pattern</TableHead>
                <TableHead className="px-4 py-3">Size</TableHead>
                <TableHead className="px-4 py-3">Job Type</TableHead>
                <TableHead className="px-4 py-3">Pemohon</TableHead>
                <TableHead className="px-4 py-3">No WO Terbit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
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
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" title="Lihat detail" onClick={() => onView(item)}><Eye className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" title="Edit" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-destructive hover:text-destructive" title="Hapus" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold"><HighlightText value={item.noPengajuan} query={query} /></TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs font-medium", jenisCfg.cls)}>{jenisCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(item.tanggalPengajuan)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs font-medium", statusCfg.cls)}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium"><HighlightText value={item.customer} query={query} /></span>
                          <span className="text-xs text-muted-foreground">{nv(item.site)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm max-w-[220px] truncate" title={nv(item.deskripsiPekerjaan)}>
                        <HighlightText value={item.deskripsiPekerjaan || item.remark} query={query} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs"><HighlightText value={item.idWo} query={query} /></span>
                          <span className="font-mono text-xs text-muted-foreground">{nv(item.tireSn)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm">{nv(item.brand)}</span>
                          <span className="text-xs text-muted-foreground">{nv(item.pattern)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{nv(item.size)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{nv(item.jobType)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm"><HighlightText value={item.pemohon} query={query} /></TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs">{nv(item.noWoTerbit)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination safePage={safePage} totalPages={totalPages} start={start} pageSize={pageSize} total={filtered.length}
          onPrev={() => setCurrentPage(safePage - 1)} onNext={() => setCurrentPage(safePage + 1)} onPageSize={(v) => setPageSize(v as typeof pageSize)} />
      </Card>
    </div>
  )
}

// ─── Repair WO Dialog (pre-filled dari WIP) ────────────────────────────────────

function RepairWoDialog({
  open,
  onOpenChange,
  prefill,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  prefill: WipRepairRecord | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [pemohon, setPemohon] = useState("")
  const [catatan, setCatatan] = useState("")

  useEffect(() => {
    if (open) { setPemohon(""); setCatatan("") }
  }, [open])

  function field(label: string, value: string | null | undefined) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm">{nv(value)}</span>
      </div>
    )
  }

  function handleSubmit() {
    if (!prefill) return
    startTransition(async () => {
      const result = await createFormWo({
        jenisPengajuan: "repair",
        idWo: prefill.id_wo ?? undefined,
        tireSn: prefill.tire_sn ?? undefined,
        customer: prefill.customer ?? undefined,
        site: prefill.site ?? undefined,
        storeLoc: prefill.store_loc ?? undefined,
        brand: prefill.brand ?? undefined,
        pattern: prefill.pattern ?? undefined,
        size: prefill.size ?? undefined,
        injury: prefill.injury ?? undefined,
        jobType: prefill.job_type ?? undefined,
        remark: prefill.remark ?? undefined,
        inspectDate: prefill.inspect_date ?? undefined,
        inspector: prefill.inspector ?? undefined,
        receivedDate: prefill.received_date ?? undefined,
        receiver: prefill.receiver ?? undefined,
        pemohon: pemohon || undefined,
        catatanPengajuan: catatan || undefined,
      })
      if (result.success) {
        toast.success(`Pengajuan WO Repair berhasil dibuat (${result.noPengajuan})`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Terjadi kesalahan")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-violet-500" />
            Ajukan WO — Repair Tire
          </DialogTitle>
          <DialogDescription>Pengajuan Work Order berdasarkan unit Waiting WO dari One Chitra.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {prefill && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Unit (dari One Chitra)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {field("ID WO", prefill.id_wo)}
                {field("Tire SN", prefill.tire_sn)}
                {field("Customer", prefill.customer)}
                {field("Site", prefill.site)}
                {field("Brand", prefill.brand)}
                {field("Pattern", prefill.pattern)}
                {field("Size", prefill.size)}
                {field("Injury", prefill.injury)}
                {field("Job Type", prefill.job_type)}
                {field("Inspect Date", prefill.inspect_date)}
                {field("Inspector", prefill.inspector)}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="repair-pemohon">Pemohon</Label>
            <Input id="repair-pemohon" placeholder="Nama pemohon" value={pemohon} onChange={(e) => setPemohon(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="repair-catatan">Catatan Pengajuan</Label>
            <Textarea id="repair-catatan" placeholder="Tuliskan detail kerusakan, urgensi, atau informasi tambahan..." rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Ajukan WO Repair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Non-Repair WO Dialog (input manual) ──────────────────────────────────────

type NonRepairForm = {
  customer: string
  site: string
  storeLoc: string
  jobType: string
  deskripsiPekerjaan: string
  remark: string
  pemohon: string
  catatanPengajuan: string
}

function NonRepairWoDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<NonRepairForm>({
    customer: "",
    site: "",
    storeLoc: "",
    jobType: "",
    deskripsiPekerjaan: "",
    remark: "",
    pemohon: "",
    catatanPengajuan: "",
  })

  useEffect(() => {
    if (open) {
      setForm({ customer: "", site: "", storeLoc: "", jobType: "", deskripsiPekerjaan: "", remark: "", pemohon: "", catatanPengajuan: "" })
    }
  }, [open])

  function set(key: keyof NonRepairForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleSubmit() {
    if (!form.deskripsiPekerjaan.trim() && !form.jobType.trim()) {
      toast.error("Isi minimal Jenis Pekerjaan atau Deskripsi Pekerjaan")
      return
    }
    startTransition(async () => {
      const result = await createFormWo({
        jenisPengajuan: "non_repair",
        customer: form.customer || undefined,
        site: form.site || undefined,
        storeLoc: form.storeLoc || undefined,
        jobType: form.jobType || undefined,
        deskripsiPekerjaan: form.deskripsiPekerjaan || undefined,
        remark: form.remark || undefined,
        pemohon: form.pemohon || undefined,
        catatanPengajuan: form.catatanPengajuan || undefined,
      })
      if (result.success) {
        toast.success(`Pengajuan WO Non-Repair berhasil dibuat (${result.noPengajuan})`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Terjadi kesalahan")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-cyan-500" />
            Buat WO — Non-Repair / Pekerjaan Umum
          </DialogTitle>
          <DialogDescription>
            Pengajuan Work Order untuk pekerjaan yang bukan repair tire, misalnya pemasangan, inspeksi khusus, maintenance, atau pekerjaan lapangan lainnya.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Identitas pekerjaan */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Detail Pekerjaan</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nr-job-type">Jenis Pekerjaan <span className="text-destructive">*</span></Label>
                <Input id="nr-job-type" placeholder="Contoh: Inspeksi, Pemasangan, Maintenance..." value={form.jobType} onChange={set("jobType")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nr-store-loc">Lokasi / Store Loc</Label>
                <Input id="nr-store-loc" placeholder="Kode lokasi atau area kerja" value={form.storeLoc} onChange={set("storeLoc")} />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="nr-deskripsi">Deskripsi Pekerjaan <span className="text-destructive">*</span></Label>
              <Textarea
                id="nr-deskripsi"
                placeholder="Jelaskan secara detail pekerjaan yang akan dilakukan, scope, target unit, dan informasi penting lainnya..."
                rows={4}
                value={form.deskripsiPekerjaan}
                onChange={set("deskripsiPekerjaan")}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="nr-remark">Remark / Catatan Teknis</Label>
              <Textarea id="nr-remark" placeholder="Catatan teknis tambahan (opsional)" rows={2} value={form.remark} onChange={set("remark")} />
            </div>
          </div>

          {/* Customer & site */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer & Site</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nr-customer">Customer</Label>
                <Input id="nr-customer" placeholder="Nama customer / perusahaan" value={form.customer} onChange={set("customer")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nr-site">Site</Label>
                <Input id="nr-site" placeholder="Nama site / lokasi kerja" value={form.site} onChange={set("site")} />
              </div>
            </div>
          </div>

          {/* Pemohon */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pengajuan</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nr-pemohon">Pemohon</Label>
                <Input id="nr-pemohon" placeholder="Nama pemohon" value={form.pemohon} onChange={set("pemohon")} />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="nr-catatan">Catatan Pengajuan</Label>
              <Textarea id="nr-catatan" placeholder="Informasi tambahan untuk tim yang akan memproses pengajuan ini..." rows={2} value={form.catatanPengajuan} onChange={set("catatanPengajuan")} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            {isPending ? "Menyimpan..." : "Buat WO Non-Repair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Dialog ───────────────────────────────────────────────────────────────

function EditWoDialog({
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
  const [form, setForm] = useState({
    customer: "", site: "", storeLoc: "", jobType: "",
    deskripsiPekerjaan: "", remark: "", pemohon: "",
    catatanPengajuan: "",
    statusPengajuan: "pending" as "pending" | "approved" | "rejected" | "diproses",
    noWoTerbit: "",
  })

  useEffect(() => {
    if (open && item) {
      setForm({
        customer: item.customer ?? "",
        site: item.site ?? "",
        storeLoc: item.storeLoc ?? "",
        jobType: item.jobType ?? "",
        deskripsiPekerjaan: item.deskripsiPekerjaan ?? "",
        remark: item.remark ?? "",
        pemohon: item.pemohon ?? "",
        catatanPengajuan: item.catatanPengajuan ?? "",
        statusPengajuan: (item.statusPengajuan as typeof form.statusPengajuan) ?? "pending",
        noWoTerbit: item.noWoTerbit ?? "",
      })
    }
  }, [open, item])

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleSubmit() {
    if (!item) return
    startTransition(async () => {
      const result = await updateFormWo(item.id, {
        customer: form.customer || undefined,
        site: form.site || undefined,
        storeLoc: form.storeLoc || undefined,
        jobType: form.jobType || undefined,
        deskripsiPekerjaan: form.deskripsiPekerjaan || undefined,
        remark: form.remark || undefined,
        pemohon: form.pemohon || undefined,
        catatanPengajuan: form.catatanPengajuan || undefined,
        statusPengajuan: form.statusPengajuan,
        noWoTerbit: form.noWoTerbit || undefined,
      })
      if (result.success) {
        toast.success("Pengajuan berhasil diperbarui")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Terjadi kesalahan")
      }
    })
  }

  if (!item) return null
  const isNonRepair = item.jenisPengajuan === "non_repair"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Pengajuan — {nv(item.noPengajuan)}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className={cn("text-xs", JENIS_CONFIG[item.jenisPengajuan]?.cls)}>
              {JENIS_CONFIG[item.jenisPengajuan]?.label ?? item.jenisPengajuan}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Data unit readonly (repair) */}
          {!isNonRepair && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Unit (dari One Chitra)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
                {[["ID WO", item.idWo], ["Tire SN", item.tireSn], ["Brand", item.brand], ["Pattern", item.pattern], ["Size", item.size], ["Injury", item.injury]].map(([l, v]) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{l}</span>
                    <span>{nv(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-customer">Customer</Label>
              <Input id="edit-customer" value={form.customer} onChange={set("customer")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-site">Site</Label>
              <Input id="edit-site" value={form.site} onChange={set("site")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-job-type">Jenis Pekerjaan</Label>
              <Input id="edit-job-type" value={form.jobType} onChange={set("jobType")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-store-loc">Store Loc / Lokasi</Label>
              <Input id="edit-store-loc" value={form.storeLoc} onChange={set("storeLoc")} />
            </div>
          </div>

          {isNonRepair && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-deskripsi">Deskripsi Pekerjaan</Label>
              <Textarea id="edit-deskripsi" rows={3} value={form.deskripsiPekerjaan} onChange={set("deskripsiPekerjaan")} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-remark">Remark</Label>
            <Textarea id="edit-remark" rows={2} value={form.remark} onChange={set("remark")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-pemohon">Pemohon</Label>
            <Input id="edit-pemohon" value={form.pemohon} onChange={set("pemohon")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-catatan">Catatan Pengajuan</Label>
            <Textarea id="edit-catatan" rows={2} value={form.catatanPengajuan} onChange={set("catatanPengajuan")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-status">Status Pengajuan</Label>
              <Select value={form.statusPengajuan} onValueChange={(v) => setForm((f) => ({ ...f, statusPengajuan: v as typeof f.statusPengajuan }))}>
                <SelectTrigger id="edit-status" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="diproses">Diproses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-no-wo">No. WO Terbit</Label>
              <Input id="edit-no-wo" placeholder="Isi jika WO sudah terbit" value={form.noWoTerbit} onChange={set("noWoTerbit")} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View Detail Dialog ────────────────────────────────────────────────────────

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
  if (!item) return null
  const statusCfg = STATUS_CONFIG[item.statusPengajuan] ?? { label: item.statusPengajuan, cls: "" }
  const jenisCfg = JENIS_CONFIG[item.jenisPengajuan] ?? { label: item.jenisPengajuan, cls: "" }

  function field(label: string, value: string | Date | null | undefined, mono = false) {
    const text = value instanceof Date ? formatDate(value) : nv(value as string | null | undefined)
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("text-sm", mono && "font-mono")}>{text}</span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>{nv(item.noPengajuan)}</span>
            <Badge variant="outline" className={cn("text-xs", jenisCfg.cls)}>{jenisCfg.label}</Badge>
            <Badge variant="outline" className={cn("text-xs", statusCfg.cls)}>{statusCfg.label}</Badge>
          </DialogTitle>
          <DialogDescription>Detail pengajuan Work Order</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Info Pengajuan</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {field("Tgl. Pengajuan", item.tanggalPengajuan)}
              {field("Pemohon", item.pemohon)}
              {field("Customer", item.customer)}
              {field("Site", item.site)}
              {field("Jenis Pekerjaan", item.jobType)}
              {field("Store Loc", item.storeLoc)}
            </div>
            {item.deskripsiPekerjaan && (
              <div className="mt-3 flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Deskripsi Pekerjaan</span>
                <span className="text-sm whitespace-pre-wrap">{item.deskripsiPekerjaan}</span>
              </div>
            )}
            {item.catatanPengajuan && (
              <div className="mt-3 flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Catatan Pengajuan</span>
                <span className="text-sm">{item.catatanPengajuan}</span>
              </div>
            )}
            {item.noWoTerbit && (
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                {field("No. WO Terbit", item.noWoTerbit, true)}
                {item.tanggalWoTerbit && field("Tgl. WO Terbit", item.tanggalWoTerbit)}
              </div>
            )}
          </div>

          {item.jenisPengajuan === "repair" && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Unit Tire</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {field("ID WO", item.idWo, true)}
                {field("Tire SN", item.tireSn, true)}
                {field("Brand", item.brand)}
                {field("Pattern", item.pattern)}
                {field("Size", item.size)}
                {field("Injury", item.injury)}
                {field("Inspect Date", item.inspectDate)}
                {field("Inspector", item.inspector)}
                {field("Received Date", item.receivedDate)}
                {field("Receiver", item.receiver)}
                {item.remark && field("Remark", item.remark)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button type="button" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
        </DialogFooter>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Batal</Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export function FormWoClient({ waitingWoList, formWoList: initial }: FormWoClientProps) {
  const [activeTab, setActiveTab] = useState("waiting")

  const [repairDialogOpen, setRepairDialogOpen] = useState(false)
  const [nonRepairDialogOpen, setNonRepairDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [selectedWipItem, setSelectedWipItem] = useState<WipRepairRecord | null>(null)
  const [selectedFormWo, setSelectedFormWo] = useState<FormWoRow | null>(null)

  function handleCreateWo(item: WipRepairRecord) {
    setSelectedWipItem(item)
    setRepairDialogOpen(true)
  }

  function handleView(item: FormWoRow) {
    setSelectedFormWo(item)
    setViewDialogOpen(true)
  }

  function handleEdit(item: FormWoRow) {
    setSelectedFormWo(item)
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

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-10 rounded-xl bg-muted/50">
            <TabsTrigger value="waiting" className="rounded-lg px-5 text-sm font-medium">
              <ClipboardList className="mr-2 h-4 w-4" />
              Waiting WO
              {waitingWoList.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full text-xs">{waitingWoList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pengajuan" className="rounded-lg px-5 text-sm font-medium">
              <FilePlus className="mr-2 h-4 w-4" />
              Daftar Pengajuan
              {initial.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full text-xs">{initial.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tombol buat WO Non-Repair tersedia dari semua tab */}
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
            onClick={() => setNonRepairDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Buat WO Non-Repair
          </Button>
        </div>

        <TabsContent value="waiting">
          <WaitingWoTab data={waitingWoList} onCreateWo={handleCreateWo} />
        </TabsContent>

        <TabsContent value="pengajuan">
          <DaftarPengajuanTab
            data={initial}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      <RepairWoDialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen} prefill={selectedWipItem} onSuccess={refreshList} />
      <NonRepairWoDialog open={nonRepairDialogOpen} onOpenChange={setNonRepairDialogOpen} onSuccess={refreshList} />
      <EditWoDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} item={selectedFormWo} onSuccess={refreshList} />
      <ViewDetailDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} item={selectedFormWo} onEdit={() => handleEdit(selectedFormWo!)} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} item={selectedFormWo} onSuccess={refreshList} />
    </>
  )
}
