"use client"

import * as React from "react"
import { format, isAfter, isBefore, endOfDay, startOfDay, subDays } from "date-fns"
import { type DateRange } from "react-day-picker"
import {
  IconCalendar,
  IconChevronDown,
  IconDots,
  IconFileSpreadsheet,
  IconRotate,
  IconSearch,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  januari: 0,
  feb: 1,
  february: 1,
  februari: 1,
  mar: 2,
  march: 2,
  maret: 2,
  apr: 3,
  april: 3,
  may: 4,
  mei: 4,
  jun: 5,
  june: 5,
  juni: 5,
  jul: 6,
  july: 6,
  juli: 6,
  aug: 7,
  august: 7,
  agustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oct: 9,
  october: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  desember: 11,
}

function buildExcelHtml(rows: string[][]) {
  const header = rows[0] ?? []
  const body = rows.slice(1)

  const renderCells = (cells: string[], tag: "td" | "th") =>
    cells
      .map((cell) => `<${tag}>${cell.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</${tag}>`)
      .join("")

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <thead><tr>${renderCells(header, "th")}</tr></thead>
          <tbody>${body.map((row) => `<tr>${renderCells(row, "td")}</tr>`).join("")}</tbody>
        </table>
      </body>
    </html>
  `.trim()
}

function downloadText(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function normalizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "table-export"
}

function parseNumericDate(text: string) {
  const match = text.match(
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[,\s]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/,
  )

  if (!match) {
    return null
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match
  const yearNumber = Number(year)
  const fullYear = yearNumber < 100 ? 2000 + yearNumber : yearNumber
  const parsed = new Date(
    fullYear,
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseNamedMonthDate(text: string) {
  const match = text.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[,\s]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/,
  )

  if (!match) {
    return null
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match
  const monthIndex = MONTH_LOOKUP[month.toLowerCase()]
  if (monthIndex == null) {
    return null
  }

  const parsed = new Date(
    Number(year),
    monthIndex,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function parseTableDate(value: string | null | undefined) {
  const text = value?.replace(/\u00a0/g, " ").trim()

  if (!text) {
    return null
  }

  const directDate = new Date(text)
  if (!Number.isNaN(directDate.getTime())) {
    return directDate
  }

  return parseNumericDate(text) ?? parseNamedMonthDate(text)
}

export function matchesDateRange(
  value: Date | string | null | undefined,
  range?: DateRange,
) {
  if (!range?.from && !range?.to) {
    return true
  }

  const parsedDate =
    value instanceof Date ? value : typeof value === "string" ? parseTableDate(value) : null

  if (!parsedDate) {
    return true
  }

  const from = range.from ? startOfDay(range.from) : null
  const to = range.to ? endOfDay(range.to) : null

  if (from && isBefore(parsedDate, from)) {
    return false
  }

  if (to && isAfter(parsedDate, to)) {
    return false
  }

  return true
}

export function exportRowsToFile({
  columns,
  rows,
  fileName,
}: {
  columns: string[]
  rows: Array<Array<string | number | null | undefined>>
  fileName: string
  format?: "excel"
}) {
  const normalizedRows = [columns, ...rows.map((row) => row.map((cell) => `${cell ?? ""}`))]
  const baseName = normalizeFileName(fileName)

  downloadText(
    buildExcelHtml(normalizedRows),
    `${baseName}.xls`,
    "application/vnd.ms-excel;charset=utf-8",
  )
}

export function TableDateRangePicker({
  value,
  onChange,
}: {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
}) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "dd MMM yyyy")} - ${format(value.to, "dd MMM yyyy")}`
      : format(value.from, "dd MMM yyyy")
    : "Date"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 min-w-[104px] justify-start rounded-lg border-0 bg-white px-3 text-left text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        >
          <IconCalendar className="size-4 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => onChange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}>
            Hari ini
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange({ from: subDays(new Date(), 6), to: new Date() })}>
            7 hari
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange({ from: subDays(new Date(), 29), to: new Date() })}>
            30 hari
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Reset
          </Button>
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export function TableActionMenu({
  onReset,
  onSetDateRange,
  showDatePresets = true,
}: {
  onReset: () => void
  onSetDateRange: (value: DateRange | undefined) => void
  showDatePresets?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
        >
          <IconDots className="size-4" />
          Action
          <IconChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {showDatePresets ? (
          <>
            <DropdownMenuItem onClick={() => onSetDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}>
              Filter hari ini
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetDateRange({ from: subDays(new Date(), 6), to: new Date() })}>
              Filter 7 hari terakhir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetDateRange({ from: subDays(new Date(), 29), to: new Date() })}>
              Filter 30 hari terakhir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={onReset}>
          Reset filter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type MinimalTableShellProps = {
  title?: string
  description?: string
  label: string
  fileName?: string
  searchPlaceholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  searchEnabled?: boolean
  className?: string
  summaryClassName?: string
  dateFilter?: boolean | "auto"
}

type TableSnapshot = {
  table: Element
  headerCells: string[]
  emptyRows: HTMLTableRowElement[]
  dataRows: HTMLTableRowElement[]
}

export function MinimalTableShell({
  title,
  description,
  label,
  fileName,
  searchPlaceholder,
  filters,
  actions,
  children,
  searchEnabled = true,
  className,
  summaryClassName,
  dateFilter = "auto",
}: MinimalTableShellProps) {
  const shellRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [dateFilterSupported, setDateFilterSupported] = React.useState(dateFilter === true)
  const [visibleCount, setVisibleCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [showNoResults, setShowNoResults] = React.useState(false)

  const isDateHeader = React.useEffectEvent((value: string) =>
    /\b(date|tanggal|time|waktu|created|updated|submitted|deadline|expiry|expired|reported|event time|join)\b/i.test(value),
  )

  const supportsDateFilter = React.useEffectEvent((snapshot: TableSnapshot) => {
    if (dateFilter === true) {
      return true
    }

    if (dateFilter === false) {
      return false
    }

    const hasDateHeader = snapshot.headerCells.some((cell) => isDateHeader(cell))
    const hasDateData = snapshot.dataRows.some((row) =>
      Boolean(row.dataset.dateValue ?? row.querySelector<HTMLElement>("[data-date-value]")?.dataset.dateValue),
    )

    return hasDateHeader || hasDateData
  })

  const getTableSnapshot = React.useEffectEvent((): TableSnapshot | null => {
    const root = shellRef.current
    if (!root) {
      return null
    }

    const table = root.querySelector("table")
    if (!table) {
      return null
    }

    const headerCells = Array.from(table.querySelectorAll("thead th"))
      .map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean)

    const bodyRows = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[]
    const emptyRows = bodyRows.filter((row) => {
      const cells = Array.from(row.cells)
      return cells.length === 1 && cells[0]?.colSpan > 1
    })
    const dataRows = bodyRows.filter((row) => !emptyRows.includes(row))

    return { table, headerCells, emptyRows, dataRows }
  })

  const applyFilters = React.useEffectEvent(() => {
    const snapshot = getTableSnapshot()
    if (!snapshot) {
      return
    }

    const dateFilterActive = supportsDateFilter(snapshot)
    setDateFilterSupported(dateFilterActive)

    const normalizedQuery = query.trim().toLowerCase()
    let nextVisibleCount = 0

    snapshot.dataRows.forEach((row) => {
      const searchText = row.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? ""
      const rowDate =
        row.dataset.dateValue ??
        row.querySelector<HTMLElement>("[data-date-value]")?.dataset.dateValue ??
        undefined

      const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery)
      const matchesDate = dateFilterActive ? matchesDateRange(rowDate ?? searchText, dateRange) : true
      const shouldShow = matchesQuery && matchesDate

      row.toggleAttribute("hidden", !shouldShow)
      if (shouldShow) {
        nextVisibleCount += 1
      }
    })

    snapshot.emptyRows.forEach((row) => {
      row.toggleAttribute("hidden", snapshot.dataRows.length > 0)
    })

    setTotalCount(snapshot.dataRows.length)
    setVisibleCount(nextVisibleCount)
    setShowNoResults(snapshot.dataRows.length > 0 && nextVisibleCount === 0)
  })

  React.useEffect(() => {
    applyFilters()
  }, [applyFilters, query, dateRange, children])

  React.useEffect(() => {
    if (!dateFilterSupported && (dateRange?.from || dateRange?.to)) {
      setDateRange(undefined)
    }
  }, [dateFilterSupported, dateRange])

  React.useEffect(() => {
    const root = shellRef.current
    if (!root) {
      return
    }

    const observer = new MutationObserver(() => {
      applyFilters()
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [applyFilters])

  const handleReset = React.useCallback(() => {
    setQuery("")
    setDateRange(undefined)
  }, [])

  const exportVisibleTable = React.useCallback(
    () => {
      const snapshot = getTableSnapshot()
      if (!snapshot) {
        return
      }

      const rows = snapshot.dataRows
        .filter((row) => !row.hasAttribute("hidden"))
        .map((row) =>
          Array.from(row.cells).map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? ""),
        )

      exportRowsToFile({
        columns: snapshot.headerCells,
        rows,
        fileName: fileName ?? label,
      })
    },
    [fileName, getTableSnapshot, label],
  )

  return (
    <div className={cn("space-y-4", className)}>
      {title || description ? (
        <div className="space-y-1">
          {title ? <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}

      <div className="rounded-[1rem] bg-surface-container-low p-2 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {searchEnabled ? (
              <div className="relative w-full sm:w-[220px] sm:flex-none">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder ?? `Search ${label}...`}
                  className="h-9 rounded-lg border-0 bg-white pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
                />
              </div>
            ) : null}
            {filters}
            {dateFilterSupported ? <TableDateRangePicker value={dateRange} onChange={setDateRange} /> : null}
            {(query || dateRange?.from || dateRange?.to) ? (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-9 rounded-lg px-3 text-[13px] font-medium normal-case tracking-normal text-muted-foreground"
              >
                <IconRotate className="size-4" />
                Reset
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <TableActionMenu onReset={handleReset} onSetDateRange={setDateRange} showDatePresets={dateFilterSupported} />
            <Button
              variant="outline"
              onClick={() => exportVisibleTable()}
              className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
            >
              <IconFileSpreadsheet className="size-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 rounded-[0.95rem] bg-surface-container-lowest px-3 py-2 text-sm text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] sm:flex-row sm:items-center sm:justify-between",
          summaryClassName,
        )}
      >
        <span>
          Showing {visibleCount} of {totalCount} {label}
        </span>
        {dateFilterSupported && dateRange?.from ? (
          <Badge variant="outline" className="w-fit rounded-full border-0 bg-surface-container-low px-3 py-1">
            {dateRange.to
              ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
              : format(dateRange.from, "dd MMM yyyy")}
          </Badge>
        ) : null}
      </div>

      <div ref={shellRef} className="space-y-3">
        {children}
        {showNoResults ? (
          <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-8 text-center text-sm text-muted-foreground">
            Tidak ada data yang cocok dengan filter table ini.
          </div>
        ) : null}
      </div>
    </div>
  )
}
