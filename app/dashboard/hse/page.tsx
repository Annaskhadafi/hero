import Link from 'next/link'
import { AlertCircle, ClipboardList, Search, ShieldAlert, TriangleAlert } from 'lucide-react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { AdminTableCard } from '@/components/admin-table-card'
import { TableFilterPresets } from '@/components/table-filter-presets'
import {
  HseCrudForms,
  HseIncidentRowActions,
  HseObservationRowActions,
} from '@/components/operational-crud-panels'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableMultiFilter } from '@/components/ui/table-multi-filter'
import { getHsePageData, getOperationalCrudOptions } from '@/lib/hero-admin'
import { HseDashboardCharts } from './hse-dashboard-charts'

function HseDashboardBanner() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 bg-[#1e40af] px-5 py-4 text-white sm:flex-row sm:justify-center">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/80 uppercase">
          M6 • HSE Module
        </p>
        <h1 className="font-display text-xl font-semibold tracking-wide">DASHBOARD HSE</h1>
      </div>
      <Link
        href="/dashboard/hse/hiradc"
        className="focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] shadow transition-colors hover:bg-white/90 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:absolute sm:top-1/2 sm:right-5 sm:-translate-y-1/2"
      >
        Buka HIRADC
      </Link>
    </div>
  )
}

function HseMetricCards({
  observations,
  incidents,
}: {
  observations: { status: string; severity: string }[]
  incidents: { status: string }[]
}) {
  const items = [
    {
      label: 'Total Observasi',
      value: observations.length,
      meta: 'Seluruh temuan lapangan',
      Icon: ClipboardList,
      accent: 'bg-primary/12 text-primary ring-primary/15',
    },
    {
      label: 'Observasi Terbuka',
      value: observations.filter((row) => row.status === 'open').length,
      meta: 'Perlu closure action',
      Icon: AlertCircle,
      accent: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    },
    {
      label: 'Total Insiden',
      value: incidents.length,
      meta: 'Insiden yang tercatat',
      Icon: ShieldAlert,
      accent: 'bg-tertiary-container text-on-tertiary-container ring-tertiary/15',
    },
    {
      label: 'Insiden Investigasi',
      value: incidents.filter((row) => row.status === 'investigating').length,
      meta: 'Sedang dalam penyelidikan',
      Icon: Search,
      accent: 'bg-violet-100 text-violet-700 ring-violet-200',
    },
    {
      label: 'Temuan Kritis',
      value: observations.filter((row) => row.severity === 'Critical' || row.severity === 'High')
        .length,
      meta: 'Severity tinggi & kritis',
      Icon: TriangleAlert,
      accent: 'bg-amber-100 text-amber-700 ring-amber-200',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="surface-module-card flex items-start justify-between rounded-[1.05rem] px-4 py-4"
        >
          <div className="min-w-0">
            <p className="text-muted-foreground text-[0.65rem] font-bold tracking-[0.12em] uppercase">
              {item.label}
            </p>
            <p className="font-display text-foreground mt-1 text-[1.8rem] leading-none font-bold">
              {item.value}
            </p>
            <p className="text-muted-foreground mt-1 truncate text-xs">{item.meta}</p>
          </div>
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${item.accent}`}
          >
            <item.Icon className="size-5" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function HsePage() {
  const [{ observations, incidents }, options] = await Promise.all([
    getHsePageData(),
    getOperationalCrudOptions(),
  ])

  const chartObservations = observations.map((row) => ({
    status: row.status,
    severity: row.severity,
    observedAt: row.observedAt?.toISOString?.() ?? null,
  }))

  const chartIncidents = incidents.map((row) => ({
    status: row.status,
    type: row.type,
    reportedAt: row.reportedAt?.toISOString?.() ?? null,
  }))

  const siteOptions = Array.from(new Set(options.sites.map((site) => site.name))).sort()
  const observationCategories = Array.from(new Set(observations.map((row) => row.category))).sort()
  const observationStatuses = Array.from(new Set(observations.map((row) => row.status))).sort()
  const incidentStatuses = Array.from(new Set(incidents.map((row) => row.status))).sort()
  const incidentTypes = Array.from(new Set(incidents.map((row) => row.type))).sort()

  return (
    <AdminPageShell eyebrow="" title="" description="" header={<HseDashboardBanner />}>
      <HseMetricCards observations={observations} incidents={incidents} />
      <HseDashboardCharts observations={chartObservations} incidents={chartIncidents} />

      <Tabs defaultValue="observations" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="observations">Observasi</TabsTrigger>
          <TabsTrigger value="incidents">Insiden</TabsTrigger>
        </TabsList>

        <TabsContent value="observations">
          <AdminTableCard
            title="Field observation"
            description="Temuan unsafe act dan unsafe condition yang perlu closure action atau eskalasi supervisor."
            columns={['Title', 'Category', 'Location', 'Reporter', 'Severity', 'Status', 'Action']}
            dateFilter
            actions={
              <HseCrudForms
                employees={options.employees}
                sites={options.sites}
                categoryOptions={options.categoryOptions}
                mode="observation"
              />
            }
            presets={
              <TableFilterPresets
                presets={[
                  { label: 'Terbuka', filters: { status: 'open' } },
                  { label: 'Ditangani', filters: { status: 'action_taken' } },
                ]}
              />
            }
            filters={
              <>
                <TableMultiFilter
                  label="site"
                  filterKey="site"
                  options={siteOptions.map((option) => ({ value: option, label: option }))}
                />
                <TableMultiFilter
                  label="kategori"
                  filterKey="category"
                  options={observationCategories.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />
                <TableMultiFilter
                  label="status"
                  filterKey="status"
                  options={observationStatuses.map((option) => ({ value: option, label: option }))}
                />
              </>
            }
            rows={observations.map((row, index) => [
              row.title,
              row.category,
              row.location,
              row.reporter ?? 'System',
              row.severity,
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <HseObservationRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
                sites={options.sites}
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={observations.map((row) => ({
              'data-date-value': row.observedAt?.toISOString?.() ?? '',
              'data-filter-site': options.sites.find((site) => site.id === row.siteId)?.name ?? '',
              'data-filter-category': row.category,
              'data-filter-status': row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="incidents">
          <AdminTableCard
            title="HSE Incident"
            description="Antrian insiden untuk investigasi, update status, dan pelaporan manajemen per site."
            columns={['Title', 'Type', 'Unit', 'Impact', 'Reported', 'Status', 'Action']}
            dateFilter
            actions={
              <HseCrudForms
                employees={options.employees}
                sites={options.sites}
                categoryOptions={options.categoryOptions}
                mode="incident"
              />
            }
            presets={
              <TableFilterPresets
                presets={[
                  { label: 'Ditinjau', filters: { status: 'investigating' } },
                  { label: 'Selesai', filters: { status: 'closed' } },
                ]}
              />
            }
            filters={
              <>
                <TableMultiFilter
                  label="site"
                  filterKey="site"
                  options={siteOptions.map((option) => ({ value: option, label: option }))}
                />
                <TableMultiFilter
                  label="tipe"
                  filterKey="type"
                  options={incidentTypes.map((option) => ({ value: option, label: option }))}
                />
                <TableMultiFilter
                  label="status"
                  filterKey="status"
                  options={incidentStatuses.map((option) => ({ value: option, label: option }))}
                />
              </>
            }
            rows={incidents.map((row, index) => [
              row.title,
              row.type,
              row.unitNumber,
              row.impact,
              row.reportedAt.toLocaleDateString('id-ID'),
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <HseIncidentRowActions
                key={`${row.id}-actions`}
                row={row}
                sites={options.sites}
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={incidents.map((row) => ({
              'data-date-value': row.reportedAt.toISOString(),
              'data-filter-site': options.sites.find((site) => site.id === row.siteId)?.name ?? '',
              'data-filter-type': row.type,
              'data-filter-status': row.status,
            }))}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}
