'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useActionState, useMemo, useState } from 'react'
import { Bell, ExternalLink, Plus } from 'lucide-react'

import {
  markWorkflowStudioInvestigatedAction,
  saveWorkflowStudioApprovalAction,
  resendWorkflowStudioReminderAction,
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
  const selectedSiteId = initial?.siteId?.toString() ?? data.builderOptions.sites[0]?.id?.toString() ?? ''
  const employeeOptions = data.builderOptions.employees

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9">
            <Plus className="size-4" /> Buat Approval
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Buat Approval Workflow</DialogTitle>
          <DialogDescription>
            Satu kombinasi aktif per form/site. Jika sudah ada, sistem akan menolak duplikat.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {initial?.matrixId ? <input type="hidden" name="matrixId" value={initial.matrixId} /> : null}
          <input type="hidden" name="templateKey" value={selectedMenu?.templateKey ?? ''} />
          <input type="hidden" name="transactionType" value={selectedMenu?.transactionType ?? ''} />

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
              Site
              <select
                name="siteId"
                defaultValue={selectedSiteId}
                className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm"
                required
              >
                {data.builderOptions.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
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
              <Input name="effectiveFrom" type="datetime-local" defaultValue={toDateTimeLocal(initial?.effectiveFrom)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Effective To
              <Input name="effectiveTo" type="datetime-local" defaultValue={toDateTimeLocal(initial?.effectiveTo)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Status
              <select name="isActive" defaultValue={initial?.status === 'Nonactive' ? 'false' : 'true'} className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm">
                <option value="true">Active</option>
                <option value="false">Nonactive</option>
              </select>
            </label>
          </div>

          <section className="rounded-lg border bg-white p-3">
            <h3 className="mb-3 font-display text-base font-semibold">Setting Approval</h3>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['leaderId', 'Leader'],
                ['pjoId', 'PJO'],
                ['sectionHeadId', 'Section Head'],
                ['departmentHeadId', 'Department Head'],
              ].map(([name, label]) => (
                <label key={name} className="space-y-1.5 text-sm font-medium">
                  {label}
                  <select
                    name={name}
                    defaultValue={
                      name === 'leaderId'
                        ? initial?.leaderId?.toString() ?? ''
                        : name === 'pjoId'
                          ? initial?.pjoId?.toString() ?? ''
                          : name === 'sectionHeadId'
                            ? initial?.sectionHeadId?.toString() ?? ''
                            : initial?.departmentHeadId?.toString() ?? ''
                    }
                    className="border-border/70 bg-muted/30 h-11 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="">Kosong</option>
                    {employeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} {employee.jobTitle ? `- ${employee.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
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
                    <TableCell><AdminStatusBadge value={item.status} /></TableCell>
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
