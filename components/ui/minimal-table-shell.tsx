"use client"

import * as React from "react"
import { format, isAfter, isBefore, endOfDay, startOfDay, subDays } from "date-fns"
import { type DateRange } from "react-day-picker"
import {
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconFileSpreadsheet,
  IconRotate,
  IconSearch,
} from "@tabler/icons-react"

import { AdminImportDialog } from "@/components/admin/admin-import-dialog"
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

function toDatasetSuffix(key: string) {
  return key
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^[A-Z]/, (character) => character.toLowerCase())
}

function normalizeFilterValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function normalizeCellText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? ""
}

function parseSortableNumber(value: string) {
  if (!/\d/.test(value)) {
    return null
  }

  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")

  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function compareCellValues(leftValue: string, rightValue: string) {
  const leftDate = parseTableDate(leftValue)
  const rightDate = parseTableDate(rightValue)
  if (leftDate && rightDate) {
    return leftDate.getTime() - rightDate.getTime()
  }

  const leftNumber = parseSortableNumber(leftValue)
  const rightNumber = parseSortableNumber(rightValue)
  if (leftNumber != null && rightNumber != null) {
    return leftNumber - rightNumber
  }

  return leftValue.localeCompare(rightValue, "id", { numeric: true, sensitivity: "base" })
}

function matchesDataFilter(row: HTMLTableRowElement, key: string, expectedValue: string) {
  if (!expectedValue) {
    return true
  }

  const datasetKey = `filter${toDatasetSuffix(key).charAt(0).toUpperCase()}${toDatasetSuffix(key).slice(1)}`
  const rawValue = row.dataset[datasetKey as keyof DOMStringMap]
  const normalizedExpectedValues = normalizeFilterValue(expectedValue)
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean)
  const normalizedActualValues = normalizeFilterValue(rawValue)
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean)

  if (normalizedActualValues.length === 0) {
    return true
  }

  return normalizedExpectedValues.some((expected) => normalizedActualValues.includes(expected))
}

function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "field"
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
  importAction?: React.ReactNode
  showImport?: boolean
  primaryAction?: React.ReactNode
  presets?: React.ReactNode
  children: React.ReactNode
  searchEnabled?: boolean
  className?: string
  summaryClassName?: string
  dateFilter?: boolean | "auto"
}

type TableSnapshot = {
  table: Element
  tbody: HTMLTableSectionElement
  headerCells: string[]
  emptyRows: HTMLTableRowElement[]
  dataRows: HTMLTableRowElement[]
}

function getHeaderLabel(cell: HTMLTableCellElement) {
  const clone = cell.cloneNode(true)
  if (!(clone instanceof HTMLElement)) {
    return cell.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }

  clone.querySelectorAll("[data-sort-indicator-id]").forEach((node) => node.remove())
  return clone.textContent?.replace(/\s+/g, " ").trim() ?? ""
}

export function MinimalTableShell({
  title,
  description,
  label,
  fileName,
  searchPlaceholder,
  filters,
  actions,
  importAction,
  showImport = true,
  primaryAction,
  presets,
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
  const [filteredCount, setFilteredCount] = React.useState(0)
  const [totalCount, setTotalCount] = React.useState(0)
  const [showNoResults, setShowNoResults] = React.useState(false)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [sortColumnIndex, setSortColumnIndex] = React.useState<number | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const sortColumnIndexRef = React.useRef<number | null>(null)
  const sortDirectionRef = React.useRef<"asc" | "desc">("asc")
  const [importFields, setImportFields] = React.useState<Array<{ key: string; label: string; required?: boolean }>>([
    { key: "primary", label: "Kolom utama", required: true },
  ])

  React.useEffect(() => {
    sortColumnIndexRef.current = sortColumnIndex
  }, [sortColumnIndex])

  React.useEffect(() => {
    sortDirectionRef.current = sortDirection
  }, [sortDirection])

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

    const tbody = table.querySelector("tbody")
    if (!(tbody instanceof HTMLTableSectionElement)) {
      return null
    }

    const headerCells = Array.from(table.querySelectorAll("thead th"))
      .map((cell) => getHeaderLabel(cell as HTMLTableCellElement))

    const bodyRows = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[]
    const emptyRows = bodyRows.filter((row) => {
      const cells = Array.from(row.cells)
      return cells.length === 1 && cells[0]?.colSpan > 1
    })
    const dataRows = bodyRows.filter((row) => !emptyRows.includes(row))

    return { table, tbody, headerCells, emptyRows, dataRows }
  })

  const wireSortableHeaders = React.useEffectEvent(() => {
    const snapshot = getTableSnapshot()
    if (!snapshot) {
      return
    }

    const headers = Array.from(snapshot.table.querySelectorAll("thead th")) as HTMLTableCellElement[]
    headers.forEach((header, index) => {
      if (header.dataset.sortReady !== "true") {
        header.dataset.sortReady = "true"
        header.tabIndex = 0
        header.style.cursor = "pointer"
        header.title = "Sort table"

        const handleSort = () => {
          const currentIndex = sortColumnIndexRef.current
          const currentDirection = sortDirectionRef.current

          if (currentIndex === index) {
            setSortDirection(currentDirection === "asc" ? "desc" : "asc")
            return
          }

          setSortColumnIndex(index)
          setSortDirection("asc")
        }

        header.addEventListener("click", handleSort)
        header.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleSort()
          }
        })
      }

      const indicatorId = `table-sort-indicator-${index}`
      let indicator = header.querySelector<HTMLElement>(`[data-sort-indicator-id="${indicatorId}"]`)
      if (!indicator) {
        indicator = document.createElement("span")
        indicator.dataset.sortIndicatorId = indicatorId
        indicator.className = "ml-2 inline-flex min-w-3.5 justify-center align-middle text-[10px] font-semibold text-muted-foreground"
        indicator.textContent = "↕"
        header.appendChild(indicator)
      }

      if (sortColumnIndex === index) {
        header.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending")
        indicator.className = "ml-2 inline-flex min-w-3.5 justify-center align-middle text-[10px] font-semibold text-foreground"
        indicator.textContent = sortDirection === "asc" ? "↑" : "↓"
      } else {
        header.setAttribute("aria-sort", "none")
        indicator.className = "ml-2 inline-flex min-w-3.5 justify-center align-middle text-[10px] font-semibold text-muted-foreground"
        indicator.textContent = "↕"
      }
    })
  })

  const applyFilters = React.useEffectEvent(() => {
    const snapshot = getTableSnapshot()
    if (!snapshot) {
      return
    }

    const nextImportFields = snapshot.headerCells
      .filter((header) => header && !/^(action|aksi)$/i.test(header))
      .map((header, index) => ({
        key: normalizeImportKey(header),
        label: header,
        required: index === 0,
      }))

    if (nextImportFields.length > 0) {
      setImportFields((current) => {
        const currentSignature = current.map((field) => `${field.key}:${field.label}:${field.required ? "1" : "0"}`).join("|")
        const nextSignature = nextImportFields.map((field) => `${field.key}:${field.label}:${field.required ? "1" : "0"}`).join("|")
        return currentSignature === nextSignature ? current : nextImportFields
      })
    }

    const dateFilterActive = supportsDateFilter(snapshot)
    setDateFilterSupported(dateFilterActive)
    const filterControls = Array.from(
      shellRef.current?.parentElement?.querySelectorAll<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>("[data-table-filter-key]") ?? [],
    )
    const activeFilters = filterControls
      .map((control) => ({
        key: control.dataset.tableFilterKey ?? "",
        value: "value" in control ? control.value : "",
      }))
      .filter((entry) => entry.key && entry.value)

    const normalizedQuery = query.trim().toLowerCase()
    const matchedRows = snapshot.dataRows.filter((row) => {
      const searchText = row.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? ""
      const rowDate =
        row.dataset.dateValue ??
        row.querySelector<HTMLElement>("[data-date-value]")?.dataset.dateValue ??
        undefined

      const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery)
      const matchesDate = dateFilterActive ? matchesDateRange(rowDate ?? searchText, dateRange) : true
      const matchesExtraFilters = activeFilters.every((filter) => matchesDataFilter(row, filter.key, filter.value))
      return matchesQuery && matchesDate && matchesExtraFilters
    })

    const sortedRows = [...matchedRows]
    if (sortColumnIndex != null) {
      sortedRows.sort((left, right) => {
        const leftText = normalizeCellText(left.cells[sortColumnIndex]?.textContent)
        const rightText = normalizeCellText(right.cells[sortColumnIndex]?.textContent)
        const result = compareCellValues(leftText, rightText)

        return sortDirection === "asc" ? result : -result
      })
    }

    const nextFilteredCount = sortedRows.length
    const nextPageCount = Math.max(1, Math.ceil(nextFilteredCount / pageSize))
    const nextPageIndex = nextFilteredCount === 0 ? 0 : Math.min(pageIndex, nextPageCount - 1)
    const pageStart = nextPageIndex * pageSize
    const pageEnd = pageStart + pageSize
    const pagedRows = sortedRows.slice(pageStart, pageEnd)
    const visibleRows = new Set(pagedRows)

    if (nextPageIndex !== pageIndex) {
      setPageIndex(nextPageIndex)
    }

    snapshot.dataRows.forEach((row) => {
      const matchesFilters = sortedRows.includes(row)
      row.dataset.filterMatch = matchesFilters ? "true" : "false"
      row.toggleAttribute("hidden", !(matchesFilters && visibleRows.has(row)))
    })

    snapshot.emptyRows.forEach((row) => {
      row.toggleAttribute("hidden", snapshot.dataRows.length > 0)
    })

    // Reorder DOM rows to match active sort + pagination.
    if (pagedRows.length > 0) {
      for (const row of pagedRows) {
        snapshot.tbody.appendChild(row)
      }
    }

    setTotalCount(snapshot.dataRows.length)
    setFilteredCount(nextFilteredCount)
    setShowNoResults(snapshot.dataRows.length > 0 && nextFilteredCount === 0)
  })

  React.useEffect(() => {
    wireSortableHeaders()
    applyFilters()
  }, [applyFilters, wireSortableHeaders, query, dateRange, sortColumnIndex, sortDirection, children])

  React.useEffect(() => {
    setPageIndex(0)
  }, [query, dateRange, pageSize])

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
      wireSortableHeaders()
      applyFilters()
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [applyFilters, wireSortableHeaders])

  React.useEffect(() => {
    const root = shellRef.current?.parentElement
    if (!root) {
      return
    }

    const handleChange = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.matches("[data-table-filter-key]")) {
        return
      }

      applyFilters()
    }

    root.addEventListener("change", handleChange)
    root.addEventListener("input", handleChange)

    return () => {
      root.removeEventListener("change", handleChange)
      root.removeEventListener("input", handleChange)
    }
  }, [applyFilters])

  const handleReset = React.useCallback(() => {
    setQuery("")
    setDateRange(undefined)
    setSortColumnIndex(null)
    setSortDirection("asc")

    const filterControls = Array.from(
      shellRef.current?.parentElement?.querySelectorAll<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>("[data-table-filter-key]") ?? [],
    )

    filterControls.forEach((control) => {
      if (control instanceof HTMLSelectElement) {
        control.value = ""
      } else if (control.type !== "hidden") {
        control.value = ""
      }
    })

    window.dispatchEvent(new CustomEvent("hero-table-reset-filters"))
  }, [])

  const exportVisibleTable = React.useCallback(
    () => {
      const snapshot = getTableSnapshot()
      if (!snapshot) {
        return
      }

      const rows = snapshot.dataRows
        .filter((row) => row.dataset.filterMatch === "true")
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

  const totalPages = Math.max(1, Math.ceil(Math.max(filteredCount, 1) / pageSize))
  const pageStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
  const pageEnd = filteredCount === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, filteredCount)

  return (
    <div className={cn("space-y-4", className)}>
      {title || description ? (
        <div className="space-y-1.5">
          {title ? <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}

      <div className="rounded-[1rem] border border-border/70 bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <div className="flex min-w-max flex-1 items-center gap-2">
            {searchEnabled ? (
              <div className="relative w-[220px] flex-none">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder ?? `Search ${label}...`}
                  className="h-9 rounded-lg border-border/70 bg-muted/30 pl-9 text-[13px] shadow-none"
                />
              </div>
            ) : null}
            {filters}
            {presets}
            {dateFilterSupported ? <TableDateRangePicker value={dateRange} onChange={setDateRange} /> : null}
            {(query || dateRange?.from || dateRange?.to) ? (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-9 rounded-lg px-3 text-[13px] font-medium normal-case tracking-normal text-muted-foreground hover:bg-muted/50"
              >
                <IconRotate className="size-4" />
                Reset
              </Button>
            ) : null}
          </div>

          <div className="flex min-w-max items-center gap-2">
            {actions}
            {showImport ? (
              <div aria-label="Import data">
                {importAction ?? (
                  <AdminImportDialog
                    title={`Import ${label}`}
                    fields={importFields}
                  />
                )}
              </div>
            ) : null}
            <Button
              variant="outline"
              onClick={() => exportVisibleTable()}
              className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
            >
              <IconFileSpreadsheet className="size-4" />
              Excel
            </Button>
            {primaryAction}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 rounded-[0.95rem] border border-border/70 bg-white px-3 py-2.5 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between",
          summaryClassName,
        )}
      >
        <span className="tabular-nums">
          Showing {pageStart}-{pageEnd} of {filteredCount} {label}
          {filteredCount !== totalCount ? ` (total ${totalCount})` : ""}
        </span>
        {dateFilterSupported && dateRange?.from ? (
          <Badge variant="outline" className="w-fit rounded-full border-0 bg-surface-container-low px-3 py-1">
            {dateRange.to
              ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
              : format(dateRange.from, "dd MMM yyyy")}
          </Badge>
        ) : null}
      </div>

      {filteredCount > 0 ? (
        <div className="flex flex-col gap-2 rounded-[0.95rem] border border-border/70 bg-white px-3 py-2.5 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-8 rounded-lg border border-border/70 bg-muted/30 px-2 text-[13px] text-foreground shadow-none"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="tabular-nums text-xs font-medium text-muted-foreground">
              Page {Math.min(pageIndex + 1, totalPages)} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              className="h-8 rounded-lg border border-border/70 bg-white px-2 text-[13px] shadow-none"
            >
              <IconChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
              className="h-8 rounded-lg border border-border/70 bg-white px-2 text-[13px] shadow-none"
            >
              Next
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={shellRef} className="space-y-3">
        {children}
        {showNoResults ? (
          <div className="rounded-[1.1rem] border border-border/70 bg-white px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            Tidak ada data yang cocok dengan filter table ini.
          </div>
        ) : null}
      </div>
    </div>
  )
}

