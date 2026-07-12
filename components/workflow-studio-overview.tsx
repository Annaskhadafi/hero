'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useActionState, useMemo, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ExternalLink, Plus, X, ArrowUp, ArrowDown } from 'lucide-react'

import {
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
}: {
  value: string
  onChange: (v: string) => void
  options: SearchableOption[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find((o) => o.id.toString() === value)
  const filtered = query
    ? options.filter((o) => `${o.name} ${o.jobTitle ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="border-border/70 bg-muted/30 h-8 w-full rounded-md border px-2 text-left text-xs truncate"
      >
        {selected ? `${selected.name}${selected.jobTitle ? ` - ${selected.jobTitle}` : ''}` : (placeholder ?? 'Kosong')}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border/70 h-8 w-full border-b px-2 text-xs outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
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
      )}
    </div>
  )
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

  function isSectionStep(label: string) {
    const norm = label.toLowerCase().replace(/[^a-z]/g, '')
    return norm === 'section'
  }

  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(() => {
    const defaults: ApprovalStep[] = [
      { id: 'step-0', label: 'Section', type: 'section' },
      { id: 'step-1', label: 'Leader', type: 'employee' },
      { id: 'step-2', label: 'PJO (Head Lokasi)', type: 'employee' },
      { id: 'step-3', label: 'Section Head', type: 'employee' },
      { id: 'step-4', label: 'Department Head', type: 'employee' },
    ]
    if (initial?.globalSteps && initial.globalSteps.length > 0) {
      return initial.globalSteps.map((gs, i) => ({
        id: `step-${i}`,
        label: gs.label ?? '',
        type: (isSectionStep(gs.label ?? '') ? 'section' : 'employee') as 'section' | 'employee',
      }))
    }
    return defaults
  })

  const [siteData, setSiteData] = useState<SiteData[]>(() => {
    const steps = initial?.globalSteps && initial.globalSteps.length > 0
      ? initial.globalSteps.map((gs, i) => ({ id: `step-${i}`, label: gs.label ?? '', type: (isSectionStep(gs.label ?? '') ? 'section' : 'employee') as 'section' | 'employee' }))
      : [
          { id: 'step-0', label: 'Section', type: 'section' as const },
          { id: 'step-1', label: 'Leader', type: 'employee' as const },
          { id: 'step-2', label: 'PJO (Head Lokasi)', type: 'employee' as const },
          { id: 'step-3', label: 'Section Head', type: 'employee' as const },
          { id: 'step-4', label: 'Department Head', type: 'employee' as const },
        ]

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
    setApprovalSteps((prev) => prev.filter((s) => s.id !== id))
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
              {approvalSteps.length > 0 ? (
                <div className="space-y-1.5">
                  {approvalSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-medium text-muted-foreground">{idx + 1}.</span>
                      <Input
                        placeholder="Nama langkah (misal: HSE Team, Safety Officer)"
                        value={step.label}
                        onChange={(e) => {
                          updateStepLabel(step.id, e.target.value)
                          const isSec = isSectionStep(e.target.value)
                          setApprovalSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, type: isSec ? 'section' : 'employee' } : s))
                        }}
                        className="h-8 flex-1 text-xs"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, -1)} disabled={idx === 0} className="h-7 w-7 p-0">
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(step.id, 1)} disabled={idx === approvalSteps.length - 1} className="h-7 w-7 p-0">
                        <ArrowDown className="size-3" />
                      </Button>
                      <button type="button" onClick={() => removeStep(step.id)} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
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
                                  onChange={(v) => {
                                    if (step.type === 'section' && v) {
                                      const sec = csSections.find((s) => s.id.toString() === v)
                                      const shStepId = approvalSteps.find((s) => s.label.toLowerCase().replace(/[^a-z]/g, '') === 'sectionhead')?.id
                                      setSiteData((prev) => prev.map((site) => {
                                        if (site.key !== siteRow.key) return site
                                        const newValues = { ...site.values, [step.id]: v }
                                        if (shStepId && sec?.headEmployeeId) {
                                          newValues[shStepId] = sec.headEmployeeId.toString()
                                        }
                                        return { ...site, values: newValues }
                                      }))
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
