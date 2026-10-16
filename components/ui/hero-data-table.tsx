'use client'

import * as React from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AdminImportDialog, type AdminImportField, type AdminImportPayload } from '@/components/admin/admin-import-dialog'
import { cn } from '@/lib/utils'

export type HeroColumnDef<T> = {
  key: string
  header: string
  sortable?: boolean
  searchable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  className?: string
  render?: (row: T, index: number) => React.ReactNode
  exportValue?: (row: T) => string | number
}

export type HeroTableFilterOption = {
  value: string
  label: string
}

export type HeroTableFilter = {
  key: string
  label: string
  options: HeroTableFilterOption[]
  isMulti?: boolean
}

export interface HeroDataTableProps<T> {
  data: T[]
  columns: HeroColumnDef<T>[]
  idField: keyof T
  title?: string
  description?: string
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  filters?: HeroTableFilter[]
  activeFilters?: Record<string, string | string[]>
  onFilterChange?: (key: string, value: string | string[]) => void
  onRowClick?: (row: T) => void
  onBulkEdit?: (selectedIds: string[], selectedRows: T[]) => void
  onBulkDelete?: (selectedIds: string[], selectedRows: T[]) => void
  onImport?: (payload: AdminImportPayload) => void
  importFields?: AdminImportField[]
  importTitle?: string
  exportFileName?: string
  pdfTitle?: string
  renderRowActions?: (row: T) => React.ReactNode
  headerActions?: React.ReactNode
  loading?: boolean
  emptyMessage?: string
  showSelection?: boolean
  showPagination?: boolean
  defaultPageSize?: number
}

export function HeroDataTable<T extends Record<string, any>>({
  data,
  columns,
  idField,
  title,
  description,
  searchPlaceholder = 'Cari data...',
  searchKeys,
  filters = [],
  activeFilters: externalActiveFilters,
  onFilterChange: externalOnFilterChange,
  onRowClick,
  onBulkEdit,
  onBulkDelete,
  onImport,
  importFields,
  importTitle = 'Import Data',
  exportFileName = 'data-export',
  pdfTitle = 'Laporan Data Operasional HERO',
  renderRowActions,
  headerActions,
  loading = false,
  emptyMessage = 'Tidak ada data ditemukan.',
  showSelection = true,
  showPagination = true,
  defaultPageSize = 10,
}: HeroDataTableProps<T>) {
  // Local search state
  const [searchQuery, setSearchQuery] = React.useState('')

  // Local sorting state
  const [sortConfig, setSortConfig] = React.useState<{
    key: string
    direction: 'asc' | 'desc' | null
  }>({ key: '', direction: null })

  // Local filter state (fallback if not controlled)
  const [internalFilters, setInternalFilters] = React.useState<Record<string, string | string[]>>({})
  const activeFilters = externalActiveFilters || internalFilters

  const handleFilterChange = (key: string, value: string | string[]) => {
    if (externalOnFilterChange) {
      externalOnFilterChange(key, value)
    } else {
      setInternalFilters((prev) => {
        const next = { ...prev }
        if (Array.isArray(value) && value.length === 0) {
          delete next[key]
        } else if (!value) {
          delete next[key]
        } else {
          next[key] = value
        }
        return next
      })
    }
  }

  // Local selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Local pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(defaultPageSize)

  // PDF Preview Dialog State
  const [showPdfModal, setShowPdfModal] = React.useState(false)

  // Reset pagination on search or filter change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilters])

  // Filtered & Searched Data
  const filteredData = React.useMemo(() => {
    let result = [...data]

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((row) => {
        if (searchKeys && searchKeys.length > 0) {
          return searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
        }
        // Fallback: search all columns
        return columns.some((col) => {
          const val = row[col.key]
          return String(val ?? '').toLowerCase().includes(q)
        })
      })
    }

    // 2. Filter by Dynamic Filters
    Object.entries(activeFilters).forEach(([filterKey, filterVal]) => {
      if (!filterVal || (Array.isArray(filterVal) && filterVal.length === 0)) return

      result = result.filter((row) => {
        const rowVal = String(row[filterKey] ?? '')
        if (Array.isArray(filterVal)) {
          return filterVal.includes(rowVal)
        }
        return rowVal === String(filterVal)
      })
    })

    // 3. Sort Data
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1
        if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
        }

        const strA = String(aVal).toLowerCase()
        const strB = String(bVal).toLowerCase()
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchQuery, searchKeys, columns, activeFilters, sortConfig])

  // Paginated Slice
  const totalRows = filteredData.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  const paginatedData = React.useMemo(() => {
    if (!showPagination) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize, showPagination])

  // Selection Logic
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.has(String(row[idField])))

  const isIndeterminate =
    paginatedData.some((row) => selectedIds.has(String(row[idField]))) &&
    !allCurrentPageSelected

  const toggleSelectAllCurrentPage = () => {
    const next = new Set(selectedIds)
    if (allCurrentPageSelected) {
      paginatedData.forEach((row) => next.delete(String(row[idField])))
    } else {
      paginatedData.forEach((row) => next.add(String(row[idField])))
    }
    setSelectedIds(next)
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const selectedRows = React.useMemo(() => {
    return data.filter((row) => selectedIds.has(String(row[idField])))
  }, [data, selectedIds, idField])

  // Sorting Handler
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return { key: '', direction: null }
    })
  }

  // Export to Excel Handler (.xlsx)
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const exportCols = columns.map((c) => c.header)
      const exportRows = filteredData.map((row) => {
        return columns.map((c) => {
          if (c.exportValue) return c.exportValue(row)
          return row[c.key] ?? ''
        })
      })

      const wb = XLSX.utils.book_new()
      const wsData = [exportCols, ...exportRows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Auto fit column widths
      const colWidths = exportCols.map((col, idx) => {
        let max = String(col).length
        exportRows.forEach((r) => {
          const l = String(r[idx] ?? '').length
          if (l > max) max = l
        })
        return { wch: Math.min(Math.max(max + 3, 10), 50) }
      })
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      XLSX.writeFile(wb, `${exportFileName}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Export Excel failed:', err)
    }
  }

  // Active filters count
  const activeFiltersCount = Object.values(activeFilters).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length
    if (val) return acc + 1
    return acc
  }, 0)

  return (
    <div className="w-full space-y-3">
      {/* 1. Header Toolbar (Unified h-9 Buttons) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Title or Search & Filter Bar */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-full sm:w-[240px]">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="border-border/70 focus-visible:ring-ring/50 h-9 rounded-lg bg-white pr-7 pl-8.5 text-[13px] shadow-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Dynamic Searchable Filter Dropdowns */}
          {filters.map((filter) => {
            const currentVal = activeFilters[filter.key]
            return (
              <SearchableTableFilterDropdown
                key={filter.key}
                filter={filter}
                value={currentVal}
                onChange={(val) => handleFilterChange(filter.key, val)}
              />
            )
          })}

          {/* Reset Filters Button */}
          {(searchQuery || activeFiltersCount > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={() => {
                setSearchQuery('')
                if (externalOnFilterChange) {
                  filters.forEach((f) => externalOnFilterChange(f.key, f.isMulti ? [] : ''))
                } else {
                  setInternalFilters({})
                }
              }}
              className="text-muted-foreground hover:text-foreground h-9 gap-1 text-[13px]"
            >
              <RefreshCw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Right: Actions (Import, Export Excel, Export PDF, Add / Custom Header Actions) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Button with Modal */}
          {importFields && onImport && (
            <AdminImportDialog
              title={importTitle}
              fields={importFields}
              onConfirm={onImport}
              trigger={
                <Button variant="outline" size="dense" className="h-9 gap-1.5 font-medium">
                  <Upload className="size-3.5" />
                  Import
                </Button>
              }
            />
          )}

          {/* Export Excel Button */}
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 font-medium"
          >
            <FileSpreadsheet className="text-emerald-600 size-3.5" />
            Excel
          </Button>

          {/* Export PDF Button */}
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={() => setShowPdfModal(true)}
            className="h-9 gap-1.5 font-medium"
          >
            <FileText className="text-rose-600 size-3.5" />
            PDF
          </Button>

          {/* Custom Header Actions (e.g. Tambah Data) */}
          {headerActions}
        </div>
      </div>

      {/* 2. Floating / Docked Bulk Actions Bar */}
      {showSelection && selectedIds.size > 0 && (
        <div className="animate-in fade-in slide-in-from-top-1 border-primary/20 bg-primary/5 flex items-center justify-between rounded-xl border px-4 py-2 text-sm shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
              {selectedIds.size}
            </span>
            <span className="text-foreground font-medium">
              {selectedIds.size} baris data dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onBulkEdit && (
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => onBulkEdit(Array.from(selectedIds), selectedRows)}
                className="h-9 gap-1.5 bg-white font-medium shadow-none"
              >
                <Edit3 className="size-3.5 text-blue-600" />
                Bulk Edit
              </Button>
            )}

            {onBulkDelete && (
              <Button
                type="button"
                variant="destructive"
                size="dense"
                onClick={() => onBulkDelete(Array.from(selectedIds), selectedRows)}
                className="h-9 gap-1.5 font-medium"
              >
                <Trash2 className="size-3.5" />
                Hapus Terpilih
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground h-9 text-xs"
            >
              Batalkan
            </Button>
          </div>
        </div>
      )}

      {/* 3. The Core Standard Shadcn Table */}
      <div className="border-border/70 relative w-full overflow-hidden rounded-xl border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b">
              <TableRow className="hover:bg-transparent">
                {/* Checkbox Select All Column */}
                {showSelection && (
                  <TableHead className="w-[44px] px-3 text-center align-middle">
                    <Checkbox
                      checked={allCurrentPageSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAllCurrentPage}
                      aria-label="Pilih semua baris di halaman ini"
                      className="size-4"
                    />
                  </TableHead>
                )}

                {/* Data Columns */}
                {columns.map((col) => {
                  const isSorted = sortConfig.key === col.key
                  const isSortable = col.sortable !== false

                  return (
                    <TableHead
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        'h-10 text-[11px] font-semibold uppercase tracking-wider text-slate-600 select-none',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className
                      )}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            'group inline-flex items-center gap-1.5 font-semibold text-slate-700 transition-colors hover:text-slate-900',
                            col.align === 'center' && 'justify-center mx-auto',
                            col.align === 'right' && 'justify-end ml-auto'
                          )}
                        >
                          <span>{col.header}</span>
                          <span className="text-slate-400 group-hover:text-slate-600">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="size-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="size-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3 opacity-50" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </TableHead>
                  )
                })}

                {/* Row Action Column */}
                {renderRowActions && (
                  <TableHead className="w-[90px] text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showSelection ? 1 : 0) + (renderRowActions ? 1 : 0)}
                    className="h-32 text-center text-sm text-slate-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-blue-600" />
                      <span>Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showSelection ? 1 : 0) + (renderRowActions ? 1 : 0)}
                    className="h-32 text-center text-sm text-slate-500"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const id = String(row[idField])
                  const isSelected = selectedIds.has(id)

                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        'transition-colors duration-150',
                        isSelected && 'bg-blue-50/50',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {/* Checkbox Row Selection */}
                      {showSelection && (
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="w-[44px] px-3 text-center align-middle"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(id)}
                            aria-label={`Pilih baris ${id}`}
                            className="size-4"
                          />
                        </TableCell>
                      )}

                      {/* Data Columns */}
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'py-2.5 text-[13px] text-slate-800',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                            col.className
                          )}
                        >
                          {col.render ? col.render(row, index) : (row[col.key] ?? '-')}
                        </TableCell>
                      ))}

                      {/* Row Actions */}
                      {renderRowActions && (
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="py-2.5 text-right whitespace-nowrap"
                        >
                          {renderRowActions(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Unified Pagination Bar */}
        {showPagination && (
          <div className="border-border/70 flex flex-col gap-3 border-t bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Row Counter Info & Page Size Selector */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div>
                Menampilkan{' '}
                <span className="font-semibold text-slate-800">
                  {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                -{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * pageSize, totalRows)}
                </span>{' '}
                dari <span className="font-semibold text-slate-800">{totalRows}</span> data
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Baris:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] rounded-md border-slate-300 bg-white text-xs">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Pagination Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="dense"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                aria-label="Halaman pertama"
                className="size-8 p-0"
              >
                <ChevronsLeft className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="dense"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                aria-label="Halaman sebelumnya"
                className="size-8 p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="px-2 text-xs font-medium text-slate-700">
                Hal {currentPage} dari {totalPages}
              </div>

              <Button
                variant="outline"
                size="dense"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                aria-label="Halaman berikutnya"
                className="size-8 p-0"
              >
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="dense"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                aria-label="Halaman terakhir"
                className="size-8 p-0"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. PDF Export / Print Preview Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-4xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{pdfTitle}</span>
              <Button
                type="button"
                variant="default"
                size="dense"
                onClick={() => window.print()}
                className="h-9 gap-1.5"
              >
                <Printer className="size-3.5" />
                Cetak Dokumen
              </Button>
            </DialogTitle>
            <DialogDescription>
              Pratinjau cetak resmi standar format dokumen A4 HERO.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Layout Wrapper */}
          <div className="pdf-wrapper border-border/80 max-h-[60vh] overflow-y-auto rounded-lg border bg-white p-6 shadow-inner">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">PT CHITRA PARATAMA</h2>
                <p className="text-xs text-slate-500">Sistem Operasional HERO Desktop - Cetak Laporan</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                <p>Total Data: {filteredData.length} baris</p>
              </div>
            </div>

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-100">
                  <th className="p-2 text-center w-10">No</th>
                  {columns.map((col) => (
                    <th key={col.key} className="p-2 font-semibold text-slate-800">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="p-2 text-slate-700">
                        {col.exportValue ? col.exportValue(row) : String(row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length > 50 && (
              <p className="mt-3 text-center text-xs italic text-slate-400">
                (Menampilkan 50 data pertama untuk pratinjau cetak...)
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={() => setShowPdfModal(false)}
              className="h-9"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Searchable Filter Dropdown Component
 * Features inside-search, multi-check or single-select, and clean badge counter.
 */
function SearchableTableFilterDropdown({
  filter,
  value,
  onChange,
}: {
  filter: HeroTableFilter
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const isMulti = filter.isMulti !== false
  const activeSelected = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (value) return [value]
    return []
  }, [value])

  const filteredOptions = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return filter.options
    return filter.options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [filter.options, search])

  const toggleOption = (optVal: string) => {
    if (isMulti) {
      if (activeSelected.includes(optVal)) {
        onChange(activeSelected.filter((v) => v !== optVal))
      } else {
        onChange([...activeSelected, optVal])
      }
    } else {
      onChange(activeSelected.includes(optVal) ? '' : optVal)
      setOpen(false)
    }
  }

  const selectedCount = activeSelected.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="dense"
          className={cn(
            'border-border/70 text-foreground h-9 gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium shadow-none hover:bg-slate-50',
            selectedCount > 0 && 'border-blue-400 bg-blue-50/40 text-blue-800'
          )}
        >
          <Filter className="text-muted-foreground size-3.5" />
          <span>{filter.label}</span>
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="text-muted-foreground ml-0.5 size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-2 shadow-lg z-50">
        {/* Search inside filter */}
        <div className="relative mb-2">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari ${filter.label}...`}
            className="h-8 rounded-md pl-7 text-xs"
          />
        </div>

        {/* Options List */}
        <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-2 text-center text-xs text-slate-500">Tidak ada opsi</div>
          ) : (
            filteredOptions.map((opt) => {
              const isChecked = activeSelected.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className="hover:bg-slate-100 flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isChecked} className="size-3.5" />
                    <span>{opt.label}</span>
                  </div>
                  {isChecked && <Check className="size-3 text-blue-600" />}
                </div>
              )
            })
          )}
        </div>

        {/* Footer: Clear Filter */}
        {selectedCount > 0 && (
          <div className="mt-2 border-t pt-1.5 text-right">
            <button
              type="button"
              onClick={() => onChange(isMulti ? [] : '')}
              className="text-[11px] font-medium text-rose-600 hover:underline"
            >
              Hapus Filter
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
