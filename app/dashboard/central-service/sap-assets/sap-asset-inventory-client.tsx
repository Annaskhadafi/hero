'use client'

import { useMemo, useState } from 'react'
import { Boxes, Building2, CircleDollarSign, MapPinned, Users } from 'lucide-react'

import { TableActionMenu, MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  SapAssetInventoryData,
  SapAssetInventoryRow,
  SapAssetSummaryRow,
} from '@/lib/sap-asset-inventory'

const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const integerFormatter = new Intl.NumberFormat('id-ID')

function text(value: string | number | null | undefined) {
  if (value == null || String(value).trim() === '') return '-'

  return (
    {
      'Belum dipetakan': 'Unmapped',
      'Belum ditetapkan': 'Unassigned',
    }[String(value).trim()] ?? String(value)
  )
}

function number(value: number) {
  return numberFormatter.format(value)
}

function integer(value: number) {
  return integerFormatter.format(value)
}

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-'
}

function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-'
}

function uniqueFilterOptions(rows: SapAssetSummaryRow[]) {
  const options = new Map<string, { value: string; label: string }>()
  rows.forEach((row) => {
    if (!options.has(row.code)) {
      options.set(row.code, {
        value: row.code,
        label: `${row.code || 'N/A'} · ${text(row.name)}`,
      })
    }
  })
  return Array.from(options.values())
}

function TableActions({ onReset }: { onReset: () => void }) {
  return (
    <TableActionMenu showDatePresets={false} onReset={onReset} onSetDateRange={() => undefined} />
  )
}

function FilterSelect({
  filterKey,
  label,
  options,
}: {
  filterKey: string
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      aria-label={label}
      data-table-filter-key={filterKey}
      className="border-border/70 bg-muted/30 text-foreground h-9 max-w-[190px] rounded-lg border px-2.5 text-[13px] shadow-none"
      defaultValue=""
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Boxes
  label: string
  value: string
  hint: string
  tone: 'teal' | 'sky' | 'amber' | 'indigo'
}) {
  const tones = {
    teal: {
      accent: 'bg-teal-500',
      glow: 'bg-teal-100/70',
      icon: 'bg-teal-50 text-teal-700',
    },
    sky: {
      accent: 'bg-sky-500',
      glow: 'bg-sky-100/70',
      icon: 'bg-sky-50 text-sky-700',
    },
    amber: {
      accent: 'bg-amber-500',
      glow: 'bg-amber-100/70',
      icon: 'bg-amber-50 text-amber-700',
    },
    indigo: {
      accent: 'bg-indigo-500',
      glow: 'bg-indigo-100/70',
      icon: 'bg-indigo-50 text-indigo-700',
    },
  }[tone]

  return (
    <Card className="group relative min-h-[126px] overflow-hidden rounded-[1rem] border-0 bg-gradient-to-br from-white via-white to-slate-50 px-5 py-4 shadow-[0_8px_24px_rgb(15_23_42/0.05)] ring-1 ring-slate-200/70 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgb(15_23_42/0.09)]">
      <div className={`absolute inset-x-0 top-0 h-1 ${tones.accent}`} />
      <div
        className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl ${tones.glow}`}
      />
      <div className="relative flex h-full items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
            <span className={`h-1.5 w-1.5 rounded-full ${tones.accent}`} aria-hidden="true" />
            {label}
          </p>
          <p className="font-display mt-2 truncate text-[1.65rem] leading-none font-bold tracking-[-0.04em] text-slate-950 tabular-nums">
            {value}
          </p>
          <p className="mt-3 truncate text-[11px] leading-none text-slate-500">{hint}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/80 ${tones.icon}`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}

function SummaryTable({
  tableId,
  label,
  rows,
}: {
  tableId: string
  label: string
  rows: SapAssetSummaryRow[]
}) {
  const [resetVersion, setResetVersion] = useState(0)

  return (
    <div data-inventory-table={tableId}>
      <MinimalTableShell
        key={resetVersion}
        label={label}
        fileName={`sap-asset-${tableId}`}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        showImport={false}
        dateFilter={false}
        actions={<TableActions onReset={() => setResetVersion((version) => version + 1)} />}
        tableViewportClassName="max-h-[62vh]"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Asset Count</TableHead>
              <TableHead className="text-right">Acquisition Value</TableHead>
              <TableHead className="text-right">Book Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.code}-${row.name}`}>
                <TableCell className="font-mono text-xs font-semibold">{text(row.code)}</TableCell>
                <TableCell className="font-medium">{text(row.name)}</TableCell>
                <TableCell className="text-xs text-slate-500">{text(row.extra)}</TableCell>
                <TableCell className="text-right tabular-nums">{integer(row.assetCount)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(row.acquisitionValue)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{number(row.bookValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  )
}

function AssetRegister({
  assets,
  data,
}: {
  assets: SapAssetInventoryRow[]
  data: SapAssetInventoryData
}) {
  const [resetVersion, setResetVersion] = useState(0)
  const locationOptions = useMemo(() => uniqueFilterOptions(data.byLocation), [data.byLocation])
  const classOptions = useMemo(() => uniqueFilterOptions(data.byClass), [data.byClass])
  const holderOptions = useMemo(
    () => uniqueFilterOptions(data.byHolder.filter((row) => row.code)),
    [data.byHolder]
  )
  const costCenterOptions = useMemo(
    () => uniqueFilterOptions(data.byCostCenter.filter((row) => row.code)),
    [data.byCostCenter]
  )

  return (
    <div data-inventory-table="register">
      <MinimalTableShell
        key={resetVersion}
        label="SAP assets"
        fileName="sap-asset-register"
        searchPlaceholder="Search asset no., description, serial..."
        showImport={false}
        dateFilter={false}
        filters={
          <>
            <FilterSelect filterKey="location" label="Location" options={locationOptions} />
            <FilterSelect filterKey="assetClass" label="Class" options={classOptions} />
            <FilterSelect filterKey="holder" label="Holder" options={holderOptions} />
            <FilterSelect filterKey="costCenter" label="Cost Center" options={costCenterOptions} />
          </>
        }
        actions={<TableActions onReset={() => setResetVersion((version) => version + 1)} />}
        tableViewportClassName="max-h-[68vh]"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Location / Room</TableHead>
              <TableHead>Holder</TableHead>
              <TableHead>Cost Center</TableHead>
              <TableHead>Inventory / Serial</TableHead>
              <TableHead>Acquisition Date</TableHead>
              <TableHead className="text-right">Book Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow
                key={`${asset.assetNo}-${asset.subNumber}`}
                data-filter-location={asset.assetLocation}
                data-filter-asset-class={asset.assetClass}
                data-filter-holder={asset.personelNo}
                data-filter-cost-center={asset.costCenter}
                data-date-value={asset.firstAcquisitionOn ?? undefined}
              >
                <TableCell>
                  <div className="font-mono text-xs font-semibold text-slate-900">
                    {text(asset.assetNo)}
                  </div>
                </TableCell>
                <TableCell className="min-w-[240px]">
                  <div className="font-medium text-slate-800">{text(asset.assetDescription)}</div>
                  {asset.assetMainNoText && asset.assetMainNoText !== asset.assetDescription ? (
                    <div className="mt-0.5 text-[11px] text-slate-500">{asset.assetMainNoText}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {text(asset.assetClass)}
                  </Badge>
                  <div className="mt-1 max-w-[160px] text-xs text-slate-500">
                    {text(asset.assetClassName)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{text(asset.assetLocation)}</div>
                  <div className="max-w-[160px] text-xs text-slate-500">
                    {text(asset.assetLocationName)}
                    {asset.assetRoom ? ` · ${asset.assetRoom}` : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[180px] font-medium">{text(asset.holderName)}</div>
                  <div className="text-xs text-slate-500">
                    {asset.personelNo ? `Personnel no. ${asset.personelNo}` : 'Unassigned'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs font-semibold">{text(asset.costCenter)}</div>
                  <div className="max-w-[150px] text-xs text-slate-500">
                    {text(asset.costCenterDescription)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">Inventory: {text(asset.inventoryNumber)}</div>
                  <div className="text-xs text-slate-500">Serial: {text(asset.serialNumber)}</div>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-slate-600">
                  {date(asset.firstAcquisitionOn)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {number(asset.bookValue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  )
}

export function SapAssetInventoryClient({ data }: { data: SapAssetInventoryData }) {
  const { stats } = data
  return (
    <div className="space-y-4">
      {!data.success ? (
        <Card className="rounded-[1rem] border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          {data.error}
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Boxes}
          label="Total Assets"
          value={integer(stats.totalAssets)}
          hint="Records from cp_asset_balances"
          tone="teal"
        />
        <Stat
          icon={Users}
          label="Assigned"
          value={integer(stats.assignedAssets)}
          hint="With personnel numbers"
          tone="sky"
        />
        <Stat
          icon={CircleDollarSign}
          label="Book Value"
          value={number(stats.totalBookValue)}
          hint={`${integer(stats.assetsWithBookValue)} assets with book value`}
          tone="amber"
        />
        <Stat
          icon={MapPinned}
          label="Acquisition Value"
          value={number(stats.totalAcquisitionValue)}
          hint={
            stats.lastExtractedAt
              ? `Extracted ${dateTime(stats.lastExtractedAt)}`
              : 'Extraction time unavailable'
          }
          tone="indigo"
        />
      </div>

      <Card className="rounded-[1rem] border-0 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" /> Source: One Chitra · SAP Asset
            Management
          </span>
          <span>References: class, location, holder, cost center</span>
          <span className="ml-auto">Read-only</span>
        </div>
      </Card>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="location">By Location</TabsTrigger>
          <TabsTrigger value="class">By Asset Class</TabsTrigger>
          <TabsTrigger value="holder">By Holder</TabsTrigger>
          <TabsTrigger value="cost-center">By Cost Center</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-0">
          <AssetRegister assets={data.assets} data={data} />
        </TabsContent>
        <TabsContent value="location" className="mt-0">
          <SummaryTable tableId="location" label="asset locations" rows={data.byLocation} />
        </TabsContent>
        <TabsContent value="class" className="mt-0">
          <SummaryTable tableId="class" label="asset classes" rows={data.byClass} />
        </TabsContent>
        <TabsContent value="holder" className="mt-0">
          <SummaryTable tableId="holder" label="asset holders" rows={data.byHolder} />
        </TabsContent>
        <TabsContent value="cost-center" className="mt-0">
          <SummaryTable tableId="cost-center" label="cost centers" rows={data.byCostCenter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
