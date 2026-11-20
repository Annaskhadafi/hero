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
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
  label?: string
  title?: string
  options: HeroTableFilterOption[]
  isMulti?: boolean
}

export interface HeroDataTableProps<T> {
  data: T[]
  columns: HeroColumnDef<T>[]
  idField?: keyof T
  title?: string
  description?: string
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  searchableKeys?: (keyof T)[]
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
  exportFilename?: string
  pdfTitle?: string
  renderRowActions?: (row: T) => React.ReactNode
  headerActions?: React.ReactNode
  loading?: boolean
  emptyMessage?: string
  emptyTitle?: string
  emptyDescription?: string
  enableSorting?: boolean
  enableExport?: boolean
  showSelection?: boolean
  showPagination?: boolean
  defaultPageSize?: number
}

export function HeroDataTable<T extends Record<string, any>>({
  data,
  columns,
  idField = 'id' as keyof T,
  title,
  description,
  searchPlaceholder = 'Cari data...',
  searchKeys,
  searchableKeys,
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
  exportFilename,
  pdfTitle = 'Laporan Data Operasional HERO',
  renderRowActions,
  headerActions,
  loading = false,
  emptyMessage,
  emptyTitle,
  emptyDescription,
  enableSorting = true,
  enableExport = true,
  showSelection = true,
  showPagination = true,
  defaultPageSize = 10,
}: HeroDataTableProps<T>) {
  const effectiveSearchKeys = searchKeys || searchableKeys
  const effectiveEmptyMessage = emptyMessage || emptyTitle || emptyDescription || 'Tidak ada data ditemukan.'
  const effectiveExportFileName = exportFilename || exportFileName || 'data-export'

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

  // PDF Preview Dialog State & Print Scope
  const [showPdfModal, setShowPdfModal] = React.useState(false)
  const [printScope, setPrintScope] = React.useState<'selected' | 'all'>('selected')
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)

  // Synchronize print scope whenever dialog opens or selected items change
  React.useEffect(() => {
    if (showPdfModal && selectedIds.size === 0 && printScope === 'selected') {
      setPrintScope('all')
    }
  }, [showPdfModal, selectedIds.size, printScope])

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
        if (effectiveSearchKeys && effectiveSearchKeys.length > 0) {
          return effectiveSearchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
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

  // Safe Row ID resolver
  const getRowId = React.useCallback(
    (row: T, index?: number): string => {
      if (idField && row[idField] !== undefined && row[idField] !== null) {
        return String(row[idField]);
      }
      if (row.id !== undefined && row.id !== null) {
        return String(row.id);
      }
      if (row.uuid !== undefined && row.uuid !== null) {
        return String(row.uuid);
      }
      if (row.code !== undefined && row.code !== null) {
        return String(row.code);
      }
      return index !== undefined ? `row-${index}` : String(Math.random());
    },
    [idField]
  );

  // Selection Logic
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row, idx) => selectedIds.has(getRowId(row, idx)))

  const isIndeterminate =
    paginatedData.some((row, idx) => selectedIds.has(getRowId(row, idx))) &&
    !allCurrentPageSelected

  const toggleSelectAllCurrentPage = () => {
    const next = new Set(selectedIds)
    if (allCurrentPageSelected) {
      paginatedData.forEach((row, idx) => next.delete(getRowId(row, idx)))
    } else {
      paginatedData.forEach((row, idx) => next.add(getRowId(row, idx)))
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
    if (selectedIds.size === 0) return []
    // Fast O(1) map of all original data by row ID to prevent losing selected rows during search/filtering
    const rowMap = new Map<string, T>()
    for (let i = 0; i < data.length; i++) {
      rowMap.set(getRowId(data[i], i), data[i])
    }

    // Preserve order: first prioritize rows that are in the current filteredData
    const result: T[] = []
    const addedIds = new Set<string>()

    for (let i = 0; i < filteredData.length; i++) {
      const id = getRowId(filteredData[i], i)
      if (selectedIds.has(id)) {
        result.push(filteredData[i])
        addedIds.add(id)
      }
    }

    // Then immediately append all other selected items from master data (e.g. filtered out by search query)
    selectedIds.forEach((id) => {
      if (!addedIds.has(id)) {
        const item = rowMap.get(id)
        if (item) {
          result.push(item)
          addedIds.add(id)
        }
      }
    })

    return result
  }, [data, filteredData, selectedIds, getRowId])

  // Data targeted for PDF Export / Print
  const printData = React.useMemo(() => {
    if (printScope === 'selected' && selectedIds.size > 0) {
      return selectedRows
    }
    return filteredData
  }, [printScope, selectedIds.size, selectedRows, filteredData])

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

  // Export to Excel Handler (.xlsx) - respects active row selection
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const targetData = selectedIds.size > 0 ? selectedRows : filteredData
      const exportCols = columns.map((c) => c.header)
      const exportRows = targetData.map((row) => {
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
      const suffix = selectedIds.size > 0 ? `-${selectedIds.size}-item-terpilih` : ''
      XLSX.writeFile(wb, `${exportFileName}${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Export Excel failed:', err)
    }
  }

  // Handle printing document in isolated iframe to prevent dialog clipping or background bleed
  const handlePrintDocument = React.useCallback(() => {
    const dataToPrint = printData

    if (dataToPrint.length === 0) return

    // Create an isolated iframe for clean, full-fidelity printing
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    const escapeHtml = (val: unknown) =>
      String(val ?? '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const isLandscape = columns.length > 5

    const rowsHtml = dataToPrint
      .map(
        (row, idx) => `
        <tr>
          <td style="text-align: center; color: #64748b; width: 40px;">${idx + 1}</td>
          ${columns
            .map((col) => {
              const val = col.exportValue ? col.exportValue(row) : (row[col.key] ?? '-')
              const align = col.align || 'left'
              return `<td style="text-align: ${align};">${escapeHtml(val)}</td>`
            })
            .join('')}
        </tr>`
      )
      .join('')

    const headersHtml = columns
      .map((col) => {
        const align = col.align || 'left'
        return `<th style="text-align: ${align};">${escapeHtml(col.header)}</th>`
      })
      .join('')

    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const isSelectedMode = printScope === 'selected' && selectedIds.size > 0

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(pdfTitle)}</title>
          <style>
            @page {
              size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #ffffff;
              font-size: 10px;
              line-height: 1.4;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #0f172a;
              margin: 0 0 2px 0;
            }
            .system-name {
              font-size: 10px;
              color: #475569;
              margin: 0;
            }
            .doc-title {
              font-size: 13px;
              font-weight: 700;
              color: #0369a1;
              margin: 4px 0 0 0;
            }
            .meta-box {
              text-align: right;
              font-size: 9.5px;
              color: #475569;
            }
            .meta-box p {
              margin: 2px 0;
            }
            .badge-selected {
              display: inline-block;
              background-color: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 9px;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.5px;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #f1f5f9;
              color: #0f172a;
              font-weight: 700;
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #334155;
              padding: 6px 8px;
              white-space: nowrap;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 5.5px 8px;
              color: #1e293b;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .footer-info {
              margin-top: 16px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="company-name">PT CHITRA PARATAMA</h1>
              <p class="system-name">HERO Operations Management System &bull; Dokumen Cetak Resmi</p>
              <h2 class="doc-title">${escapeHtml(pdfTitle)}</h2>
            </div>
            <div class="meta-box">
              <p><strong>Tanggal Cetak:</strong> ${escapeHtml(currentDateStr)}</p>
              <p><strong>Total Data:</strong> ${dataToPrint.length} baris</p>
              ${
                isSelectedMode
                  ? `<div class="badge-selected">&check; Mode Item Terpilih (${dataToPrint.length} item)</div>`
                  : ''
              }
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">No</th>
                ${headersHtml}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-info">
            <span>Dicetak secara otomatis dari Platform HERO Desktop</span>
            <span>Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')} WIB</span>
          </div>
        </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Iframe print failed, falling back to window.print():', err)
        window.print()
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1500)
      }
    }, 250)
  }, [printData, columns, pdfTitle, printScope, selectedIds.size])

  // Builds official high-fidelity vector PDF document using jsPDF
  const buildPdfDocument = React.useCallback(async () => {
    const dataToPrint = printData
    if (dataToPrint.length === 0) return null

    const { jsPDF } = await import('jspdf')
    const isLandscape = columns.length > 5
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const marginX = 12
    const marginY = 12
    const printableW = pageW - 2 * marginX
    const bottomLimit = pageH - 14

    // Calculate column widths
    const noColWidth = 10
    const remainingW = printableW - noColWidth

    const colWeights = columns.map((c) => {
      if (c.width) {
        const parsed = parseInt(c.width, 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
      return 100
    })
    const totalWeight = colWeights.reduce((a, b) => a + b, 0)
    const colWidths = colWeights.map((w) => (w / totalWeight) * remainingW)

    const isSelectedMode = printScope === 'selected' && selectedIds.size > 0
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let currentY = marginY

    const drawPageHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        // PT CHITRA PARATAMA Header
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(15, 23, 42)
        doc.text('PT CHITRA PARATAMA', marginX, currentY + 4)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text('HERO Desktop Operations • Dokumen Cetak & Ekspor Resmi', marginX, currentY + 8.5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(7, 83, 231)
        doc.text(pdfTitle, marginX, currentY + 14)

        // Metadata on top-right
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        const dateText = `Tanggal: ${currentDateStr}`
        const totalText = `Total: ${dataToPrint.length} baris ${isSelectedMode ? '(Item Terpilih)' : ''}`
        doc.text(dateText, pageW - marginX, currentY + 4, { align: 'right' })
        doc.text(totalText, pageW - marginX, currentY + 8.5, { align: 'right' })

        // Accent line
        doc.setDrawColor(7, 83, 231)
        doc.setLineWidth(0.6)
        doc.line(marginX, currentY + 16.5, pageW - marginX, currentY + 16.5)

        currentY += 19
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(15, 23, 42)
        doc.text(`${pdfTitle} (Lanjutan)`, marginX, currentY + 3)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text('PT Chitra Paratama', pageW - marginX, currentY + 3, { align: 'right' })

        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.3)
        doc.line(marginX, currentY + 5, pageW - marginX, currentY + 5)

        currentY += 7
      }

      // Draw Table Header
      const headerH = 7.5
      doc.setFillColor(241, 245, 249)
      doc.rect(marginX, currentY, printableW, headerH, 'F')

      doc.setDrawColor(51, 65, 85)
      doc.setLineWidth(0.3)
      doc.line(marginX, currentY + headerH, pageW - marginX, currentY + headerH)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(15, 23, 42)

      // Column 'No'
      doc.text('No', marginX + noColWidth / 2, currentY + 5, { align: 'center' })

      let xPos = marginX + noColWidth
      columns.forEach((col, idx) => {
        const cWidth = colWidths[idx]
        const align = col.align || 'left'
        let textX = xPos + 1.5
        if (align === 'center') textX = xPos + cWidth / 2
        else if (align === 'right') textX = xPos + cWidth - 1.5

        const headerStr = doc.splitTextToSize(col.header, cWidth - 3)[0] || col.header
        doc.text(headerStr, textX, currentY + 5, { align })
        xPos += cWidth
      })

      currentY += headerH
    }

    const drawFooters = () => {
      const totalPages = doc.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.line(marginX, pageH - 9, pageW - marginX, pageH - 9)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text('Dokumen Resmi HERO Desktop • PT Chitra Paratama', marginX, pageH - 5.5)
        doc.text(`Halaman ${p} dari ${totalPages}`, pageW - marginX, pageH - 5.5, { align: 'right' })
      }
    }

    drawPageHeader(true)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    for (let rIdx = 0; rIdx < dataToPrint.length; rIdx++) {
      const row = dataToPrint[rIdx]

      let maxLines = 1
      const cellTexts: string[][] = columns.map((col, idx) => {
        const rawVal = col.exportValue ? col.exportValue(row) : (row[col.key] ?? '-')
        const valStr = String(rawVal ?? '-')
        const lines = doc.splitTextToSize(valStr, colWidths[idx] - 3)
        if (lines.length > maxLines) maxLines = lines.length
        return lines
      })

      const rowH = Math.max(6.5, maxLines * 3.5 + 2.5)

      if (currentY + rowH > bottomLimit) {
        doc.addPage()
        currentY = marginY
        drawPageHeader(false)
      }

      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(marginX, currentY, printableW, rowH, 'F')
      }

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.15)
      doc.line(marginX, currentY + rowH, pageW - marginX, currentY + rowH)

      doc.setTextColor(100, 116, 139)
      doc.text(String(rIdx + 1), marginX + noColWidth / 2, currentY + 4, { align: 'center' })

      doc.setTextColor(30, 41, 59)
      let xPos = marginX + noColWidth

      columns.forEach((col, idx) => {
        const cWidth = colWidths[idx]
        const align = col.align || 'left'
        let textX = xPos + 1.5
        if (align === 'center') textX = xPos + cWidth / 2
        else if (align === 'right') textX = xPos + cWidth - 1.5

        const lines = cellTexts[idx]
        lines.forEach((lineText, lineIdx) => {
          doc.text(lineText, textX, currentY + 4 + lineIdx * 3.4, { align })
        })

        xPos += cWidth
      })

      currentY += rowH
    }

    drawFooters()
    return doc
  }, [printData, columns, pdfTitle, printScope, selectedIds.size])

  // Download PDF file directly (.pdf) without physical printing
  const handleDownloadPdf = React.useCallback(async () => {
    try {
      setIsGeneratingPdf(true)
      const doc = await buildPdfDocument()
      if (!doc) return

      const suffix = selectedIds.size > 0 && printScope === 'selected' ? `-${printData.length}-item-terpilih` : ''
      const fileName = `${effectiveExportFileName}${suffix}-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('Download PDF failed:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [buildPdfDocument, effectiveExportFileName, printData.length, printScope, selectedIds.size])

  // Preview PDF directly in new browser tab
  const handlePreviewPdfNewTab = React.useCallback(async () => {
    try {
      setIsGeneratingPdf(true)
      const doc = await buildPdfDocument()
      if (!doc) return

      const blob = doc.output('blob')
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
    } catch (err) {
      console.error('Preview PDF in new tab failed:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [buildPdfDocument])

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

          {/* Export Buttons (Excel & PDF) */}
          {enableExport && (
            <>
              {/* Export Excel Button */}
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={handleExportExcel}
                className="h-9 gap-1.5 font-medium"
                title={selectedIds.size > 0 ? `Export ${selectedIds.size} data terpilih ke Excel (.xlsx)` : 'Export ke Excel (.xlsx)'}
              >
                <FileSpreadsheet className="text-emerald-600 size-3.5" />
                Excel{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>

              {/* Export PDF Button */}
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => {
                  setPrintScope(selectedIds.size > 0 ? 'selected' : 'all')
                  setShowPdfModal(true)
                }}
                className="h-9 gap-1.5 font-medium"
                title={selectedIds.size > 0 ? `Cetak ${selectedIds.size} data terpilih ke PDF` : 'Cetak Dokumen PDF'}
              >
                <FileText className="text-rose-600 size-3.5" />
                PDF{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
            </>
          )}

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
            {enableExport && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={handleExportExcel}
                  className="h-9 gap-1.5 bg-white font-medium shadow-none"
                  title="Export data terpilih ke Excel"
                >
                  <FileSpreadsheet className="size-3.5 text-emerald-600" />
                  Excel ({selectedIds.size})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={() => {
                    setPrintScope('selected')
                    setShowPdfModal(true)
                  }}
                  className="h-9 gap-1.5 bg-white font-medium shadow-none"
                  title="Cetak data terpilih ke PDF"
                >
                  <FileText className="size-3.5 text-rose-600" />
                  PDF ({selectedIds.size})
                </Button>
              </>
            )}

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
                    {effectiveEmptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const id = getRowId(row, index)
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {pdfTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedIds.size > 0 && printScope === 'selected'
                    ? `Menyiapkan ${printData.length} baris data terpilih untuk dicetak dalam standar format resmi A4 HERO.`
                    : `Pratinjau cetak resmi standar format dokumen A4 HERO (${printData.length} baris data).`}
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={handlePrintDocument}
                  className="h-9 gap-1.5 text-xs font-medium"
                  title="Buka dialog print fisik printer"
                >
                  <Printer className="size-3.5 text-slate-600" />
                  Cetak Dokumen
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="dense"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  title="Download file PDF resmi ke komputer"
                >
                  {isGeneratingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Scope Selection Pill when rows are selected */}
            {selectedIds.size > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Cakupan Cetak:</span>
                  <div className="inline-flex rounded-lg border border-border/80 p-0.5 bg-slate-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setPrintScope('selected')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        printScope === 'selected'
                          ? "bg-white text-slate-900 shadow-xs font-semibold dark:bg-slate-900 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                      )}
                    >
                      Hanya {selectedIds.size} Data Terpilih
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintScope('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        printScope === 'all'
                          ? "bg-white text-slate-900 shadow-xs font-semibold dark:bg-slate-900 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                      )}
                    >
                      Semua Data ({filteredData.length})
                    </button>
                  </div>
                </div>

                <Badge variant={printScope === 'selected' ? "default" : "outline"} className="text-[11px]">
                  {printScope === 'selected' ? `${printData.length} Item Terpilih` : `${printData.length} Total Data`}
                </Badge>
              </div>
            )}
          </DialogHeader>

          {/* Printable Layout Wrapper - authentic document sheet */}
          <div className="pdf-wrapper border-border/80 max-h-[55vh] overflow-y-auto rounded-lg border bg-slate-100/70 p-4 shadow-inner">
            <div className="bg-white rounded-md shadow-sm border border-slate-200/90 p-5 sm:p-6 text-slate-900 min-w-[620px]">
              <div className="mb-4 flex items-start justify-between border-b-2 border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">PT CHITRA PARATAMA</h2>
                  <p className="text-xs text-slate-500">Sistem Operasional HERO Desktop - Cetak Laporan Resmi</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{pdfTitle}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                  <p>
                    Total Data: <span className="font-semibold text-slate-800">{printData.length} baris</span>
                    {selectedIds.size > 0 && printScope === 'selected' && (
                      <span className="ml-1 text-emerald-600 font-semibold">(Item Terpilih)</span>
                    )}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100">
                    <th className="p-2 text-center w-10 font-bold text-slate-800">No</th>
                    {columns.map((col) => (
                      <th key={col.key} className="p-2 font-bold text-slate-800" style={{ textAlign: col.align || 'left' }}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      {columns.map((col) => (
                        <td key={col.key} className="p-2 text-slate-700" style={{ textAlign: col.align || 'left' }}>
                          {col.exportValue ? col.exportValue(row) : String(row[col.key] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {printData.length > 50 && (
                <p className="mt-3 text-center text-xs italic text-slate-500 bg-slate-50 py-1.5 rounded border border-dashed border-slate-200">
                  (Menampilkan 50 data pertama untuk pratinjau modal. Seluruh {printData.length} baris akan diunduh/dicetak penuh saat menekan tombol &ldquo;Download PDF&rdquo; atau &ldquo;Cetak Dokumen&rdquo;.)
                </p>
              )}

              <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                <span>Dokumen Resmi HERO Desktop • PT Chitra Paratama</span>
                <span>Standar Dokumen A4 {columns.length > 5 ? 'Landscape' : 'Portrait'}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Format cetak resmi otomatis A4 {columns.length > 5 ? 'Landscape' : 'Portrait'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => setShowPdfModal(false)}
                className="h-9 text-xs"
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={handlePreviewPdfNewTab}
                disabled={isGeneratingPdf}
                className="h-9 gap-1.5 text-xs font-medium"
                title="Buka pratinjau PDF langsung di tab baru browser"
              >
                <ExternalLink className="size-3.5" />
                Lihat di Tab Baru
              </Button>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={handlePrintDocument}
                className="h-9 gap-1.5 text-xs font-semibold"
                title="Buka dialog cetak printer fisik"
              >
                <Printer className="size-3.5" />
                Cetak Fisik
              </Button>
              <Button
                type="button"
                variant="default"
                size="dense"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                title="Download file PDF langsung ke komputer"
              >
                {isGeneratingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                Download PDF ({printData.length})
              </Button>
            </div>
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
          <span>{filter.label || filter.title || filter.key}</span>
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
            placeholder={`Cari ${filter.label || filter.title || filter.key}...`}
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
