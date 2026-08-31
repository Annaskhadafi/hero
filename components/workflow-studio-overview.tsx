'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useActionState, useMemo, useState, useTransition, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell, ExternalLink, Plus, X, ArrowUp, ArrowDown, Pencil, Copy, Trash2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'

import {
  deleteWorkflowStudioWorkflowAction,
  markWorkflowStudioInvestigatedAction,
  saveWorkflowStudioApprovalAction,
  resendWorkflowStudioReminderAction,
  toggleWorkflowStatusAction,
  saveWorkflowStudioPresetAction,
  deleteWorkflowStudioPresetAction,
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
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/5" title="Hapus">
          <Trash2 className="size-4" />
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

type SearchableOption = { id: number; name: string; jobTitle?: string | null; siteId?: number | null }

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

  // Catat tinggi asli popup setelah dirender untuk keputusan flip.
  useLayoutEffect(() => {
    if (open && popupRef.current) popupHeightRef.current = popupRef.current.offsetHeight
  }, [open, popupPos])

  // Posisi popup dihitung dari tombol, dirender lewat portal ke body supaya
  // tidak terpotong oleh container tabel yang overflow-x-auto. Kalau ruang di
  // bawah tidak cukup, popup dibalik ke atas; selalu dikunci di dalam viewport.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const button = ref.current?.querySelector('button')
    if (!button) return
    const update = () => {
      const rect = button.getBoundingClientRect()
      const margin = 8
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = rect.width
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
  const filtered = query
    ? options.filter((o) => `${o.name} ${o.jobTitle ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : options

  const popup = open && popupPos ? (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: popupPos.top,
        left: popupPos.left,
        width: popupPos.width,
        maxHeight: popupPos.maxHeight,
      }}
      className="pointer-events-auto z-[60] flex flex-col overflow-hidden rounded-md border bg-white shadow-lg"
    >
      <input
        type="text"
        placeholder={searchPlaceholder ?? 'Cari karyawan...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border-border/70 h-8 w-full shrink-0 border-b px-2 text-xs outline-none"
        autoFocus
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); setQuery('') }}
          className="text-muted-foreground hover:bg-muted h-7 w-full px-2 text-left text-xs"
        >
          Kosong
        </button>
        {filtered.map((emp) => (
          <button
            key={emp.id}
            type="button"
            onClick={() => { onChange(emp.id.toString()); setOpen(false); setQuery('') }}
            className={`hover:bg-muted h-7 w-full px-2 text-left text-xs ${value === emp.id.toString() ? 'bg-primary/10 font-medium' : ''}`}
          >
            {emp.name}{emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
          </button>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="border-border/70 bg-muted/30 h-8 w-full rounded-md border px-2 text-left text-xs truncate"
      >
        {selected ? `${selected.name}${selected.jobTitle ? ` - ${selected.jobTitle}` : ''}` : (placeholder ?? 'Kosong')}
      </button>
      {typeof document !== 'undefined' ? createPortal(popup, document.body) : null}
    </div>
  )
}

function WorkflowBuilderDialog({
  data,
  initial,
  trigger,
  isClone,
}: {
  data: WorkflowStudioData
  initial?: WorkflowInventoryItem
  trigger?: ReactNode
  isClone?: boolean
}) {
  const [state, formAction, isPending] = useActionState(saveWorkflowStudioApprovalAction, actionInitialState)
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>(initial?.id ?? data.builderOptions.menus[0]?.key ?? '')
  const selectedMenu =
    data.builderOptions.menus.find((menu) => menu.key === selectedMenuKey) ?? data.builderOptions.menus[0]
  const employeeOptions = data.builderOptions.employees
  const allSites = data.builderOptions.sites
  const csSections = data.builderOptions.csSections ?? []

  const csEmployees = useMemo(
    () => employeeOptions.filter((e) => {
      const dept = (e.department ?? '').toLowerCase()
      return dept === 'central services' || dept === 'central service' || dept === 'central services'
    }),
    [employeeOptions]
  )

  type ApprovalStep = { id: string; label: string; type: 'section' | 'employee' }
  type SiteData = { key: string; siteId: string; values: Record<string, string> }

  const WORKFLOW_PRESETS = [
    {
      key: "single-supervisor",
      name: "Single Approval (Direct Supervisor)",
      steps: [
        { id: "step-0", label: "Section", type: "section" as const },
        { id: "step-1", label: "Direct Supervisor", type: "employee" as const, virtualEmployeeId: "990001" }
      ]
    },
    {
      key: "two-level-hierarchical",
      name: "2-Level Hierarchical Approval",
      steps: [
        { id: "step-0", label: "Section", type: "section" as const },
        { id: "step-1", label: "Direct Supervisor", type: "employee" as const, virtualEmployeeId: "990001" },
        { id: "step-2", label: "Department Head", type: "employee" as const, virtualEmployeeId: "990002" }
      ]
    },
    {
      key: "safety-site-flow",
      name: "Site & Safety Flow",
      steps: [
        { id: "step-0", label: "Section", type: "section" as const },
        { id: "step-1", label: "Direct Supervisor", type: "employee" as const, virtualEmployeeId: "990001" },
        { id: "step-2", label: "Site Head", type: "employee" as const, virtualEmployeeId: "990004" },
        { id: "step-3", label: "Safety Team", type: "employee" as const }
      ]
    }
  ]

  function handleLoadPreset(presetKey: string) {
    if (!presetKey) return
    const preset = WORKFLOW_PRESETS.find(p => p.key === presetKey)
    if (!preset) return

    const newSteps = preset.steps.map(s => ({
      id: s.id,
      label: s.label,
      type: s.type
    }))
    setApprovalSteps(newSteps)

    setSiteData(() => {
      return allSites.map((site, i) => {
        const values: Record<string, string> = {}
        for (const s of preset.steps) {
          if ((s as any).virtualEmployeeId) {
            values[s.id] = (s as any).virtualEmployeeId
          } else {
            values[s.id] = ""
          }
        }
        return { key: `site-${i}`, siteId: site.id.toString(), values }
      })
    })
  }

  function isSectionStep(label: string) {
    const norm = label.toLowerCase().replace(/[^a-z]/g, '')
    return norm === 'section'
  }

  // Section selalu menjadi langkah pertama secara default di setiap aktivitas —
  // tidak perlu ditambahkan manual di "Langkah Approval".
  function buildInitialSteps(): ApprovalStep[] {
    const defaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'Leader', type: 'employee' },
      { id: 'step-2', label: 'PJO (Head Lokasi)', type: 'employee' },
      { id: 'step-3', label: 'Section Head', type: 'employee' },
      { id: 'step-4', label: 'Department Head', type: 'employee' },
    ]
    if (!initial?.globalSteps || initial.globalSteps.length === 0) return defaults
    // Workflow lama mungkin belum punya langkah Section — sisipkan di depan,
    // dan buang langkah Section lama agar tidak dobel.
    const existing = initial.globalSteps
      .filter((gs) => !isSectionStep(gs.label ?? ''))
      .map((gs, i) => ({
        id: `step-${i + 1}`,
        label: gs.label ?? '',
        type: (isSectionStep(gs.label ?? '') ? 'section' : 'employee') as 'section' | 'employee',
      }))
    return [{ id: 'step-0', label: 'Section', type: 'section' as const }, ...existing]
  }

  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(buildInitialSteps)

  const [siteData, setSiteData] = useState<SiteData[]>(() => {
    const steps = buildInitialSteps()

    const labelToStepId: Record<string, string> = {}
    for (const s of steps) {
      const norm = s.label.toLowerCase().replace(/[^a-z]/g, '')
      if (norm === 'leader') labelToStepId['leader'] = s.id
      if (norm.includes('pjo') || norm.includes('headlokasi')) labelToStepId['pjo'] = s.id
      if (norm === 'sectionhead') labelToStepId['sectionHead'] = s.id
      else if (norm === 'section') labelToStepId['section'] = s.id
      if (norm === 'departmenthead') labelToStepId['department'] = s.id
    }

    if (initial?.siteApprovals && initial.siteApprovals.length > 0) {
      return initial.siteApprovals.map((sa, i) => {
        const values: Record<string, string> = {}
        if (sa.sectionId != null && labelToStepId['section']) values[labelToStepId['section']] = String(sa.sectionId)
        if (sa.leaderId != null && labelToStepId['leader']) values[labelToStepId['leader']] = String(sa.leaderId)
        if (sa.pjoId != null && labelToStepId['pjo']) values[labelToStepId['pjo']] = String(sa.pjoId)
        if (sa.sectionHeadId != null && labelToStepId['sectionHead']) values[labelToStepId['sectionHead']] = String(sa.sectionHeadId)
        if (sa.departmentHeadId != null && labelToStepId['department']) values[labelToStepId['department']] = String(sa.departmentHeadId)
        return { key: `site-${i}`, siteId: sa.siteId?.toString() ?? '', values }
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
  const availableSites = allSites.filter((site) => !usedSiteIds.has(site.id.toString()))

  function addStep() {
    setApprovalSteps((prev) => [...prev, { id: `step-${Date.now()}`, label: '', type: 'employee' }])
  }

  function removeStep(id: string) {
    // Langkah Section adalah default yang selalu ada — tidak bisa dihapus.
    setApprovalSteps((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target?.type === 'section') return prev
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
    const site = allSites.find((s) => s.id.toString() === pendingSiteId)
    const pjoStepId = approvalSteps.find((s) => s.label.toLowerCase().includes('pjo'))?.id
    const values: Record<string, string> = {}
    for (const step of approvalSteps) {
      values[step.id] = firstSite?.values[step.id] ?? ''
    }
    if (pjoStepId && site?.headEmployeeId) {
      values[pjoStepId] = site.headEmployeeId.toString()
    }
    setSiteData((prev) => [...prev, { key: `site-${Date.now()}`, siteId: pendingSiteId, values }])
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
          {initial?.matrixId && !isClone ? <input type="hidden" name="matrixId" value={initial.matrixId} /> : null}
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
                onChange={(event) => setSelectedMenuKey(event.target.value)}
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
            <label className="space-y-1.5 text-sm font-medium text-primary">
              Load Workflow Preset (Template Instan)
              <select
                onChange={(event) => handleLoadPreset(event.target.value)}
                defaultValue=""
                className="border-primary/50 bg-primary/5 text-primary h-11 w-full rounded-lg border px-3 text-sm font-semibold outline-none"
              >
                <option value="">-- Buat Custom / Alur Kosong --</option>
                {WORKFLOW_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Nama Aktivitas
              <Input name="activityName" defaultValue={initial?.name ? (isClone ? `${initial.name} - Salinan` : initial.name) : (selectedMenu?.label ?? '')} required />
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
                          />
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, -1)} disabled={realIdx <= 1} className="h-7 w-7 p-0">
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, 1)} disabled={realIdx === approvalSteps.length - 1} className="h-7 w-7 p-0">
                            <ArrowDown className="size-3" />
                          </Button>
                          <button type="button" onClick={() => removeStep(step.id)} className="text-muted-foreground hover:text-destructive">
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
                <h3 className="font-display text-base font-semibold">Pengaturan per Site</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={pendingSiteId}
                    onChange={(e) => setPendingSiteId(e.target.value)}
                    className="border-border/70 bg-muted/30 h-8 rounded-lg border px-2 text-sm"
                  >
                    <option value="">Pilih site...</option>
                    {availableSites.map((site) => (
                      <option key={site.id} value={site.id.toString()}>{site.name}</option>
                    ))}
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
                        <th className="pb-2 pr-3">Site</th>
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
                        const site = allSites.find((s) => s.id.toString() === siteRow.siteId)
                        return (
                          <tr key={siteRow.key} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium whitespace-nowrap">{site?.name ?? siteRow.siteId}</td>
                            {approvalSteps.map((step) => (
                              <td key={step.id} className="py-2 pr-3 min-w-[180px]">
                                <SearchableSelect
                                  value={siteRow.values[step.id] ?? ''}
                                  placeholder={step.type === 'section' ? 'Pilih section...' : 'Kosong'}
                                  searchPlaceholder={step.type === 'section' ? 'Cari section...' : 'Cari karyawan...'}
                                  onChange={(v) => {
                                    if (step.type === 'section' && v) {
                                      const sec = csSections.find((s) => s.id.toString() === v)
                                      const existing =
                                        data.builderOptions.siteSectionApprovers?.[`${siteRow.siteId}_${v}`]
                                      setSiteData((prev) =>
                                        prev.map((site) => {
                                          if (site.key !== siteRow.key) return site
                                          const newValues = { ...site.values, [step.id]: v }
                                          // Auto-fill semua kolom approver mengikuti section yang dipilih:
                                          // prioritas approver matrix (site, section) yang sudah ada, lalu default section.
                                          for (const s of approvalSteps) {
                                            if (s.type === 'section' || s.id === step.id) continue
                                            const norm = s.label
                                              .toLowerCase()
                                              .replace(/[^a-z]/g, '')
                                            let employeeId: number | null = null
                                            if (norm === 'leader') {
                                              employeeId = existing?.leaderId ?? sec?.leaderEmployeeId ?? null
                                            } else if (norm.includes('pjo') || norm.includes('headlokasi')) {
                                              employeeId = existing?.pjoId ?? sec?.pjoEmployeeId ?? null
                                            } else if (norm === 'sectionhead') {
                                              employeeId =
                                                existing?.sectionHeadId ?? sec?.sectionHeadEmployeeId ?? null
                                            } else if (norm === 'departmenthead') {
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
                                    } else {
                                      updateSiteValue(siteRow.key, step.id, v)
                                    }
                                  }}
                                  options={
                                    step.type === 'section'
                                      ? csSections
                                      : (step.label.toLowerCase().includes('leader') || step.label.toLowerCase().includes('pjo'))
                                        ? csEmployees
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

function PresetBuilderDialog({
  initial,
  trigger,
}: {
  initial?: any
  trigger?: ReactNode
}) {
  const [state, formAction, isPending] = useActionState(saveWorkflowStudioPresetAction, actionInitialState)
  const [steps, setSteps] = useState<Array<{ id: string; label: string; type: string; virtualEmployeeId?: string }>>(() => {
    if (initial?.stepsJson) {
      return typeof initial.stepsJson === 'string' ? JSON.parse(initial.stepsJson) : initial.stepsJson
    }
    return [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'Direct Supervisor', type: 'employee', virtualEmployeeId: '990001' }
    ]
  })

  function addStep() {
    setSteps(prev => [...prev, { id: `step-${Date.now()}`, label: '', type: 'employee' }])
  }

  function removeStep(id: string) {
    setSteps(prev => {
      const target = prev.find(s => s.id === id)
      if (target?.type === 'section') return prev
      return prev.filter(s => s.id !== id)
    })
  }

  function updateStepLabel(id: string, label: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, label } : s))
  }

  function updateStepVirtualId(id: string, virtualId: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, virtualEmployeeId: virtualId || undefined } : s))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-8">
            <Plus className="size-3.5 mr-1" /> Buat Preset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Preset Workflow' : 'Buat Preset Workflow Baru'}</DialogTitle>
          <DialogDescription>
            Definisikan template alur persetujuan instan yang dapat dipakai saat membuat workflow baru.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <input type="hidden" name="stepsJson" value={JSON.stringify(steps)} />

          <div className="grid gap-3 grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold">
              Preset Key (Unique Slug)
              <Input
                name="presetKey"
                placeholder="misal: single-supervisor"
                defaultValue={initial?.presetKey ?? ''}
                disabled={Boolean(initial)}
                required
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold">
              Nama Preset
              <Input
                name="name"
                placeholder="misal: Approval 1 Tingkat"
                defaultValue={initial?.name ?? ''}
                required
              />
            </label>
          </div>

          <label className="space-y-1.5 text-xs font-semibold block">
            Deskripsi Preset
            <Textarea
              name="description"
              placeholder="Jelaskan alur ini dipakai untuk kondisi apa..."
              defaultValue={initial?.description ?? ''}
              rows={2}
            />
          </label>

          <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold">Langkah-langkah Preset</h4>
              <Button type="button" size="xs" variant="outline" onClick={addStep} className="h-7 text-[10px]">
                + Tambah Step
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2 bg-white p-2 border rounded-md text-xs">
                  <span className="font-semibold text-muted-foreground w-4">{idx + 1}.</span>
                  {step.type === 'section' ? (
                    <span className="flex-1 font-semibold text-slate-700 p-1">Section (Default)</span>
                  ) : (
                    <>
                      <Input
                        placeholder="Nama langkah..."
                        value={step.label}
                        onChange={e => updateStepLabel(step.id, e.target.value)}
                        className="h-8 flex-1 text-xs"
                        required
                      />
                      <select
                        value={step.virtualEmployeeId ?? ''}
                        onChange={e => updateStepVirtualId(step.id, e.target.value)}
                        className="border bg-slate-50 h-8 rounded px-2 text-xs"
                      >
                        <option value="">Specific User (Manual Mapping)</option>
                        <option value="990001">Atasan Langsung (Direct Manager)</option>
                        <option value="990002">Kepala Departemen (Dept Head)</option>
                        <option value="990003">Kepala Seksi (Sect Head)</option>
                        <option value="990004">Kepala Site (Site Head)</option>
                      </select>
                      <button type="button" onClick={() => removeStep(step.id)} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {state?.message ? (
            <p className={state.status === 'success' ? 'text-xs text-emerald-700' : 'text-xs text-red-700'}>
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="h-9">
              {isPending ? 'Menyimpan...' : 'Simpan Preset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePresetButton({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState(deleteWorkflowStudioPresetAction, actionInitialState)
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
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/5" title="Hapus">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Preset</DialogTitle>
          <DialogDescription>
            Hapus preset <strong>{name}</strong>? Template alur ini tidak akan bisa digunakan lagi saat membuat workflow baru.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
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

function MonitoringDetailDialog({ item, trigger }: { item: any; trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Request: {item.requestId}</DialogTitle>
          <DialogDescription>
            Detail transaksi approval dan riwayat langkah (Audit Trail).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Metadata Grid */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 bg-muted/20 border p-3 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground text-xs block">Formulir</span>
              <span className="font-semibold">{item.activityName}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Pengaju (Submitter)</span>
              <span className="font-semibold">{item.requester}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Site</span>
              <span className="font-semibold">{item.site}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Status Saat Ini</span>
              <div className="mt-0.5"><AdminStatusBadge value={item.status} /></div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Pending Di</span>
              <span className="font-semibold">{item.pendingWith || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">SLA Status</span>
              <div className="mt-0.5"><AdminStatusBadge value={item.slaStatus} /></div>
            </div>
          </div>

          {/* Steps Timeline (Audit Trail) */}
          <div className="space-y-4">
            <h4 className="font-display text-sm font-semibold border-b pb-1.5">Riwayat Persetujuan (Audit Trail)</h4>
            {item.steps && item.steps.length > 0 ? (
              <div className="relative border-l pl-4 ml-2 space-y-5 py-1">
                {item.steps.map((step: any, idx: number) => {
                  const isPending = step.status === 'pending' || step.status === 'Pending';
                  const isApproved = step.status === 'approved' || step.status === 'Approved' || step.status === 'approved_final';
                  const isRejected = step.status === 'rejected' || step.status === 'Rejected';
                  const isReturned = step.status === 'needs_revision' || step.status === 'Needs Revision' || step.status === 'returned';

                  let iconColor = 'text-muted-foreground bg-slate-100';
                  let statusLabel = 'Menunggu';
                  let icon = <HelpCircle className="size-4" />;

                  if (isApproved) {
                    iconColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                    statusLabel = 'Disetujui';
                    icon = <CheckCircle2 className="size-4" />;
                  } else if (isRejected) {
                    iconColor = 'text-red-700 bg-red-50 border-red-200';
                    statusLabel = 'Ditolak';
                    icon = <X className="size-4" />;
                  } else if (isReturned) {
                    iconColor = 'text-amber-700 bg-amber-50 border-amber-200';
                    statusLabel = 'Dikembalikan (Revisi)';
                    icon = <AlertTriangle className="size-4" />;
                  } else if (isPending) {
                    iconColor = 'text-blue-700 bg-blue-50 border-blue-200 animate-pulse';
                    statusLabel = 'Sedang Ditinjau';
                    icon = <HelpCircle className="size-4" />;
                  }

                  return (
                    <div key={step.id || idx} className="relative">
                      {/* Dot Icon */}
                      <div className={`absolute -left-[25px] top-0.5 flex items-center justify-center size-5 rounded-full border text-xs ${iconColor}`}>
                        {icon}
                      </div>
                      {/* Step Details */}
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            Langkah {step.level}: {step.approverName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {step.reviewedAt ? formatDate(step.reviewedAt) : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-semibold">{statusLabel}</span>
                        </div>
                        {step.decisionNote && (
                          <div className="mt-1 bg-slate-50 border p-2 rounded text-[11px] text-slate-600 italic">
                            &ldquo;{step.decisionNote}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2 italic text-center">
                Belum ada riwayat persetujuan tercatat.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvestigatedButton({ submissionId, requestId }: { submissionId: number; requestId: string }) {
  const [state, formAction, isPending] = useActionState(markWorkflowStudioInvestigatedAction, actionInitialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="requestId" value={requestId} />
      <Button size="sm" variant="outline" type="submit" disabled={isPending} className="text-xs h-8 border-emerald-600 text-emerald-600 hover:bg-emerald-50">
        {isPending ? 'Saving...' : 'Investigated'}
      </Button>
    </form>
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
            <TabsTrigger value="presets">Workflow Presets</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring Approval</TabsTrigger>
            <TabsTrigger value="email">Template Email</TabsTrigger>
            <TabsTrigger value="reminders">Reminder Jobs</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <PresetBuilderDialog />
            <WorkflowBuilderDialog data={data} />
          </div>
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
                          trigger={
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" title="Edit">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <WorkflowBuilderDialog
                          data={data}
                          initial={item}
                          isClone={true}
                          trigger={
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" title="Duplikat">
                              <Copy className="size-4" />
                            </Button>
                          }
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

        <TabsContent value="presets">
          <MinimalTableShell
            label="preset"
            title="Workflow Presets"
            searchPlaceholder="Cari preset..."
            showImport={false}
            columnOptions={[
              { key: 'Nama Preset', label: 'Nama Preset', required: true },
              { key: 'Preset Key', label: 'Preset Key' },
              { key: 'Langkah Preset', label: 'Langkah Preset' },
              { key: 'Tipe', label: 'Tipe' },
              { key: 'Tanggal Update', label: 'Tanggal Update' },
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Preset</TableHead>
                  <TableHead>Preset Key</TableHead>
                  <TableHead>Langkah Preset</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal Update</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as any).presets?.map((preset: any) => {
                  const stepsList = typeof preset.stepsJson === 'string' ? JSON.parse(preset.stepsJson) : preset.stepsJson;
                  return (
                    <TableRow key={preset.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{preset.name}</div>
                        <div className="text-muted-foreground text-xs">{preset.description || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border">{preset.presetKey}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 items-center text-xs">
                          {stepsList.map((step: any, idx: number) => {
                            let label = step.label;
                            if (step.virtualEmployeeId) {
                              const mapping: Record<string, string> = {
                                "990001": "Direct Manager",
                                "990002": "Dept Head",
                                "990003": "Sect Head",
                                "990004": "Site Head"
                              };
                              label += ` (${mapping[step.virtualEmployeeId] || step.virtualEmployeeId})`;
                            }
                            return (
                              <span key={step.id} className="flex items-center">
                                {idx > 0 && <span className="mx-1 text-muted-foreground">➔</span>}
                                <span className="bg-slate-50 border px-2 py-0.5 rounded text-[11px]">
                                  {label}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {preset.isSystemPreset ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">System</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(preset.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PresetBuilderDialog
                            initial={preset}
                            trigger={
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" title="Edit">
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          {!preset.isSystemPreset && (
                            <DeletePresetButton id={preset.id} name={preset.name} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                      <div className="flex items-center gap-2">
                        <MonitoringDetailDialog
                          item={item}
                          trigger={<Button size="sm" variant="outline">Open</Button>}
                        />
                        <MonitoringDetailDialog
                          item={item}
                          trigger={<Button size="sm" variant="secondary">Timeline</Button>}
                        />
                        <InvestigatedButton submissionId={item.id} requestId={item.requestId} />
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
