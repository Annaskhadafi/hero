'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useActionState, useMemo, useState, useTransition, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell, ExternalLink, Plus, X, ArrowUp, ArrowDown, Search } from 'lucide-react'

import {
  deleteWorkflowStudioWorkflowAction,
  markWorkflowStudioInvestigatedAction,
  saveWorkflowStudioApprovalAction,
  resendWorkflowStudioReminderAction,
  toggleWorkflowStatusAction,
} from '@/app/dashboard/workflow-studio/actions'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { getWorkflowStudioConsoleData } from '@/lib/approval-blueprint'

type WorkflowStudioData = Awaited<ReturnType<typeof getWorkflowStudioConsoleData>>

const actionInitialState = { status: 'idle' as const, message: '' }

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID')
}

function FilterSelect({
  label,
  filterKey,
  options,
}: {
  label: string
  filterKey: string
  options: string[]
}) {
  return (
    <select
      data-table-filter-key={filterKey}
      aria-label={label}
      className="border-border/70 bg-muted/30 h-9 rounded-lg border px-3 text-[13px] shadow-none"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option.toLowerCase()}>
          {option}
        </option>
      ))}
    </select>
  )
}

type WorkflowInventoryItem = WorkflowStudioData['inventory'][number]

function DeleteWorkflowButton({
  templateKey,
  transactionType,
  name,
}: {
  templateKey: string
  transactionType: string
  name: string
}) {
  const [state, formAction, isPending] = useActionState(deleteWorkflowStudioWorkflowAction, actionInitialState)
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.status === 'success') {
      setOpen(false)
      router.refresh()
    }
  }, [state.status, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
          Hapus
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Workflow</DialogTitle>
          <DialogDescription>
            Hapus workflow <strong>{name}</strong>? Semua konfigurasi approval per site/section untuk aktivitas ini
            akan ikut terhapus dan tidak bisa dikembalikan.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="templateKey" value={templateKey} />
          <input type="hidden" name="transactionType" value={transactionType} />
          {state.message ? (
            <p className={state.status === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function StatusDropdown({ templateKey, transactionType, currentStatus }: { templateKey: string; transactionType: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)

  useEffect(() => { setStatus(currentStatus) }, [currentStatus])

  function handleChange(value: string) {
    const fd = new FormData()
    fd.set('templateKey', templateKey)
    fd.set('transactionType', transactionType)
    fd.set('newStatus', value)
    startTransition(async () => {
      await toggleWorkflowStatusAction(actionInitialState, fd)
      setStatus(value === 'true' ? 'Active' : 'Nonactive')
      router.refresh()
    })
  }

  return (
    <select
      value={status === 'Active' ? 'true' : 'false'}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="border-border/70 bg-muted/30 h-7 rounded-md border px-1.5 text-xs font-medium disabled:opacity-50"
    >
      <option value="true">Active</option>
      <option value="false">Nonactive</option>
    </select>
  )
}

type SearchableOption = { id: number; name: string; jobTitle?: string | null; siteId?: number | null; employeeSn?: string | null; department?: string | null }

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: {
  value: string
  onChange: (v: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popupHeightRef = useRef(240)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Focus search input reliably when popup opens and position is calculated
  useEffect(() => {
    if (open && popupPos) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [open, popupPos])

  // Catat tinggi asli popup setelah dirender untuk keputusan flip.
  useLayoutEffect(() => {
    if (open && popupRef.current) popupHeightRef.current = popupRef.current.offsetHeight
  }, [open, popupPos])

  // Posisi popup dihitung dari tombol, dirender lewat portal ke body supaya
  // tidak terpotong oleh container tabel yang overflow-x-auto.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const button = ref.current?.querySelector('button')
    if (!button) return
    const update = () => {
      const rect = button.getBoundingClientRect()
      const margin = 8
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.max(240, rect.width)
      const left = Math.max(margin, Math.min(rect.left, vw - width - margin))
      const spaceBelow = vh - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const estHeight = Math.min(popupHeightRef.current || 240, vh - margin * 2)
      const openUp = estHeight > spaceBelow && spaceAbove > spaceBelow
      const top = openUp ? rect.top - estHeight - 4 : rect.bottom + 4
      const maxHeight = Math.max(120, (openUp ? spaceAbove : spaceBelow) - 4)
      setPopupPos({
        top: Math.max(margin, top),
        left,
        width,
        maxHeight: Math.min(estHeight, maxHeight),
      })
    }
    update()
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const selected = options.find((o) => o.id.toString() === value)
  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase().trim()
        const name = (o.name ?? '').toLowerCase()
        const jobTitle = (o.jobTitle ?? '').toLowerCase()
        const sn = ((o as any).employeeSn ?? (o as any).sn ?? '').toString().toLowerCase()
        const dept = ((o as any).department ?? (o as any).departmentName ?? '').toLowerCase()
        return name.includes(q) || jobTitle.includes(q) || sn.includes(q) || dept.includes(q)
      })
    : options

  const popup = open && popupPos ? (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: popupPos.top,
        left: popupPos.left,
        width: popupPos.width,
        maxHeight: popupPos.maxHeight,
      }}
      className="pointer-events-auto z-[9999] flex flex-col rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      <div className="relative border-b border-slate-200 bg-slate-50/70 p-1.5 flex items-center">
        <Search className="absolute left-2.5 size-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder ?? 'Cari karyawan...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-7 w-full rounded border border-slate-200 bg-white pl-7 pr-7 text-xs text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 text-slate-400 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1 divide-y divide-slate-100" style={{ maxHeight: '240px' }}>
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); setQuery('') }}
          className="text-slate-500 hover:bg-slate-100 rounded h-7 w-full px-2 text-left text-xs font-medium italic"
        >
          - Kosongkan Pilihan -
        </button>
        {filtered.length === 0 ? (
          <div className="py-3 px-2 text-center text-xs text-slate-400">
            Tidak ada data yang sesuai &quot;{query}&quot;
          </div>
        ) : (
          filtered.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => { onChange(emp.id.toString()); setOpen(false); setQuery('') }}
              className={`hover:bg-slate-100 rounded h-7 w-full px-2 text-left text-xs truncate transition-colors ${
                value === emp.id.toString() ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-800'
              }`}
              title={`${emp.name}${emp.jobTitle ? ` - ${emp.jobTitle}` : ''}`}
            >
              {emp.name}{emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) setQuery('')
          setOpen(!open)
        }}
        className="border-border/70 bg-white hover:bg-slate-50 h-8 w-full rounded-md border px-2 text-left text-xs truncate transition-colors"
      >
        {selected ? `${selected.name}${selected.jobTitle ? ` - ${selected.jobTitle}` : ''}` : (placeholder ?? 'Kosong')}
      </button>
      {typeof document !== 'undefined' ? createPortal(popup, document.body) : null}
    </div>
  )
}
const SITE_APPROVER_MAP: Record<string, string> = {
  '125': '1375', // Ade Saharu (Jakarta - HSE)
  '126': '955',  // Apriyanto (Balikpapan)
  '127': '1164', // Saipudin (Sangatta - HSE Leader)
  '128': '1308', // Irfan Rivai Remba (CK MHU - HSE)
  '129': '1380', // Rizky Rahmadani (CK KIM - HSE)
  '130': '97',   // Tommy Indra Aldiny Rambe (Tj. Adaro - Technical Leader / PJO)
  '131': '1285', // Danny Hangga Irawan (CK BMB - HSE)
  '132': '971',  // Mudrikun Ni'Am (TU Gresik)
  '133': '1374', // Fathurrahman Sufi (CK BIB - HSE)
  '134': '96',   // Febrial Hariri (Palembang - Leader Technical Sumatera / PJO)
  '135': '955',  // Apriyanto (TU Batu Hijau)
  '136': '96',   // Febrial Hariri (Pekanbaru)
  '137': '255',  // Muhammad Refaldi (Tj. Redeb - Technical Engineer)
  '138': '454',  // Adit Prasetyo (AMM Mifa Holing - PJO)
  '139': '955',  // Apriyanto (Sebamban)
  '140': '1307', // Muhammad Wahyu Ichsan (Vale Sorowako - HSE)
  '141': '1203', // Alfian Saleh (MTN Berau)
  '142': '1172', // Zaiddan Maiadzanie (CK NCN)
  '143': '1045', // Yoga Dirgantara Nuryanto (Petrosea SDA)
  '144': '1057', // Singgih Wiyono (AMM Tabang - PJO)
  '145': '1189', // Fachri Husein (CK MIFA)
  '146': '255',  // Muhammad Refaldi (PT SMJ Berau - PJO)
  '147': '1294', // Nando Aji Saputra (PKA Musi Rawas)
  '148': '1289', // Yoga Perdana (MTN ME)
  '149': '1180', // Muchamat Nurkolis Majid (PPA BIB - PJO)
  '150': '1250', // Rakha Dwi Saputra (CDE Bengkulu)
  '151': '955',  // Apriyanto (Makassar)
  '210': '1212', // Dowy Pratama Sita (BUMA Tanjung - PJO)
}

const SITE_DEFAULT_SECTION: Record<string, string> = {
  '125': '15', // Jakarta: HSE
  '126': '33', // Balikpapan: Service Operation MVC
  '127': '29', // Sangatta: Repair / Retread Operation
  '128': '29', // CK MHU: Repair / Retread Operation
  '129': '33', // CK KIM: Service Operation MVC
  '130': '29', // Tj. Adaro: Repair / Retread Operation
  '131': '29', // CK BMB: Repair / Retread Operation
  '132': '33', // TU Gresik: Service Operation MVC
  '133': '29', // CK BIB: Repair / Retread Operation
  '134': '37', // Palembang: Technical Operation
  '135': '33', // Sebamban: Service
  '136': '33', // Pekanbaru: Service
  '137': '33', // Tj. Redeb: Service
  '138': '34', // AMM Mifa: Service Operation Others
  '139': '33', // Sebamban
  '140': '29', // Vale: Repair / Retread Operation
  '141': '29', // MTN Berau: Repair / Retread Operation
  '142': '33', // CK NCN: Service Operation MVC
  '143': '29', // Petrosea SDA: Repair / Retread Operation
  '144': '33', // AMM Tabang: Service Operation MVC
  '145': '33', // CK MIFA: Service Operation MVC
  '146': '37', // PT SMJ Berau: Technical Operation
  '147': '29', // PKA Musi Rawas: Repair / Retread Operation
  '148': '29', // MTN ME: Repair / Retread Operation
  '149': '34', // PPA BIB: Service Operation Others
  '150': '29', // CDE Bengkulu: Repair / Retread Operation
  '151': '33', // Makassar
  '210': '37', // BUMA Tanjung: Technical Operation
}

const SECTION_HEAD_BY_SEC_ID: Record<string, string> = {
  '1': '977',   // Billing
  '10': '959',  // Facility & Maintenance
  '11': '1006', // Finance & Accounting
  '14': '970',  // HR-GA -> Muhammad Iqbal
  '15': '1164', // HSE -> Saipudin
  '18': '979',  // Inventory -> Ali Rahman
  '19': '990',  // Legal & ERM
  '26': '985',  // Procurement -> Abd.Rajab
  '28': '944',  // Quality Management -> Bardinia Susi Ekawaty
  '29': '996',  // Repair / Retread Operation -> Ary Maulana
  '33': '955',  // Service Operation MVC -> Apriyanto
  '34': '1040', // Service Operation Others
  '37': '96',   // Technical Operation -> Febrial Hariri
  '39': '979',  // Warehouse & Distribution -> Ali Rahman
}

function resolvePjoOrAtasan(siteId: string, sectionId?: string): string {
  const SITES_WITH_DEDICATED_PJO: Record<string, string> = {
    '127': '1164', // Sangatta -> Saipudin (HSE Leader / PJO)
    '128': '1308', // CK MHU -> Irfan Rivai Remba (HSE / PJO)
    '129': '1380', // CK KIM -> Rizky Rahmadani (HSE / PJO)
    '130': '97',   // Tj. Adaro -> Tommy Indra Aldiny Rambe (Technical Leader / PJO)
    '131': '1285', // CK BMB -> Danny Hangga Irawan (HSE / PJO)
    '133': '1374', // CK BIB -> Fathurrahman Sufi (HSE / PJO)
    '134': '96',   // Palembang -> Febrial Hariri (PJO)
    '137': '255',  // Tj. Redeb / Berau -> Muhammad Refaldi (PJO)
    '138': '454',  // AMM Mifa -> Adit Prasetyo (PJO)
    '140': '1307', // Vale Sorowako -> Muhammad Wahyu Ichsan (HSE / PJO)
    '141': '1203', // MTN Berau -> Alfian Saleh (PJO)
    '143': '1045', // Petrosea SDA -> Yoga Dirgantara Nuryanto (PJO)
    '144': '1057', // AMM Tabang -> Singgih Wiyono (PJO)
    '145': '1189', // CK MIFA -> Fachri Husein (PJO)
    '146': '255',  // PT SMJ Berau -> Muhammad Refaldi (PJO)
    '147': '1294', // PKA Musi Rawas -> Nando Aji Saputra (PJO)
    '148': '1289', // MTN ME -> Yoga Perdana (PJO)
    '149': '1180', // PPA BIB -> Muchamat Nurkolis Majid (PJO)
    '150': '1250', // CDE Bengkulu -> Rakha Dwi Saputra (PJO)
    '210': '1212', // BUMA Tanjung -> Dowy Pratama Sita (PJO)
  }

  if (SITES_WITH_DEDICATED_PJO[siteId]) {
    return SITES_WITH_DEDICATED_PJO[siteId]
  }

  const NON_PJO_SECTION_APPROVER: Record<string, string> = {
    '33': '955',  // Service Operation MVC -> Apriyanto
    '34': '1040', // Service Operation Others
    '29': '996',  // Repair / Retread -> Ary Maulana
    '37': '96',   // Technical -> Febrial Hariri
    '14': '970',  // HR-GA -> Muhammad Iqbal
    '15': '1164', // Saipudin / HSE
    '39': '979',  // Ali Rahman
    '18': '979',  // Ali Rahman
    '28': '944',  // Bardinia
    '1': '977',   // Billing
    '11': '1006', // Finance
  }

  if (sectionId && NON_PJO_SECTION_APPROVER[sectionId]) {
    return NON_PJO_SECTION_APPROVER[sectionId]
  }

  return SITE_APPROVER_MAP[siteId] ?? '955'
}

function WorkflowBuilderDialog({
  data,
  initial,
  trigger,
}: {
  data: WorkflowStudioData
  initial?: WorkflowInventoryItem
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(saveWorkflowStudioApprovalAction, actionInitialState)
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>(
    initial?.templateKey ?? data.builderOptions.menus[0]?.key ?? ''
  )
  const selectedMenu =
    data.builderOptions.menus.find((menu) => menu.key === selectedMenuKey) ?? data.builderOptions.menus[0]
  const employeeOptions = data.builderOptions.employees
  const allSites = data.builderOptions.sites
  const allSectionsList = useMemo(() => {
    const raw = (data.builderOptions.sections ?? data.builderOptions.csSections ?? []) as Array<{
      id: number
      name: string
      headEmployeeId?: number | null
      departmentId?: number | null
      departmentName?: string | null
    }>
    return raw.map((s) => ({
      id: s.id,
      name: s.departmentName ? `${s.name} (${s.departmentName})` : s.name,
      rawName: s.name,
      headEmployeeId: s.headEmployeeId,
      departmentId: s.departmentId,
      departmentName: s.departmentName,
    }))
  }, [data.builderOptions.sections, data.builderOptions.csSections])
  const csSections = allSectionsList
  const fiveRAreas: Array<{ id: number; name: string; siteId: number | null; picEmployeeId: number | null; picName: string | null }> = (data.builderOptions as any).fiveRAreas ?? []

  const employeeLookupByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employeeOptions) {
      const lower = (e.name || '').toLowerCase()
      if (lower.includes('as') && lower.includes('fauz')) map.set('asar', e.id.toString())
      if (lower.includes('arjun')) map.set('arjun', e.id.toString())
      if (lower.includes('abian')) map.set('abian', e.id.toString())
      if (lower.includes('iqbal')) map.set('iqbal', e.id.toString())
      if (lower.includes('ali') && lower.includes('rahman')) map.set('alirahman', e.id.toString())
    }
    return map
  }, [employeeOptions])

  function resolveApproverForSiteAndSection(siteId: string, sectionId?: string): string {
    const SITES_WITH_DEDICATED_PJO: Record<string, string> = {
      '127': '1164', // Sangatta -> Saipudin (HSE Leader / PJO)
      '128': '1308', // CK MHU -> Irfan Rivai Remba (HSE / PJO)
      '129': '1380', // CK KIM -> Rizky Rahmadani (HSE / PJO)
      '130': '97',   // Tj. Adaro -> Tommy Indra Aldiny Rambe (Technical Leader / PJO)
      '131': '1285', // CK BMB -> Danny Hangga Irawan (HSE / PJO)
      '133': '1374', // CK BIB -> Fathurrahman Sufi (HSE / PJO)
      '134': '96',   // Palembang -> Febrial Hariri (PJO)
      '137': '255',  // Tj. Redeb / Berau -> Muhammad Refaldi (PJO)
      '138': '454',  // AMM Mifa -> Adit Prasetyo (PJO)
      '140': '1307', // Vale Sorowako -> Muhammad Wahyu Ichsan (HSE / PJO)
      '141': '1203', // MTN Berau -> Alfian Saleh (PJO)
      '143': '1045', // Petrosea SDA -> Yoga Dirgantara Nuryanto (PJO)
      '144': '1057', // AMM Tabang -> Singgih Wiyono (PJO)
      '145': '1189', // CK MIFA -> Fachri Husein (PJO)
      '146': '255',  // PT SMJ Berau -> Muhammad Refaldi (PJO)
      '147': '1294', // PKA Musi Rawas -> Nando Aji Saputra (PJO)
      '148': '1289', // MTN ME -> Yoga Perdana (PJO)
      '149': '1180', // PPA BIB -> Muchamat Nurkolis Majid (PJO)
      '150': '1250', // CDE Bengkulu -> Rakha Dwi Saputra (PJO)
      '210': '1212', // BUMA Tanjung -> Dowy Pratama Sita (PJO)
    }

    if (SITES_WITH_DEDICATED_PJO[siteId]) {
      return SITES_WITH_DEDICATED_PJO[siteId]
    }

    // Site / Hub tanpa PJO & HSE (Balikpapan: 126, Jakarta: 125, dll.):
    if (sectionId) {
      const sec = allSectionsList.find((s) => s.id.toString() === sectionId)
      const secName = (sec?.name || '').toLowerCase()
      if (secName.includes('service')) {
        return employeeLookupByName.get('asar') ?? '955'
      }
      if (secName.includes('repair') || secName.includes('retread')) {
        return employeeLookupByName.get('arjun') ?? '996'
      }
      if (secName.includes('technical') || secName.includes('te')) {
        return employeeLookupByName.get('abian') ?? '96'
      }
      if (secName.includes('warehouse') || secName.includes('inventory')) {
        return employeeLookupByName.get('alirahman') ?? '979'
      }
      if (secName.includes('hr') || secName.includes('ga')) {
        return employeeLookupByName.get('iqbal') ?? '970'
      }
      if (sec?.headEmployeeId) {
        return sec.headEmployeeId.toString()
      }
    }

    return employeeLookupByName.get('asar') ?? '955'
  }

  const csEmployees = useMemo(
    () => employeeOptions.filter((e) => {
      const dept = (e.department ?? '').toLowerCase()
      return dept === 'central services' || dept === 'central service' || dept === 'central services'
    }),
    [employeeOptions]
  )

  type ApprovalStep = { id: string; label: string; type: 'section' | 'employee' }
  type SiteData = { key: string; siteId: string; departmentId: string; values: Record<string, string> }

  // RFR uses department-based assignment instead of site-based
  const isRfrMenu =
    (selectedMenu?.transactionType ?? '') === 'rfr_approval' ||
    (initial?.transactionType ?? '') === 'rfr_approval' ||
    (selectedMenuKey || initial?.id || '').toLowerCase().includes('rfr')
  const isFormWoMenu = (selectedMenuKey || initial?.id || '').toLowerCase().includes('wo')

  function isSectionStep(label: string) {
    const norm = label.toLowerCase().replace(/[^a-z]/g, '')
    return norm === 'section' || norm === 'masterarea' || norm === 'area'
  }

  function isMaterialOrToolsMenu() {
    const k = (selectedMenuKey || initial?.id || '').toLowerCase()
    return k.includes('material') || k.includes('tools')
  }

  function buildInitialSteps(): ApprovalStep[] {
    const menuKeyLower = (selectedMenuKey || initial?.id || '').toLowerCase()
    const isFormWo = menuKeyLower.includes('wo')
    const isRfr = menuKeyLower.includes('rfr')
    const isFiveR = menuKeyLower.includes('5r') || menuKeyLower.includes('five-r')
    const isApd = menuKeyLower === 'apd-request-apd' || menuKeyLower === 'apd-request'

    const isFormWoService = menuKeyLower.includes('service') && isFormWo
    const isFormWoRepair = (menuKeyLower.includes('repair') || menuKeyLower.includes('retread')) && isFormWo

    const formWoServiceDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'Service Operation Coord. SPV', type: 'employee' },
      { id: 'step-2', label: 'Team Billing', type: 'employee' },
      { id: 'step-3', label: 'Inventory & Warehouse Management SPV', type: 'employee' },
    ]

    const formWoRepairDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'QC / Leader', type: 'employee' },
      { id: 'step-2', label: 'Repair / Retread Operation SPV', type: 'employee' },
      { id: 'step-3', label: 'Team Billing', type: 'employee' },
      { id: 'step-4', label: 'Inventory & Warehouse Management SPV', type: 'employee' },
    ]

    const formWoDefaults: ApprovalStep[] = isFormWoService
      ? formWoServiceDefaults
      : formWoRepairDefaults

    const rfrDefaults: ApprovalStep[] = [
      { id: 'step-1', label: 'Adila Tri Arizona (HC Recruitment)', type: 'employee' },
      { id: 'step-2', label: 'Kesuma Bagas (Leader HR-GA)', type: 'employee' },
      { id: 'step-3', label: 'Dept Head yang Mengajukan', type: 'employee' },
      { id: 'step-4', label: 'Person Sihaloho (General Manager)', type: 'employee' },
    ]

    const fiveRDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Master Area', type: 'section' },
      { id: 'step-1', label: 'Atasan Langsung PIC Area / PJO Site', type: 'employee' },
      { id: 'step-2', label: 'Head of CPI Department', type: 'employee' },
    ]

    const materialToolsDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'PJO / HSE / Atasan Site', type: 'employee' },
      { id: 'step-2', label: 'Section Head', type: 'employee' },
    ]

    const apdDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'PJO / HSE / Atasan Site', type: 'employee' },
    ]

    const generalDefaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'Leader', type: 'employee' },
      { id: 'step-2', label: 'PJO (Head Lokasi)', type: 'employee' },
      { id: 'step-3', label: 'Section Head', type: 'employee' },
      { id: 'step-4', label: 'Department Head', type: 'employee' },
    ]

    const defaults = isRfr
      ? rfrDefaults
      : isFormWo
        ? formWoDefaults
        : isFiveR
          ? fiveRDefaults
          : isMaterialOrToolsMenu()
            ? materialToolsDefaults
            : isApd
              ? apdDefaults
              : generalDefaults

    if (!initial?.globalSteps || initial.globalSteps.length === 0) {
      return defaults
    }

    const existing = initial.globalSteps
      .filter((gs) => {
        const l = (gs.label ?? '').toLowerCase().trim()
        return (
          !isSectionStep(l) &&
          l !== 'pemohon' &&
          l !== 'yang memohon' &&
          l !== 'requestor' &&
          l !== 'submitted' &&
          l !== 'submitter' &&
          l !== 'service operation other' &&
          l !== 'service operation others' &&
          l !== 'admin cp site' &&
          l !== 'admin site'
        )
      })
      .map((gs, i) => ({
        id: `step-${i + 1}`,
        label: gs.label ?? '',
        type: 'employee' as const,
      }))

    if (isRfr) return existing
    return [{ id: 'step-0', label: isFiveR ? 'Master Area' : 'Section', type: 'section' as const }, ...existing]
  }

  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(buildInitialSteps)

  const [siteData, setSiteData] = useState<SiteData[]>(() => {
    const steps = buildInitialSteps()
    const menuKeyLower = (selectedMenuKey || initial?.id || initial?.templateKey || '').toLowerCase()
    const isFiveR = menuKeyLower.includes('5r') || menuKeyLower.includes('five-r')

    const labelToStepId: Record<string, string> = {}
    for (const s of steps) {
      const norm = s.label.toLowerCase().replace(/[^a-z0-9]/g, '')
      labelToStepId[norm] = s.id
      labelToStepId[s.id] = s.id
      if (norm.includes('leader')) labelToStepId['leader'] = s.id
      if (norm.includes('pjo') || norm.includes('hse') || norm.includes('atasan') || norm.includes('admin')) {
        labelToStepId['pjo'] = s.id
        labelToStepId['pjohseatansite'] = s.id
        labelToStepId['pjo_hse_atasan_site'] = s.id
      }
      if (norm.includes('sectionhead') || norm.includes('headsection') || (norm.includes('section') && !norm.includes('service'))) {
        labelToStepId['section_head'] = s.id
        labelToStepId['sectionhead'] = s.id
        labelToStepId['sectionHead'] = s.id
      }
      if (norm === 'section' || norm === 'masterarea' || norm === 'area') labelToStepId['section'] = s.id
      if (norm === 'departmenthead') labelToStepId['department'] = s.id
      if (norm.includes('quality') || norm.includes('qmo')) labelToStepId['quality'] = s.id
      if (norm.includes('cpi')) labelToStepId['cpi'] = s.id
    }

    if (isFiveR && fiveRAreas.length > 0) {
      let rIndex = 0
      return fiveRAreas.map((area) => {
        const areaSiteId = area.siteId ? area.siteId.toString() : '126'
        let approverStep1 = '955'
        const lowerName = (area.name || '').toLowerCase()
        if (lowerName.includes('workshop') || lowerName.includes('repair')) {
          approverStep1 = areaSiteId === '126' ? '996' : (SITE_APPROVER_MAP[areaSiteId] ?? '996')
        } else if (lowerName.includes('warehouse') || lowerName.includes('supply chain')) {
          approverStep1 = areaSiteId === '126' ? '979' : (SITE_APPROVER_MAP[areaSiteId] ?? '979')
        } else if (lowerName.includes('office') || lowerName.includes('hr') || lowerName.includes('ga')) {
          approverStep1 = areaSiteId === '126' ? '970' : (SITE_APPROVER_MAP[areaSiteId] ?? '970')
        } else if (lowerName.includes('safety') || lowerName.includes('hse')) {
          approverStep1 = areaSiteId === '126' ? '1164' : (SITE_APPROVER_MAP[areaSiteId] ?? '1164')
        } else if (lowerName.includes('service')) {
          approverStep1 = areaSiteId === '126' ? '955' : (SITE_APPROVER_MAP[areaSiteId] ?? '955')
        } else {
          approverStep1 = SITE_APPROVER_MAP[areaSiteId] ?? '955'
        }

        return {
          key: `site-5r-${rIndex++}-${areaSiteId}-${area.id}`,
          siteId: areaSiteId,
          departmentId: '',
          values: {
            'step-0': area.id.toString(),
            'step-1': approverStep1,
            'step-2': '944',
          },
        }
      })
    }

    if (initial?.siteApprovals && initial.siteApprovals.length > 0) {
      return initial.siteApprovals.map((sa, i) => {
        const values: Record<string, string> = {}
        const secVal = sa.sectionId != null ? String(sa.sectionId) : (SITE_DEFAULT_SECTION[sa.siteId?.toString() ?? ''] ?? '29')
        if (labelToStepId['section']) values[labelToStepId['section']] = secVal
        if (sa.leaderId != null && labelToStepId['leader']) values[labelToStepId['leader']] = String(sa.leaderId)
        if (sa.pjoId != null && labelToStepId['pjo']) values[labelToStepId['pjo']] = String(sa.pjoId)
        if (sa.sectionHeadId != null && (labelToStepId['sectionHead'] || labelToStepId['section_head'])) {
          values[labelToStepId['sectionHead'] || labelToStepId['section_head']] = String(sa.sectionHeadId)
        }
        if (sa.departmentHeadId != null && labelToStepId['department']) values[labelToStepId['department']] = String(sa.departmentHeadId)
        
        if ((sa as any).customRoles) {
          for (const [roleKey, empId] of Object.entries((sa as any).customRoles)) {
            const cleanKey = roleKey.replace(/[^a-z0-9]/g, '')
            const stepId =
              labelToStepId[roleKey] ??
              labelToStepId[cleanKey] ??
              (cleanKey.includes('quality')
                ? labelToStepId['quality']
                : cleanKey.includes('cpi')
                  ? labelToStepId['cpi']
                  : cleanKey.includes('sectionhead') || cleanKey.includes('headsection')
                    ? labelToStepId['section_head'] ?? labelToStepId['sectionHead']
                    : cleanKey.includes('pjo') || cleanKey.includes('hse') || cleanKey.includes('admin') || cleanKey.includes('atasan')
                      ? labelToStepId['pjo'] ?? labelToStepId['pjohseatansite'] ?? labelToStepId['admin_cp_site']
                      : undefined)
            if (empId != null && stepId && !values[stepId]) {
              values[stepId] = String(empId)
            }
          }
        }

        // Direct matching for 2-step workflows (Step 1: Site, Step 2: Section Head)
        const employeeSteps = steps.filter((s) => s.type !== 'section')
        if (employeeSteps.length === 2) {
          if (!values[employeeSteps[0].id]) {
            const siteVal = sa.pjoId ?? (sa as any).customRoles?.['pjo_hse_atasan_site'] ?? SITE_APPROVER_MAP[sa.siteId?.toString() ?? '']
            if (siteVal) values[employeeSteps[0].id] = String(siteVal)
          }
          if (!values[employeeSteps[1].id]) {
            const secVal = sa.sectionHeadId ?? (sa as any).customRoles?.['section_head'] ?? 996
            if (secVal) values[employeeSteps[1].id] = String(secVal)
          }
        } else if (employeeSteps.length === 1 && !values[employeeSteps[0].id]) {
          const siteVal = sa.pjoId ?? (sa as any).customRoles?.['pjo_hse_atasan_site'] ?? (sa as any).customRoles?.['hse'] ?? SITE_APPROVER_MAP[sa.siteId?.toString() ?? '']
          if (siteVal) values[employeeSteps[0].id] = String(siteVal)
        }
        
        return { key: `site-${i}`, siteId: sa.siteId?.toString() ?? '0', departmentId: (sa as any).departmentId?.toString() ?? '', values }
      })
    }

    // Default auto-population if initial siteApprovals is empty
    if (menuKeyLower.includes('material') || menuKeyLower.includes('tools')) {
      return allSites.map((site, index) => ({
        key: `site-mat-${index}-${site.id}`,
        siteId: site.id.toString(),
        departmentId: '',
        values: {
          'step-1': SITE_APPROVER_MAP[site.id.toString()] ?? site.headEmployeeId?.toString() ?? '1099',
          'step-2': '996', // Ary Maulana - Repair Retread Operation SPV
        },
      }))
    }
    if (menuKeyLower.includes('apd')) {
      return allSites.map((site, index) => ({
        key: `site-apd-${index}-${site.id}`,
        siteId: site.id.toString(),
        departmentId: '',
        values: {
          'step-1': SITE_APPROVER_MAP[site.id.toString()] ?? site.headEmployeeId?.toString() ?? '1099',
        },
      }))
    }

    if (menuKeyLower.includes('5r') || menuKeyLower.includes('five-r')) {
      const areasToUse = fiveRAreas.length > 0 ? fiveRAreas : []
      let rIndex = 0
      return areasToUse.map((area) => {
        const areaSiteId = area.siteId ? area.siteId.toString() : '126'
        let approverStep1 = '955'
        const lowerName = (area.name || '').toLowerCase()
        if (lowerName.includes('workshop') || lowerName.includes('repair')) {
          approverStep1 = areaSiteId === '126' ? '996' : (SITE_APPROVER_MAP[areaSiteId] ?? '996')
        } else if (lowerName.includes('warehouse') || lowerName.includes('supply chain')) {
          approverStep1 = areaSiteId === '126' ? '979' : (SITE_APPROVER_MAP[areaSiteId] ?? '979')
        } else if (lowerName.includes('office') || lowerName.includes('hr') || lowerName.includes('ga')) {
          approverStep1 = areaSiteId === '126' ? '970' : (SITE_APPROVER_MAP[areaSiteId] ?? '970')
        } else if (lowerName.includes('safety') || lowerName.includes('hse')) {
          approverStep1 = areaSiteId === '126' ? '1164' : (SITE_APPROVER_MAP[areaSiteId] ?? '1164')
        } else if (lowerName.includes('service')) {
          approverStep1 = areaSiteId === '126' ? '955' : (SITE_APPROVER_MAP[areaSiteId] ?? '955')
        } else {
          approverStep1 = SITE_APPROVER_MAP[areaSiteId] ?? '955'
        }

        return {
          key: `site-5r-${rIndex++}-${areaSiteId}-${area.id}`,
          siteId: areaSiteId,
          departmentId: '',
          values: {
            'step-0': area.id.toString(),
            'step-1': approverStep1,
            'step-2': '944',
          },
        }
      })
    }

    return []
  })

  const [pendingSiteId, setPendingSiteId] = useState('')
  const [formStatus, setFormStatus] = useState(initial?.status === 'Nonactive' ? 'false' : 'true')
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(toDateTimeLocal(initial?.effectiveFrom))
  const [formEffectiveTo, setFormEffectiveTo] = useState(toDateTimeLocal(initial?.effectiveTo))

  useEffect(() => {
    if (initial) {
      setFormStatus(initial.status === 'Nonactive' ? 'false' : 'true')
      setFormEffectiveFrom(toDateTimeLocal(initial.effectiveFrom))
      setFormEffectiveTo(toDateTimeLocal(initial.effectiveTo))
    }
  }, [initial])

  const usedSiteIds = new Set(siteData.map((s) => s.siteId))
  const usedDeptIds = new Set(siteData.map((s) => s.departmentId).filter(Boolean))
  const allDepartments = data.builderOptions.departments ?? []
  const availableSites = allSites

  function addStep() {
    setApprovalSteps((prev) => [...prev, { id: `step-${Date.now()}`, label: '', type: 'employee' }])
  }

  function removeStep(id: string) {
    // Langkah Section & Head Section (untuk Material/Tools) adalah default yang tidak bisa dihapus.
    setApprovalSteps((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target?.type === 'section') return prev
      if (isMaterialOrToolsMenu() && target?.label === 'Head Section') return prev
      return prev.filter((s) => s.id !== id)
    })
    setSiteData((prev) =>
      prev.map((site) => {
        const newValues = { ...site.values }
        delete newValues[id]
        return { ...site, values: newValues }
      })
    )
  }

  function updateStepLabel(id: string, label: string) {
    setApprovalSteps((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
  }

  function moveStep(id: string, dir: -1 | 1) {
    setApprovalSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      // Langkah Section selalu di posisi pertama — jangan izinkan langkah lain
      // pindah ke depannya.
      if (newIdx === 0 && prev[0].type === 'section') return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy
    })
  }

  function addSite() {
    if (!pendingSiteId) return
    const firstSite = siteData[0]
    
    // RFR: department-based assignment
    if (isRfrMenu) {
      const dept = allDepartments.find((d) => d.id.toString() === pendingSiteId)
      if (!dept) return
      const values: Record<string, string> = {}
      for (const step of approvalSteps) {
        values[step.id] = firstSite?.values[step.id] ?? ''
      }
      setSiteData((prev) => [...prev, { key: `site-${Date.now()}`, siteId: '0', departmentId: pendingSiteId, values }])
      setPendingSiteId('')
      return
    }
    
    const SITE_PJO_DEFAULTS: Record<string, string> = {
      '127': '1164', // Saipudin (Sangatta)
      '140': '1127', // Muhammad Naufal (Vale Sorowako)
      '130': '97',   // Tommy Indra Aldiny Rambe (Tj. Adaro)
      '210': '97',   // Tommy Indra Aldiny Rambe (BUMA Tanjung)
      '131': '97',   // Tommy Indra Aldiny Rambe (CK BMB)
      '134': '96',   // Febrial Hariri (Palembang)
      '138': '454',  // Adit Prasetyo (AMM MIFA)
      '129': '1101', // Jaya Kusuma Putra (CK KIM)
      '146': '255',  // Muhammad Refaldi (PT SMJ Berau)
      '137': '255',  // Muhammad Refaldi (Berau)
      '149': '1180', // Muchamat Nurkolis Majid (PPA BIB)
      '144': '1057', // Singgih Wiyono (AMM Tabang)
      '133': '1053', // Abdul Ajis Setiawan (CK BIB)
      '128': '312',  // Andi Ibrahim (CK MHU)
      '125': '966',  // Rendra Rachman (Jakarta)
      '126': '970',  // Muhammad Iqbal (Balikpapan GA/HR)
      '139': '970',  // Sebamban
    }

    if (pendingSiteId === 'all') {
      const newRows: any[] = []
      const isFiveR = (selectedMenuKey || initial?.id || '').toLowerCase().includes('5r')
      
      let index = 0
      for (const site of allSites) {
        const isBalikpapan = site.id.toString() === '126'
        const isJakarta = site.id.toString() === '125'
        
        let sectionsToAdd: any[] = [null]
        if (approvalSteps.some((s) => s.type === 'section')) {
          if (isFiveR && fiveRAreas.length > 0) {
            sectionsToAdd = fiveRAreas.filter((a) => !a.siteId || a.siteId.toString() === site.id.toString())
            if (sectionsToAdd.length === 0) sectionsToAdd = [null]
          } else if (isBalikpapan) {
            // Balikpapan Hub: Service, Repair/Retread, Technical, Warehouse, HR-GA
            const bpSecIds = ['33', '29', '37', '39', '14', '15']
            sectionsToAdd = csSections.filter((s) => bpSecIds.includes(s.id.toString()))
            if (sectionsToAdd.length === 0) sectionsToAdd = csSections.slice(0, 5)
          } else if (isJakarta) {
            // Jakarta Head Office: HSE, HR-GA, Finance, Procurement, Technical, Service
            const jktSecIds = ['15', '14', '11', '26', '37', '33']
            sectionsToAdd = csSections.filter((s) => jktSecIds.includes(s.id.toString()))
            if (sectionsToAdd.length === 0) sectionsToAdd = [csSections[0] ?? null]
          } else {
            const defSecId = SITE_DEFAULT_SECTION[site.id.toString()] ?? '33'
            const sec = csSections.find((s) => s.id.toString() === defSecId) ?? csSections[0]
            sectionsToAdd = sec ? [sec] : [null]
          }
        }
        
        for (const sec of sectionsToAdd) {
          const values: Record<string, string> = {}
          
          if (sec) {
            const existing = data.builderOptions.siteSectionApprovers?.[`${site.id}_${sec.id}`]
            for (const step of approvalSteps) {
              if (step.type === 'section') {
                values[step.id] = sec.id.toString()
                continue
              }
              const norm = step.label.toLowerCase().replace(/[^a-z]/g, '')
              let employeeId: number | null | undefined = null
              
              if (norm.includes('quality') || norm.includes('qmo')) {
                employeeId = 1181
              } else if (norm.includes('cpi')) {
                employeeId = 944
              } else if (norm.includes('leader')) {
                employeeId = existing?.leaderId ?? sec.leaderEmployeeId
              } else if (norm.includes('pjo') || norm.includes('hse') || norm.includes('headlokasi') || norm.includes('atasanlangsung') || norm.includes('atasan') || norm.includes('admin')) {
                employeeId = existing?.pjoId ?? Number(resolvePjoOrAtasan(site.id.toString(), sec.id.toString()))
              } else if (norm.includes('sectionhead') || norm.includes('headsection') || (norm.includes('section') && !norm.includes('service'))) {
                employeeId = existing?.sectionHeadId ?? (SECTION_HEAD_BY_SEC_ID[sec.id.toString()] ? Number(SECTION_HEAD_BY_SEC_ID[sec.id.toString()]) : sec.sectionHeadEmployeeId)
              } else if (norm.includes('departmenthead')) {
                employeeId = existing?.departmentHeadId ?? sec.departmentHeadEmployeeId
              }
              
              if (employeeId != null) {
                values[step.id] = String(employeeId)
              }
            }
          } else {
            for (const step of approvalSteps) {
              const norm = step.label.toLowerCase().replace(/[^a-z]/g, '')
              if (norm.includes('quality') || norm.includes('qmo')) {
                values[step.id] = '1181'
              } else if (norm.includes('cpi')) {
                values[step.id] = '944'
              } else if (norm.includes('pjo') || norm.includes('hse') || norm.includes('headlokasi') || norm.includes('atasanlangsung') || norm.includes('atasan') || norm.includes('admin')) {
                values[step.id] = resolvePjoOrAtasan(site.id.toString())
              } else {
                values[step.id] = firstSite?.values[step.id] ?? ''
              }
            }
          }
          newRows.push({
            key: `site-bulk-${index++}-${site.id}-${sec?.id ?? 'all'}`,
            siteId: site.id.toString(),
            departmentId: '',
            values,
          })
        }
      }
      setSiteData((prev) => [...prev, ...newRows])
      setPendingSiteId('')
      return
    }

    const site = allSites.find((s) => s.id.toString() === pendingSiteId)
    const values: Record<string, string> = {}
    for (const step of approvalSteps) {
      const norm = step.label.toLowerCase().replace(/[^a-z]/g, '')
      if (norm.includes('quality') || norm.includes('qmo')) {
        values[step.id] = '1181'
      } else if (norm.includes('cpi')) {
        values[step.id] = '944'
      } else if (norm.includes('pjo') || norm.includes('hse') || norm.includes('headlokasi') || norm.includes('atasanlangsung') || norm.includes('atasan') || norm.includes('admin')) {
        values[step.id] = resolvePjoOrAtasan(pendingSiteId)
      } else {
        values[step.id] = firstSite?.values[step.id] ?? ''
      }
    }
    setSiteData((prev) => [...prev, { key: `site-${Date.now()}`, siteId: pendingSiteId, departmentId: '', values }])
    setPendingSiteId('')
  }

  function removeSiteRow(key: string) {
    setSiteData((prev) => prev.filter((s) => s.key !== key))
  }

  function updateSiteValue(siteKey: string, stepId: string, employeeId: string) {
    setSiteData((prev) =>
      prev.map((site) =>
        site.key === siteKey ? { ...site, values: { ...site.values, [stepId]: employeeId } } : site
      )
    )
  }

  function fillDownColumn(stepId: string) {
    const firstValue = siteData[0]?.values[stepId] ?? ''
    setSiteData((prev) =>
      prev.map((site) => ({ ...site, values: { ...site.values, [stepId]: firstValue } }))
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9">
            <Plus className="size-4" /> Buat Approval
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Approval Workflow</DialogTitle>
          <DialogDescription>
            Definisikan langkah approval, lalu atur siapa yang approve per site.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {initial?.matrixId ? <input type="hidden" name="matrixId" value={initial.matrixId} /> : null}
          <input type="hidden" name="templateKey" value={selectedMenu?.templateKey ?? ''} />
          <input type="hidden" name="transactionType" value={selectedMenu?.transactionType ?? ''} />
          <input type="hidden" name="approvalSteps" value={JSON.stringify(approvalSteps)} />
          <input type="hidden" name="siteApprovals" value={JSON.stringify(siteData)} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Pilih Form dari Menu
              <select
                name="menuKey"
                value={selectedMenuKey}
                onChange={(event) => {
                  const newKey = event.target.value
                  setSelectedMenuKey(newKey)
                  if (!initial) {
                    if (newKey.toLowerCase().includes('wo')) {
                      if (newKey.toLowerCase().includes('service')) {
                        setApprovalSteps(formWoServiceDefaults)
                      } else {
                        setApprovalSteps(formWoRepairDefaults)
                      }
                    } else if (newKey.toLowerCase().includes('rfr')) {
                      setApprovalSteps(rfrDefaults)
                    } else if (newKey.toLowerCase().includes('5r') || newKey.toLowerCase().includes('five-r')) {
                      setApprovalSteps(fiveRDefaults)
                      const autoRows: any[] = []
                      let rIndex = 0
                      const areasToUse = fiveRAreas.length > 0 ? fiveRAreas : []
                      if (areasToUse.length > 0) {
                        for (const area of areasToUse) {
                          const areaSiteId = area.siteId ? area.siteId.toString() : '126'
                          let approverStep1 = '955'
                          const lowerName = (area.name || '').toLowerCase()
                          if (lowerName.includes('workshop') || lowerName.includes('repair')) {
                            approverStep1 = areaSiteId === '126' ? '996' : (SITE_APPROVER_MAP[areaSiteId] ?? '996')
                          } else if (lowerName.includes('warehouse') || lowerName.includes('supply chain')) {
                            approverStep1 = areaSiteId === '126' ? '979' : (SITE_APPROVER_MAP[areaSiteId] ?? '979')
                          } else if (lowerName.includes('office') || lowerName.includes('hr') || lowerName.includes('ga')) {
                            approverStep1 = areaSiteId === '126' ? '970' : (SITE_APPROVER_MAP[areaSiteId] ?? '970')
                          } else if (lowerName.includes('safety') || lowerName.includes('hse')) {
                            approverStep1 = areaSiteId === '126' ? '1164' : (SITE_APPROVER_MAP[areaSiteId] ?? '1164')
                          } else if (lowerName.includes('service')) {
                            approverStep1 = areaSiteId === '126' ? '955' : (SITE_APPROVER_MAP[areaSiteId] ?? '955')
                          } else {
                            approverStep1 = SITE_APPROVER_MAP[areaSiteId] ?? '955'
                          }

                          autoRows.push({
                            key: `site-5r-${rIndex++}-${areaSiteId}-${area.id}`,
                            siteId: areaSiteId,
                            departmentId: '',
                            values: {
                              'step-0': area.id.toString(),
                              'step-1': approverStep1,
                              'step-2': '944',
                            },
                          })
                        }
                      }
                      setSiteData(autoRows)
                    } else if (newKey.toLowerCase().includes('material') || newKey.toLowerCase().includes('tools')) {
                      setApprovalSteps(materialToolsDefaults)
                      const autoRows = allSites.map((site, index) => ({
                        key: `site-mat-${index}-${site.id}`,
                        siteId: site.id.toString(),
                        departmentId: '',
                        values: {
                          'step-0': '29', // Default Repair / Retread Operation
                          'step-1': resolvePjoOrAtasan(site.id.toString(), '29'),
                          'step-2': '996', // Ary Maulana - Repair Retread Operation SPV
                        },
                      }))
                      setSiteData(autoRows)
                    } else if (newKey.toLowerCase().includes('apd')) {
                      setApprovalSteps(apdDefaults)
                      const autoRows = allSites.map((site, index) => ({
                        key: `site-apd-${index}-${site.id}`,
                        siteId: site.id.toString(),
                        departmentId: '',
                        values: {
                          'step-0': '29', // Default Repair / Retread Operation
                          'step-1': resolvePjoOrAtasan(site.id.toString(), '29'),
                        },
                      }))
                      setSiteData(autoRows)
                    } else {
                      setApprovalSteps(generalDefaults)
                    }
                  }
                }}
                className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm"
                required
              >
                {data.builderOptions.menus.map((menu) => (
                  <option key={menu.key} value={menu.key}>
                    {menu.label} - {menu.pageTitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Nama Aktivitas
              <Input name="activityName" defaultValue={initial?.name ?? selectedMenu?.label ?? ''} required />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Mode
              <select name="mode" defaultValue={initial?.mode ?? 'sequential'} className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm">
                <option value="sequential">Sequential</option>
                <option value="parallel_all">Parallel All</option>
                <option value="parallel_any">Parallel Any</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Effective From
              <Input name="effectiveFrom" type="datetime-local" value={formEffectiveFrom} onChange={(e) => setFormEffectiveFrom(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Effective To
              <Input name="effectiveTo" type="datetime-local" value={formEffectiveTo} onChange={(e) => setFormEffectiveTo(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Status
              <select name="isActive" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm">
                <option value="true">Active</option>
                <option value="false">Nonactive</option>
              </select>
            </label>
          </div>

          <section className="rounded-lg border bg-white p-3 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">Langkah Approval</h3>
                <Button type="button" size="sm" variant="outline" onClick={addStep} className="h-8 px-2 text-xs">
                  <Plus className="size-3" /> Tambah Langkah
                </Button>
              </div>
              <p className="text-muted-foreground mb-2 text-xs">Atur urutan langkah approval. Isi nama kolom, lalu geser posisi dengan panah. Urutan ini berlaku untuk semua site.</p>
              {approvalSteps.some((s) => s.type !== 'section') ? (
                <div className="space-y-1.5">
                  {approvalSteps
                    .filter((s) => s.type !== 'section')
                    .map((step, idx) => {
                      const realIdx = approvalSteps.findIndex((s) => s.id === step.id)
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs font-medium text-muted-foreground">{idx + 1}.</span>
                          <Input
                            placeholder="Nama langkah (misal: HSE Team, Safety Officer)"
                            value={step.label}
                            onChange={(e) => updateStepLabel(step.id, e.target.value)}
                            className="h-8 flex-1 text-xs"
                            readOnly={isMaterialOrToolsMenu() && step.label === 'Head Section'}
                          />
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, -1)} disabled={realIdx <= 1 || (isMaterialOrToolsMenu() && step.label === 'Head Section')} className="h-7 w-7 p-0">
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, 1)} disabled={realIdx === approvalSteps.length - 1 || (isMaterialOrToolsMenu() && step.label === 'Head Section')} className="h-7 w-7 p-0">
                            <ArrowDown className="size-3" />
                          </Button>
                          <button type="button" onClick={() => removeStep(step.id)} disabled={isMaterialOrToolsMenu() && step.label === 'Head Section'} className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">Klik "Tambah Langkah" untuk menambah kolom approval baru.</p>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{isRfrMenu ? 'Pengaturan per Departemen' : 'Pengaturan per Site'}</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={pendingSiteId}
                    onChange={(e) => setPendingSiteId(e.target.value)}
                    className="border-border/70 bg-muted/30 h-8 rounded-lg border px-2 text-sm"
                  >
                    <option value="">{isRfrMenu ? 'Pilih departemen...' : 'Pilih site...'}</option>
                    {isRfrMenu ? (
                      allDepartments.filter((d) => !usedDeptIds.has(d.id.toString())).map((dept) => (
                        <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                      ))
                    ) : (
                      <>
                        {availableSites.length > 0 && (
                          <option value="all">-- Tambahkan Semua Site --</option>
                        )}
                        {availableSites.map((site) => (
                          <option key={site.id} value={site.id.toString()}>{site.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={addSite} disabled={!pendingSiteId} className="h-8 px-2">
                    <Plus className="size-3" /> Tambah
                  </Button>
                </div>
              </div>

              {siteData.length > 0 && approvalSteps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="pb-2 pr-3">{isRfrMenu ? 'Departemen' : 'Site'}</th>
                        {approvalSteps.map((step) => (
                          <th key={step.id} className="pb-2 pr-3">
                            <div className="flex items-center gap-1">
                              <span>{step.label || '(Kosong)'}</span>
                              {siteData.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => fillDownColumn(step.id)}
                                  title="Isi semua dari baris pertama"
                                  className="text-muted-foreground hover:text-foreground ml-1 inline-flex items-center rounded border px-1 py-0.5 text-[10px] leading-none"
                                >
                                  ↓ Isi
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteData.map((siteRow) => {
                        const siteDisplayName = isRfrMenu
                          ? (allDepartments.find((d) => d.id.toString() === siteRow.departmentId)?.name ?? siteRow.departmentId)
                          : (siteRow.siteId === '0' ? 'Semua Site (Global)' : (allSites.find((s) => s.id.toString() === siteRow.siteId)?.name ?? siteRow.siteId))
                        const isFiveRMenu = (selectedMenuKey || initial?.templateKey || '').toLowerCase().includes('5r')
                        return (
                          <tr key={siteRow.key} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium whitespace-nowrap">{siteDisplayName}</td>
                            {approvalSteps.map((step) => (
                              <td key={step.id} className="py-2 pr-3 min-w-[180px]">
                                <SearchableSelect
                                  value={siteRow.values[step.id] ?? ''}
                                  placeholder={step.type === 'section' ? (isFiveRMenu ? 'Pilih master area 5R...' : 'Pilih section...') : 'Kosong'}
                                  searchPlaceholder={step.type === 'section' ? (isFiveRMenu ? 'Cari master area 5R...' : 'Cari section...') : 'Cari karyawan...'}
                                  onChange={(v) => {
                                    if (step.type === 'section' && v) {
                                      if (isFiveRMenu) {
                                        const area = fiveRAreas.find((a) => a.id.toString() === v)
                                        const areaSiteId = area?.siteId ? area.siteId.toString() : siteRow.siteId
                                        let approverStep1 = '955'
                                        const lowerName = (area?.name || '').toLowerCase()
                                        if (lowerName.includes('workshop') || lowerName.includes('repair')) {
                                          approverStep1 = areaSiteId === '126' ? '996' : (SITE_APPROVER_MAP[areaSiteId] ?? '996')
                                        } else if (lowerName.includes('warehouse') || lowerName.includes('supply chain')) {
                                          approverStep1 = areaSiteId === '126' ? '979' : (SITE_APPROVER_MAP[areaSiteId] ?? '979')
                                        } else if (lowerName.includes('office') || lowerName.includes('hr') || lowerName.includes('ga')) {
                                          approverStep1 = areaSiteId === '126' ? '970' : (SITE_APPROVER_MAP[areaSiteId] ?? '970')
                                        } else if (lowerName.includes('safety') || lowerName.includes('hse')) {
                                          approverStep1 = areaSiteId === '126' ? '1164' : (SITE_APPROVER_MAP[areaSiteId] ?? '1164')
                                        } else if (lowerName.includes('service')) {
                                          approverStep1 = areaSiteId === '126' ? '955' : (SITE_APPROVER_MAP[areaSiteId] ?? '955')
                                        } else {
                                          approverStep1 = SITE_APPROVER_MAP[areaSiteId] ?? '955'
                                        }

                                        setSiteData((prev) =>
                                          prev.map((site) => {
                                            if (site.key !== siteRow.key) return site
                                            return {
                                              ...site,
                                              siteId: areaSiteId,
                                              values: {
                                                ...site.values,
                                                [step.id]: v,
                                                'step-1': approverStep1,
                                                'step-2': '944',
                                              },
                                            }
                                          })
                                        )
                                      } else {
                                        const sec = csSections.find((s) => s.id.toString() === v)
                                        const existing =
                                          data.builderOptions.siteSectionApprovers?.[`${siteRow.siteId}_${v}`]
                                        setSiteData((prev) =>
                                          prev.map((site) => {
                                            if (site.key !== siteRow.key) return site
                                            const newValues = { ...site.values, [step.id]: v }
                                            for (const s of approvalSteps) {
                                              if (s.type === 'section' || s.id === step.id) continue
                                              const norm = s.label
                                                .toLowerCase()
                                                .replace(/[^a-z]/g, '')
                                              let employeeId: number | null = null
                                              if (norm.includes('leader')) {
                                                employeeId = existing?.leaderId ?? sec?.leaderEmployeeId ?? null
                                              } else if (norm.includes('pjo') || norm.includes('hse') || norm.includes('atasan') || norm.includes('admin') || norm.includes('headlokasi')) {
                                                employeeId = existing?.pjoId ?? (SITE_APPROVER_MAP[siteRow.siteId] ? Number(SITE_APPROVER_MAP[siteRow.siteId]) : null) ?? sec?.pjoEmployeeId ?? null
                                              } else if (norm.includes('sectionhead') || norm.includes('headsection') || (norm.includes('section') && !norm.includes('service'))) {
                                                employeeId =
                                                  existing?.sectionHeadId ??
                                                  (SECTION_HEAD_BY_SEC_ID[v] ? Number(SECTION_HEAD_BY_SEC_ID[v]) : sec?.headEmployeeId ?? sec?.sectionHeadEmployeeId ?? null)
                                              } else if (norm.includes('departmenthead')) {
                                                employeeId =
                                                  existing?.departmentHeadId ?? sec?.departmentHeadEmployeeId ?? null
                                              }
                                              if (employeeId != null) {
                                                newValues[s.id] = String(employeeId)
                                              }
                                            }
                                            return { ...site, values: newValues }
                                          })
                                        )
                                      }
                                    } else {
                                      updateSiteValue(siteRow.key, step.id, v)
                                    }
                                  }}
                                  options={
                                    step.type === 'section'
                                      ? (isFiveRMenu && fiveRAreas.length > 0
                                          ? fiveRAreas.map((a) => ({ id: a.id, name: a.name }))
                                          : csSections)
                                      : employeeOptions
                                  }
                                />
                              </td>
                            ))}
                            <td className="py-2">
                              <button type="button" onClick={() => removeSiteRow(siteRow.key)} className="text-muted-foreground hover:text-destructive">
                                <X className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  {approvalSteps.length === 0 ? 'Tambahkan langkah approval terlebih dahulu.' : 'Pilih site untuk menambahkan approval configuration.'}
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-2">
            <div>
              <h3 className="font-display text-base font-semibold">Setting Template Email</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Template otomatis dibuat untuk submitted, approved, returned/rejected, reminder, dan overdue.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Reminder sebelum due (jam)
                <Input name="beforeDueHours" type="number" min={1} max={240} defaultValue={2} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Overdue offset (jam)
                <Input name="overdueHours" type="number" min={0} max={240} defaultValue={0} />
              </label>
            </div>
          </section>

          <label className="block space-y-1.5 text-sm font-medium">
            Catatan
            <Textarea name="notes" defaultValue={initial?.notes ?? ''} placeholder="Catatan maintenance workflow..." />
          </label>

          {state.message ? (
            <p className={state.status === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : initial?.matrixId ? 'Update Workflow' : 'Simpan Workflow'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function WorkflowStudioOverview({ data }: { data: WorkflowStudioData }) {
  const sourceOptions = useMemo(
    () => Array.from(new Set(data.inventory.map((item) => item.sourceType))),
    [data.inventory]
  )

  return (
    <AdminPageShell
      eyebrow="Approval Operations"
      title="Workflow Studio"
      description="Pusat maintenance approval: workflow, matrix, email template, reminder, dan monitoring request pending."
    >
      <AdminMetricGrid
        items={[
          { label: 'Workflow', value: `${data.metrics.workflows}`, meta: 'Inventory approval yang terlihat' },
          { label: 'Active', value: `${data.metrics.active}`, meta: 'Workflow/matrix aktif' },
          { label: 'Pending', value: `${data.metrics.pending}`, meta: 'Request masih berjalan' },
          { label: 'Complete', value: `${data.metrics.complete}`, meta: 'Request selesai' },
          { label: 'Cancel', value: `${data.metrics.cancel}`, meta: 'Reject/cancel/expired' },
          { label: 'Overdue', value: `${data.metrics.overdue}`, meta: 'Pending melewati due' },
        ]}
      />

      <Tabs defaultValue="workflows" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="workflows">Workflow List</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring Approval</TabsTrigger>
            <TabsTrigger value="email">Template Email</TabsTrigger>
            <TabsTrigger value="reminders">Reminder Jobs</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <WorkflowBuilderDialog data={data} />
        </div>

        <TabsContent value="workflows">
          <MinimalTableShell
            label="workflow"
            title="Workflow List"
            searchPlaceholder="Cari aktivitas atau halaman..."
            showImport={false}
            filters={
              <>
                <FilterSelect label="Status" filterKey="status" options={['Active', 'Nonactive']} />
                <FilterSelect label="Source" filterKey="source" options={sourceOptions} />
              </>
            }
            columnOptions={[
              { key: 'Nama Aktivitas', label: 'Nama Aktivitas', required: true },
              { key: 'Tanggal Update', label: 'Tanggal Update' },
              { key: 'Dari Halaman Apa', label: 'Dari Halaman Apa' },
              { key: 'Pending', label: 'Pending' },
              { key: 'Complete', label: 'Complete' },
              { key: 'Cancel', label: 'Cancel' },
              { key: 'Status', label: 'Status' },
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Aktivitas</TableHead>
                  <TableHead>Tanggal Update</TableHead>
                  <TableHead>Dari Halaman Apa</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Complete</TableHead>
                  <TableHead>Cancel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inventory.map((item) => (
                  <TableRow
                    key={item.id}
                    data-filter-status={item.status.toLowerCase()}
                    data-filter-source={item.sourceType.toLowerCase()}
                    data-date-value={item.updatedAt}
                  >
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {item.sourceType} {item.duplicateActiveCount > 1 ? `- duplicate ${item.duplicateActiveCount}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell>
                      <Link className="inline-flex items-center gap-1 text-primary hover:underline" href={item.pageUrl}>
                        {item.pageTitle} <ExternalLink className="size-3" />
                      </Link>
                    </TableCell>
                    <TableCell>{item.pending}</TableCell>
                    <TableCell>{item.complete}</TableCell>
                    <TableCell>{item.cancel}</TableCell>
                    <TableCell>
                      <StatusDropdown templateKey={item.templateKey} transactionType={item.transactionType} currentStatus={item.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.stepCount} step</Badge>
                        <WorkflowBuilderDialog
                          data={data}
                          initial={item}
                          trigger={<Button size="sm" variant="outline">Edit</Button>}
                        />
                        <DeleteWorkflowButton
                          templateKey={item.templateKey}
                          transactionType={item.transactionType}
                          name={item.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="monitoring">
          <MinimalTableShell label="approval" title="Monitoring Approval" searchPlaceholder="Cari request, requester, approver..." showImport={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Pending With</TableHead>
                  <TableHead>Pending Since</TableHead>
                  <TableHead>Pending Duration</TableHead>
                  <TableHead>Due At</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monitoring.map((item) => (
                  <TableRow key={item.id} data-date-value={item.pendingSince}>
                    <TableCell className="font-medium">{item.requestId}</TableCell>
                    <TableCell>{item.requester}</TableCell>
                    <TableCell>{item.site}</TableCell>
                    <TableCell><AdminStatusBadge value={item.status} /></TableCell>
                    <TableCell>{item.currentStep}</TableCell>
                    <TableCell>{item.pendingWith}</TableCell>
                    <TableCell>{formatDate(item.pendingSince)}</TableCell>
                    <TableCell>{item.pendingDuration}</TableCell>
                    <TableCell>{formatDate(item.dueAt)}</TableCell>
                    <TableCell><AdminStatusBadge value={item.slaStatus} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline"><Link href="/dashboard/approval">Open</Link></Button>
                        <Button size="sm" variant="secondary" type="button">Timeline</Button>
                        <form action={async (formData) => { await markWorkflowStudioInvestigatedAction(formData) }}>
                          <input type="hidden" name="submissionId" value={item.id} />
                          <input type="hidden" name="requestId" value={item.requestId} />
                          <Button size="sm" variant="outline" type="submit">Investigated</Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="email">
          <MinimalTableShell label="template email" title="Template Email" searchPlaceholder="Cari template email..." showImport={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Code</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.emailTemplates.map((template) => (
                  <TableRow key={template.id} data-date-value={template.updatedAt}>
                    <TableCell className="font-medium">{template.templateCode}</TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell><AdminStatusBadge value={template.isActive ? 'Active' : 'Nonactive'} /></TableCell>
                    <TableCell>{formatDate(template.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="reminders">
          <MinimalTableShell label="reminder" title="Reminder Jobs" searchPlaceholder="Cari reminder..." showImport={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reminder</TableHead>
                  <TableHead>Inbox</TableHead>
                  <TableHead>Reminder At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Log</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reminderJobs.map((job) => (
                  <TableRow key={job.id} data-date-value={job.reminderAt}>
                    <TableCell className="font-medium">{job.reminderType}</TableCell>
                    <TableCell>{job.inboxItemId}</TableCell>
                    <TableCell>{formatDate(job.reminderAt)}</TableCell>
                    <TableCell><AdminStatusBadge value={job.status} /></TableCell>
                    <TableCell className="max-w-[360px] truncate">{job.executionLog || '-'}</TableCell>
                    <TableCell>
                      <form action={async (formData) => { await resendWorkflowStudioReminderAction(formData) }}>
                        <input type="hidden" name="reminderJobId" value={job.id} />
                        <Button size="sm" variant="outline" type="submit">
                          <Bell className="size-4" /> Resend
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="audit">
          <MinimalTableShell label="audit" title="Audit" searchPlaceholder="Cari audit..." showImport={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.audit.map((item) => (
                  <TableRow key={item.id} data-date-value={item.createdAt}>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="font-medium">{item.action}</TableCell>
                    <TableCell>{item.entityType}: {item.entityLabel}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell><AdminStatusBadge value={item.severity} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}
