'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, PackageCheck } from 'lucide-react'

import { CargoManifestRowActions } from '@/components/cargo-manifest-panels'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Button } from '@/components/ui/button'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { TableMultiFilter } from '@/components/ui/table-multi-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CargoManifestRecord } from '@/app/actions/cargo-manifest'

const columns = [
  'Detail',
  'No. Manifest',
  'Tanggal',
  'Site',
  'Section',
  'Attention',
  'Transport Via',
  'Tujuan',
  'Items',
  'Status',
  'Aksi',
]

type CargoManifestTableProps = {
  manifests: CargoManifestRecord[]
  canEdit?: boolean
  canDelete?: boolean
}

function getNormalizedSection(sectionName: string | null | undefined): 'SERVICE' | 'REPAIR' {
  if (!sectionName) return 'SERVICE'
  const name = sectionName.toLowerCase()
  if (name.includes('repair') || name.includes('retread')) {
    return 'REPAIR'
  }
  return 'SERVICE'
}

export function CargoManifestTable({
  manifests,
  canEdit = true,
  canDelete = true,
}: CargoManifestTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sectionTab, setSectionTab] = useState<'ALL' | 'SERVICE' | 'REPAIR'>('ALL')

  const serviceCount = useMemo(
    () => manifests.filter((m) => getNormalizedSection(m.sectionName) === 'SERVICE').length,
    [manifests]
  )
  const repairCount = useMemo(
    () => manifests.filter((m) => getNormalizedSection(m.sectionName) === 'REPAIR').length,
    [manifests]
  )

  const activeManifests = useMemo(() => {
    if (sectionTab === 'SERVICE') {
      return manifests.filter((m) => getNormalizedSection(m.sectionName) === 'SERVICE')
    }
    if (sectionTab === 'REPAIR') {
      return manifests.filter((m) => getNormalizedSection(m.sectionName) === 'REPAIR')
    }
    return manifests
  }, [manifests, sectionTab])

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeManifests
            .map((manifest) => manifest.siteName)
            .filter((site): site is string => Boolean(site))
        )
      ).sort(),
    [activeManifests]
  )
  const statusOptions = useMemo(
    () => Array.from(new Set(activeManifests.map((manifest) => manifest.status).filter(Boolean))).sort(),
    [activeManifests]
  )
  const sectionOptions = useMemo(
    () => ['Service Operation', 'Repair / Retread Operation'],
    []
  )
  const totalItems = activeManifests.reduce((total, manifest) => total + manifest.items.length, 0)

  const toggleRow = (id: number) => {
    const nextExpanded = new Set(expandedRows)
    if (nextExpanded.has(id)) {
      nextExpanded.delete(id)
    } else {
      nextExpanded.add(id)
    }
    setExpandedRows(nextExpanded)
  }

  return (
    <div className="space-y-3">
      {/* 2 Section Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60">
        <button
          type="button"
          onClick={() => setSectionTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            sectionTab === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span>Semua Section</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              sectionTab === 'ALL'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {manifests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('SERVICE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            sectionTab === 'SERVICE'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span>Service Operation</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              sectionTab === 'SERVICE'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {serviceCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('REPAIR')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            sectionTab === 'REPAIR'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span>Repair / Retread Operation</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              sectionTab === 'REPAIR'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {repairCount}
          </span>
        </button>
      </div>

      <MinimalTableShell
        label="cargo manifest"
        fileName="cargo-manifest"
        searchPlaceholder="Cari manifest, site, tujuan..."
        filters={
          <>
            <TableMultiFilter
              label="section"
              filterKey="section"
              options={sectionOptions.map((section) => ({ value: section, label: section }))}
            />
            <TableMultiFilter
              label="site"
              filterKey="site"
              options={siteOptions.map((site) => ({ value: site, label: site }))}
            />
            <TableMultiFilter
              label="status"
              filterKey="status"
              options={statusOptions.map((status) => ({ value: status, label: status }))}
            />
          </>
        }
        scorecards={[
          {
            label: 'Manifest',
            value: activeManifests.length,
            description: sectionTab === 'ALL' ? 'Total dokumen manifest' : `Manifest (${sectionTab === 'SERVICE' ? 'Service Operation' : 'Repair / Retread'})`,
            icon: <PackageCheck className="text-primary size-4" />,
            tone: 'info',
          },
          {
            label: 'Items',
            value: totalItems,
            description: 'Total barang tercatat',
            tone: 'default',
          },
          {
            label: 'Sites',
            value: siteOptions.length,
            description: 'Site dengan manifest aktif',
            tone: 'success',
          },
          {
            label: 'Status',
            value: statusOptions.length,
            description: 'Variasi status dokumen',
            tone: 'warning',
          },
        ]}
        columnOptions={columns.map((column, index) => ({
          key: column,
          label: column,
          required: index <= 1,
        }))}
        tableViewportClassName="max-h-[72vh]"
        dateFilter
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeManifests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Belum ada data manifest untuk section ini
                </TableCell>
              </TableRow>
            ) : (
              activeManifests.map((manifest) => (
                <Fragment key={manifest.id}>
                  <TableRow
                    data-date-value={manifest.createdAt.toISOString()}
                    data-filter-site={manifest.siteName ?? ''}
                    data-filter-status={manifest.status}
                    data-filter-section={
                      getNormalizedSection(manifest.sectionName) === 'REPAIR'
                        ? 'Repair / Retread Operation'
                        : 'Service Operation'
                    }
                  >
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="denseIcon"
                        onClick={() => toggleRow(manifest.id)}
                        aria-label="Toggle detail barang"
                      >
                        {expandedRows.has(manifest.id) ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="text-primary font-mono text-xs font-semibold">
                        {manifest.manifestNumber}
                      </span>
                    </TableCell>
                    <TableCell>{manifest.date}</TableCell>
                    <TableCell>{manifest.siteName || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          getNormalizedSection(manifest.sectionName) === 'REPAIR'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                        }`}
                      >
                        {manifest.sectionName ||
                          (getNormalizedSection(manifest.sectionName) === 'REPAIR'
                            ? 'Repair / Retread Operation'
                            : 'Service Operation')}
                      </span>
                    </TableCell>
                    <TableCell>{manifest.attention || '-'}</TableCell>
                    <TableCell>{manifest.transportVia || '-'}</TableCell>
                    <TableCell>
                      <span
                        className="block max-w-[200px] truncate text-xs"
                        title={manifest.finalDestination || undefined}
                      >
                        {manifest.finalDestination || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {manifest.items.length} item
                      </span>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge value={manifest.status} />
                    </TableCell>
                    <TableCell>
                      <CargoManifestRowActions
                        row={manifest}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(manifest.id) ? (
                    <TableRow
                      data-date-value={manifest.createdAt.toISOString()}
                      data-filter-site={manifest.siteName ?? ''}
                      data-filter-status={manifest.status}
                      data-filter-section={
                        getNormalizedSection(manifest.sectionName) === 'REPAIR'
                          ? 'Repair / Retread Operation'
                          : 'Service Operation'
                      }
                    >
                      <TableCell colSpan={columns.length} className="bg-surface-container-low p-4">
                        <div className="rounded-[1rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10)]">
                          <h4 className="mb-2 text-sm font-semibold">Detail Barang</h4>
                          {manifest.items.length === 0 ? (
                            <p className="text-muted-foreground text-xs">Tidak ada item</p>
                          ) : (
                            <div className="border-border/70 overflow-auto rounded-xl border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead>No</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Serial Number</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Remark</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {manifest.items.map((item, index) => (
                                    <TableRow key={`${manifest.id}-${item.no}-${index}`}>
                                      <TableCell>{item.no}</TableCell>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell>{item.serialNumber || '-'}</TableCell>
                                      <TableCell>{item.qty}</TableCell>
                                      <TableCell>{item.brand || '-'}</TableCell>
                                      <TableCell>{item.remark || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  )
}
