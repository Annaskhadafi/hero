'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Download, Edit, FileText, Trash2, Users, MapPin } from 'lucide-react'
import { jsPDF } from 'jspdf'

import { deleteQuotation } from '@/app/actions/service360'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { QuotationPreviewDialog } from './quotation-preview-dialog'
import { QuotationStatusSelect } from './quotation-status-select'
import { QuotationPoEdit } from './quotation-po-edit'
import { QuotationPoUpload } from './quotation-po-upload'

type QuotationSummaryRow = {
  id: number
  quotationNumber: string
  quotationDate: string
  customerName: string
  poNumber: string
  totalAmount: number
  site: string
  period: string
  status: string
  poFileUrl: string
}

function formatCurrency(value: number) {
  return value.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID')
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function abbreviatePeriod(period: string) {
  if (!period) return '-'
  return period.replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_, y, m, d) => `${Number(d)} ${SHORT_MONTHS[Number(m) - 1]} ${y}`
  )
}

function QuotationRowActions({ row, onDeleted }: { row: QuotationSummaryRow; onDeleted: (id: number) => void }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <div className="flex gap-2">
      <QuotationPreviewDialog quotationId={row.id} />
      <Link href={`/dashboard/360-service/quotations/${row.id}?download=true`}>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Download PDF">
          <Download className="h-4 w-4 text-teal-600" />
        </Button>
      </Link>
      <Link href={`/dashboard/360-service/quotations/${row.id}/edit`}>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Edit">
          <Edit className="h-4 w-4 text-blue-600" />
        </Button>
      </Link>
      <Link href={`/dashboard/360-service/quotations/create?duplicate=${row.id}`}>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Duplicate">
          <Copy className="h-4 w-4 text-amber-600" />
        </Button>
      </Link>
      <Button
        variant="destructive"
        size="icon"
        className="h-8 w-8"
        title="Delete"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Delete quotation ${row.quotationNumber}?`)) return
          onDeleted(row.id)
          startTransition(async () => {
            await deleteQuotation(row.id)
            router.refresh()
          })
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function QuotationsSummaryTable({ rows: initialRows }: { rows: QuotationSummaryRow[] }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deletedIds, setDeletedIds] = useState<number[]>([])

  const rows = useMemo(
    () => initialRows.filter((r) => !deletedIds.includes(r.id)),
    [initialRows, deletedIds]
  )

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds]
  )
  const allSelected = rows.length > 0 && selectedIds.length === rows.length

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)
    )
  }

  const customerOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.customerName).filter(Boolean))).sort(),
    [rows]
  )
  const siteOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.site).filter(Boolean))).sort(),
    [rows]
  )
  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(),
    [rows]
  )
  const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + r.totalAmount, 0), [rows])

  const downloadSummaryPdf = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const left = 14
    const right = pageW - 14
    const colGap = 1

    const columns = [
      { label: 'No', key: 'no' as const, width: 8 },
      { label: 'No Quotation', key: 'quotationNumber' as const, width: 36 },
      { label: 'Date', key: 'quotationDate' as const, width: 20 },
      { label: 'Customer', key: 'customerName' as const, width: 44 },
      { label: 'PO Customer', key: 'poNumber' as const, width: 28 },
      { label: 'Total Amount', key: 'totalAmount' as const, width: 32 },
      { label: 'Site', key: 'site' as const, width: 32 },
      { label: 'Periode', key: 'period' as const, width: 34 },
      { label: 'Status', key: 'status' as const, width: 20 },
    ]
    const tableW = columns.reduce((sum, c) => sum + c.width + colGap, -colGap)
    const tableLeft = left + (right - left - tableW) / 2

    const HEADER_BG: [number, number, number] = [241, 245, 249]
    const HEADER_FG: [number, number, number] = [15, 23, 42]
    const ALT_ROW: [number, number, number] = [248, 250, 252]
    const BORDER_COLOR: [number, number, number] = [148, 163, 184]
    const TEXT_COLOR: [number, number, number] = [15, 23, 42]
    const MUTED: [number, number, number] = [100, 116, 139]

    const FONT_SIZE = 7
    const HEADER_FONT_SIZE = 7.5
    const LINE_H = 3.5
    const ROW_PAD_TOP = 1.5
    const ROW_PAD_BOT = 1.5
    const HEADER_ROW_H = 8
    const MARGIN_TOP = 12
    const FOOTER_H = 10
    const TOTAL_ROW_H = 8

    let y = MARGIN_TOP
    let pageNum = 1

    const wrapText = (text: string, maxWidth: number): string[] => {
      return pdf.splitTextToSize(text || '-', maxWidth)
    }

    const calcRowHeight = (row: QuotationSummaryRow): number => {
      let maxLines = 1
      const vals = [
        String(row.id),
        row.quotationNumber,
        formatDate(row.quotationDate),
        row.customerName || '-',
        row.poNumber || '-',
        formatCurrency(row.totalAmount),
        row.site || '-',
        row.period || '-',
        row.status,
      ]
      columns.forEach((col, i) => {
        const lines = wrapText(vals[i], col.width - 3)
        maxLines = Math.max(maxLines, lines.length)
      })
      return maxLines * LINE_H + ROW_PAD_TOP + ROW_PAD_BOT
    }

    const drawPageHeader = () => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(...TEXT_COLOR)
      pdf.text('Quotation Summary', left, y)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.5)
      pdf.setTextColor(...MUTED)
      const now = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      pdf.text(`Dicetak: ${now}`, right, y, { align: 'right' })
      y += 3

      pdf.setDrawColor(...BORDER_COLOR)
      pdf.setLineWidth(0.2)
      pdf.line(left, y, right, y)
      y += 6
    }

    const drawFooter = (page: number, total: number) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(5.5)
      pdf.setTextColor(...MUTED)
      pdf.text(`Halaman ${page} dari ${total}`, right, pageH - 5, { align: 'right' })
      pdf.text('PT HERO - Quotation Summary Report', left, pageH - 5)
    }

    const drawTableHeader = (yPos: number) => {
      let hx = tableLeft
      columns.forEach((col) => {
        pdf.setFillColor(...HEADER_BG)
        pdf.setDrawColor(...BORDER_COLOR)
        pdf.setLineWidth(0.15)
        pdf.rect(hx, yPos, col.width, HEADER_ROW_H, 'DF')

        pdf.setFontSize(HEADER_FONT_SIZE)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...HEADER_FG)

        const isRight = col.key === 'no' || col.key === 'totalAmount'
        const textX = isRight ? hx + col.width - 2 : hx + 2
        const align: 'left' | 'right' = isRight ? 'right' : 'left'
        pdf.text(col.label, textX, yPos + 5.5, { align })
        hx += col.width + colGap
      })
    }

    const drawTotalRow = (yPos: number, grandTotal: number) => {
      pdf.setFillColor(226, 232, 240)
      pdf.setDrawColor(...BORDER_COLOR)
      pdf.setLineWidth(0.2)
      pdf.rect(tableLeft, yPos, tableW, TOTAL_ROW_H, 'DF')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(FONT_SIZE)
      pdf.setTextColor(...TEXT_COLOR)
      const labelW = columns.slice(0, 4).reduce((s, c) => s + c.width + colGap, -colGap)
      pdf.text('TOTAL', tableLeft + labelW - 2, yPos + 5.5, { align: 'right' })

      const amountX = tableLeft + columns.slice(0, 5).reduce((s, c) => s + c.width + colGap, -colGap)
      const amountW = columns[5].width
      pdf.text(formatCurrency(grandTotal), amountX + amountW - 2, yPos + 5.5, { align: 'right' })
    }

    const drawRow = (row: QuotationSummaryRow, idx: number, yPos: number, rowH: number) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(...ALT_ROW)
        pdf.rect(tableLeft, yPos, tableW, rowH, 'F')
      }

      const cellValues: Record<string, string> = {
        no: String(idx + 1),
        quotationNumber: row.quotationNumber,
        quotationDate: formatDate(row.quotationDate),
        customerName: row.customerName || '-',
        poNumber: row.poNumber || '-',
        totalAmount: formatCurrency(row.totalAmount),
        site: row.site || '-',
        period: abbreviatePeriod(row.period),
        status: row.status,
      }

      let cx = tableLeft
      columns.forEach((col) => {
        const val = cellValues[col.key]
        const isRight = col.key === 'no' || col.key === 'totalAmount'
        const align: 'left' | 'right' = isRight ? 'right' : 'left'
        const textX = isRight ? cx + col.width - 2 : cx + 2
        const maxW = col.width - 4

        const lines = wrapText(val, maxW)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(FONT_SIZE)
        pdf.setTextColor(...TEXT_COLOR)
        const startY = yPos + ROW_PAD_TOP + LINE_H - 0.3
        lines.forEach((line, li) => {
          pdf.text(line, textX, startY + li * LINE_H, { align })
        })

        cx += col.width + colGap
      })
    }

    drawPageHeader()
    drawTableHeader(y)
    y += HEADER_ROW_H + 1

    const grandTotal = selectedRows.reduce((s, r) => s + r.totalAmount, 0)
    const needsTotalRow = selectedRows.length > 1
    const spaceForFooter = FOOTER_H + 4
    const spaceForTotal = needsTotalRow ? TOTAL_ROW_H + 2 : 0

    selectedRows.forEach((row, idx) => {
      const rowH = calcRowHeight(row)
      const totalNeeded = rowH + spaceForTotal
      const remaining = pageH - y - spaceForFooter

      if (y + totalNeeded > pageH - spaceForFooter || (idx > 0 && remaining < totalNeeded)) {
        if (needsTotalRow) {
          drawTotalRow(y, grandTotal)
          y += TOTAL_ROW_H + 2
        }
        drawFooter(pageNum, Math.ceil(selectedRows.length / 10) + 1)
        pdf.addPage()
        pageNum++
        y = MARGIN_TOP
        drawPageHeader()
        drawTableHeader(y)
        y += HEADER_ROW_H + 1
      }

      drawRow(row, idx, y, rowH)
      pdf.setDrawColor(...BORDER_COLOR)
      pdf.setLineWidth(0.1)
      pdf.rect(tableLeft, y, tableW, rowH, 'S')
      y += rowH
    })

    if (needsTotalRow) {
      y += 1
      drawTotalRow(y, grandTotal)
    }

    const totalPages = pageNum
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p)
      drawFooter(p, totalPages)
    }

    pdf.save('quotation-summary.pdf')
  }

  return (
    <MinimalTableShell
      label="Quotations"
      fileName="quotation-list"
      searchPlaceholder="Cari quotation, customer, PO..."
      filters={
        <>
          <TableMultiFilter
            label="Customer"
            filterKey="customer"
            options={customerOptions.map((c) => ({ value: c, label: c }))}
          />
          <TableMultiFilter
            label="PO"
            filterKey="po"
            options={rows.map((r) => r.poNumber).filter(Boolean).map((p) => ({ value: p, label: p }))}
          />
          <TableMultiFilter
            label="Site"
            filterKey="site"
            options={siteOptions.map((s) => ({ value: s, label: s }))}
          />
          <TableMultiFilter
            label="Status"
            filterKey="status"
            options={statusOptions.map((s) => ({ value: s, label: s }))}
          />
        </>
      }
      scorecards={[
        {
          label: 'Total Quotation',
          value: rows.length,
          description: 'Seluruh quotation',
          icon: <FileText className="size-4 text-primary" />,
          tone: 'info',
        },
        {
          label: 'Total Nilai',
          value: formatCurrency(totalAmount),
          description: 'Akumulasi seluruh quotation',
          tone: 'default',
        },
        {
          label: 'Customer',
          value: customerOptions.length,
          description: 'Customer unik',
          icon: <Users className="size-4 text-emerald-600" />,
          tone: 'success',
        },
        {
          label: 'Site',
          value: siteOptions.length,
          description: 'Site aktif',
          icon: <MapPin className="size-4 text-amber-600" />,
          tone: 'warning',
        },
      ]}
      columnOptions={[
        { key: 'quotationNumber', label: 'Quotation No', required: true },
        { key: 'quotationDate', label: 'Date' },
        { key: 'customerName', label: 'Customer' },
        { key: 'poNumber', label: 'PO Customer' },
        { key: 'totalAmount', label: 'Total Amount' },
        { key: 'site', label: 'Site' },
        { key: 'period', label: 'Periode' },
        { key: 'status', label: 'Status' },
      ]}
      tableViewportClassName="max-h-[72vh]"
      dateFilter
    >
      <div className="bg-surface-container-low mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2">
        <span className="text-muted-foreground text-sm">
          {selectedIds.length} quotation selected
        </span>
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={selectedRows.length === 0}
          onClick={downloadSummaryPdf}
        >
          <FileText className="h-4 w-4" />
          PDF Summary
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all quotations"
                checked={allSelected ? true : selectedIds.length > 0 ? 'indeterminate' : false}
                onCheckedChange={(checked) =>
                  setSelectedIds(checked === true ? rows.map((row) => row.id) : [])
                }
              />
            </TableHead>
            <TableHead>Quotation No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>PO Customer</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              data-filter-customer={row.customerName}
              data-filter-po={row.poNumber ?? ''}
              data-filter-site={row.site}
              data-filter-status={row.status}
              data-date-value={row.quotationDate}
            >
              <TableCell>
                <Checkbox
                  aria-label={`Select quotation ${row.quotationNumber}`}
                  checked={selectedIds.includes(row.id)}
                  onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                />
              </TableCell>
              <TableCell className="font-medium">{row.quotationNumber}</TableCell>
              <TableCell>{formatDate(row.quotationDate)}</TableCell>
              <TableCell>{row.customerName || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <QuotationPoEdit quotationId={row.id} value={row.poNumber} />
                  <QuotationPoUpload quotationId={row.id} poFileUrl={row.poFileUrl} />
                </div>
              </TableCell>
              <TableCell>{formatCurrency(row.totalAmount)}</TableCell>
              <TableCell>{row.site || '-'}</TableCell>
              <TableCell>{abbreviatePeriod(row.period)}</TableCell>
              <TableCell>
                <QuotationStatusSelect quotationId={row.id} initialStatus={row.status} />
              </TableCell>
              <TableCell>
                <QuotationRowActions row={row} onDeleted={(id) => setDeletedIds((prev) => [...prev, id])} />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                No quotations found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </MinimalTableShell>
  )
}
