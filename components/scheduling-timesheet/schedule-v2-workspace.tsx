'use client'

import { useEffect, useMemo, useRef, useState, useTransition, Fragment } from 'react'
import { CalendarDays, CheckCircle2, Eraser, Pencil, Plus, Save, Trash2, Forklift, Car, Printer, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  activateSchedulingTimesheetPlanV2Action,
  createSchedulingTimesheetPlanV2Action,
  deleteSchedulingTimesheetPlanV2Action,
  getIndonesiaHolidaysAction,
  saveSchedulingTimesheetPlanV2DraftAction,
} from '@/app/dashboard/admin-actions'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { EnterpriseActionButtons, type TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  applyScheduleV2Code,
  createEmptyScheduleV2,
  cycleScheduleV2Code,
  getScheduleV2DayCount,
  getScheduleV2Progress,
  type ScheduleV2Code,
  type ScheduleV2Row,
} from '@/lib/timesheet/schedule-v2'
import {
  mergeScheduleV2Import,
  parseScheduleV2Import,
  type ScheduleV2ImportResult,
} from '@/lib/timesheet/schedule-v2-import'
import { isWeekend } from '@/lib/timesheet-scheduling'

function isStaffRole(role?: string | null): boolean {
  const r = (role ?? '').toLowerCase().trim()
  if (r.includes('non staff') || r.includes('non-staff') || r.includes('nonstaff')) return false
  if (r.includes('staff')) return true
  if (/manager|supervisor|admin|koordinator|coord/i.test(r)) return true
  return false
}

function createPrefilledScheduleV2(employees: Employee[], period: string, scheduleType?: string | null) {
  const emptyRows = createEmptyScheduleV2(
    employees.map((employee) => ({
      id: employee.id,
      section: employee.section,
      role: employee.role,
    })),
    period
  )
  const isOffice = scheduleType === 'office'
  const isHybrid = scheduleType === 'hybrid'

  if (!isOffice && !isHybrid) return emptyRows

  return emptyRows.map((row) => {
    const employee = employees.find((e) => e.id === row.employeeId)
    const isStaff = isStaffRole(employee?.role)
    if (isOffice || (isHybrid && isStaff)) {
      const schedule = row.schedule.map((code, index) =>
        isWeekend(period, index + 1) ? 'OFF' : code
      )
      return { ...row, schedule }
    }
    return row
  })
}

type Employee = {
  id: number
  name: string
  employeeSn?: string | null
  role: string
  jobTitle?: string | null
  section?: string | null
  department?: string | null
  siteId: number | null
  kimperLv?: boolean
  kimperTh?: boolean
  sio?: string | null
}

type EmployeeScheduleProfile = {
  employeeId: number
  section: string
  positionOnSite: string
  kimperLv: boolean
  kimperTh: boolean
}

type Site = { id: number; name: string }

type ScheduleV2Plan = {
  id: number
  siteId: number
  period: string
  status: string
  draftSchedule: ScheduleV2Row[]
  activeSchedule: ScheduleV2Row[]
  creatorName: string
  activatedAt: string | null
  createdAt: string
  updatedAt: string
}

type Holiday = { date: string; name: string; localName: string; day: number }

const toolOptions: Array<{ code: ScheduleV2Code; label: string }> = [
  { code: 'OFF', label: 'OFF' },
  { code: 'DS', label: 'DS' },
  { code: 'NS', label: 'NS' },
  { code: 'FB', label: 'FB' },
  { code: '', label: 'Kosong' },
]

function codeClass(code: ScheduleV2Code) {
  if (code === 'OFF') return 'bg-rose-100 text-rose-800 hover:bg-rose-200'
  if (code === 'DS') return 'bg-sky-100 text-sky-900 hover:bg-sky-200'
  if (code === 'NS') return 'bg-slate-800 text-white hover:bg-slate-900'
  if (code === 'FB') return 'bg-amber-100 text-amber-900 hover:bg-amber-200'
  return 'bg-white text-slate-300 hover:bg-slate-50'
}

const sectionOptions = ['Service Operation', 'Repair Retread', 'Crew Office']
const employmentPositionLabels = [
  'permanent',
  'contract',
  'kontrak',
  'permanen',
  'staff',
  'non staff',
  'non-staff',
  'outsource',
]
const defaultPositionLabels = ['REPAIRMAN', 'TYREMAN', 'Operation']
const rosterSectionStyles: Record<
  string,
  { title: string; head: string; day: string; total: string }
> = {
  'Service Operation': {
    title: 'Roster Crew Serviceman',
    head: 'bg-sky-50 text-sky-900',
    day: 'bg-sky-50/60 text-sky-900',
    total: 'bg-surface-container-low text-foreground',
  },
  'Repair Retread': {
    title: 'Roster Crew Repairman',
    head: 'bg-emerald-50 text-emerald-900',
    day: 'bg-emerald-50/60 text-emerald-900',
    total: 'bg-surface-container-low text-foreground',
  },
  'Crew Office': {
    title: 'Roster Crew Office',
    head: 'bg-orange-50 text-orange-900',
    day: 'bg-orange-50/60 text-orange-900',
    total: 'bg-surface-container-low text-foreground',
  },
}

function normalizeLocation(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function normalizeRosterSection(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  if (normalized.includes('repair') || normalized.includes('retread')) return 'Repair Retread'
  if (normalized.includes('technical')) return 'Crew Office'
  if (normalized.includes('tyreman') || normalized.includes('tyre')) return 'Service Operation'
  if (
    normalized.includes('serviceoperation') ||
    normalized.includes('serviceman') ||
    normalized.includes('servicemvc') ||
    normalized.includes('serviceoperationmvc') ||
    normalized.includes('serviceoperationother') ||
    normalized.includes('serviceoperationothers')
  )
    return 'Service Operation'

  return 'Crew Office'
}

function isEmploymentPositionLabel(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  if (!normalized) return true

  return employmentPositionLabels.some((label) => normalized.includes(normalizeLocation(label)))
}

function resolvePositionOnSite(position?: string | null, fallback?: string | null) {
  if (!isEmploymentPositionLabel(position)) return position ?? ''
  if (!isEmploymentPositionLabel(fallback)) return fallback ?? ''

  return 'Jabatan belum diisi'
}

function defaultPositionOnSite(section?: string | null) {
  const normalized = normalizeLocation(section ?? '')
  if (normalized.includes('repair') || normalized.includes('retread')) return 'REPAIRMAN'
  if (normalized.includes('service')) return 'TYREMAN'
  if (normalized.includes('technical')) return 'Operation'

  return 'Operation'
}

function isDefaultPositionOnSite(value?: string | null) {
  return defaultPositionLabels.some(
    (label) => normalizeLocation(label) === normalizeLocation(value ?? '')
  )
}

function positionOptionsForSection(section?: string | null) {
  return Array.from(new Set([defaultPositionOnSite(section), 'Leader', 'Sub Leader']))
}

function isLeadershipPosition(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  return normalized === 'leader' || normalized === 'subleader'
}

function rosterSectionLabel(section: string) {
  if (section === 'Service Operation') return 'Roster Serviceman'
  if (section === 'Repair Retread') return 'Crew Repair'
  return 'Crew Office'
}

function weekday(period: string, day: number) {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(
    new Date(year, month - 1, day)
  )
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

function reconcileRows(plan: ScheduleV2Plan, employees: Employee[]) {
  const current = new Map(plan.draftSchedule.map((row) => [row.employeeId, row.schedule]))
  const dayCount = getScheduleV2DayCount(plan.period)
  return employees.map((employee) => ({
    employeeId: employee.id,
    schedule: Array.from(
      { length: dayCount },
      (_, index) => current.get(employee.id)?.[index] ?? ''
    ) as ScheduleV2Code[],
  }))
}

function employeesForSite(employees: Employee[], siteId: number) {
  return employees
    .filter((employee) => employee.siteId === siteId)
    .sort(
      (left, right) =>
        (left.section || left.department || '').localeCompare(
          right.section || right.department || ''
        ) || left.name.localeCompare(right.name)
    )
}

export function ScheduleV2Workspace({
  employees,
  sites,
  initialPlans,
  currentEmployeeName,
  access,
  configs,
}: {
  employees: Employee[]
  sites: Site[]
  initialPlans: ScheduleV2Plan[]
  currentEmployeeName: string
  access: TableRbacAccess
  configs?: { siteId: number; scheduleType?: string | null }[]
}) {
  const router = useRouter()
  const [plans, setPlans] = useState(initialPlans)
  const [createOpen, setCreateOpen] = useState(false)
  const [siteId, setSiteId] = useState(String(sites[0]?.id ?? ''))
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [editorPlan, setEditorPlan] = useState<ScheduleV2Plan | null>(null)
  const [rows, setRows] = useState<ScheduleV2Row[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedTool, setSelectedTool] = useState<ScheduleV2Code | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleV2Plan | null>(null)
  const [scheduleImport, setScheduleImport] = useState<ScheduleV2ImportResult | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importInputKey, setImportInputKey] = useState(0)
  const [importing, setImporting] = useState(false)
  const [pending, startTransition] = useTransition()
  const dragging = useRef(false)
  const visitedCells = useRef(new Set<string>())
  const activePaintTool = useRef<ScheduleV2Code | null>(null)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [profileSection, setProfileSection] = useState('Crew Office')
  const [profilePositionOnSite, setProfilePositionOnSite] = useState('')
  const [profileKimperLv, setProfileKimperLv] = useState(false)
  const [profileKimperTh, setProfileKimperTh] = useState(false)

  const selectedEmployee = useMemo(
    () => (selectedEmployeeId ? employees.find((e) => e.id === selectedEmployeeId) : null),
    [selectedEmployeeId, employees]
  )

  const canEdit = Boolean(access.canEdit || access.canDelete || access.canSelectAll)
  const canDelete = Boolean(access.canDelete || access.canSelectAll)
  const selectedSiteEmployees = useMemo(
    () => employeesForSite(employees, Number(editorPlan?.siteId)),
    [editorPlan?.siteId, employees]
  )
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  )
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites])
  const holidayByDay = useMemo(
    () => new Map(holidays.map((holiday) => [holiday.day, holiday])),
    [holidays]
  )
  const progress = useMemo(() => getScheduleV2Progress(rows), [rows])

  const tableRows = useMemo(() => {
    return rows.map((row) => {
      const employee = employeeById.get(row.employeeId)
      const kimperLv = employee?.kimperLv || (row.kimperLv ?? false)
      const kimperTh = employee?.kimperTh || (row.kimperTh ?? false)
      const section = row.section ?? ''
      const posOnSite = row.positionOnSite ?? ''
      const rosterSection = normalizeRosterSection(
        section || employee?.section || employee?.role
      )
      const sectionLabel = employee?.section || rosterSection
      const positionOnSite = isLeadershipPosition(posOnSite)
        ? posOnSite
        : defaultPositionOnSite(sectionLabel)
      return {
        ...row,
        employee,
        kimperLv,
        kimperTh,
        section,
        positionOnSite,
        sectionLabel,
        rosterSection,
      }
    })
  }, [rows, employeeById])

  function rosterSectionTotals(sectionRows: typeof tableRows, dayCount: number) {
    return Array.from({ length: dayCount }, (_, i) => {
      let ds = 0
      let ns = 0
      let dayOperator = 0
      let nightOperator = 0
      let off = 0
      let manpower = 0
      for (const row of sectionRows) {
        const code = row.schedule[i]
        const hasKimper = row.kimperLv && row.kimperTh
        if (code === 'DS') {
          ds++
          if (hasKimper) dayOperator++
          manpower++
        } else if (code === 'NS') {
          ns++
          if (hasKimper) nightOperator++
          manpower++
        } else if (code === 'FB') {
          manpower++
        } else if (code === 'OFF') {
          off++
        }
      }
      return { ds, ns, dayOperator, nightOperator, off, manpower }
    })
  }

  function openProfileEditor(employeeId: number) {
    const row = rows.find((r) => r.employeeId === employeeId)
    if (!row) return
    const employee = employeeById.get(employeeId)
    setSelectedEmployeeId(employeeId)
    setProfileSection(row.section || normalizeRosterSection(employee?.section || employee?.role))
    setProfilePositionOnSite(row.positionOnSite || '')
    setProfileKimperLv(row.kimperLv ?? false)
    setProfileKimperTh(row.kimperTh ?? false)
  }

  function exportSchedulePdf() {
    if (!editorPlan) return
    const site = siteById.get(editorPlan.siteId)
    const title = `Schedule V2 - ${site?.name ?? 'Semua Site'} - ${editorPlan.period}`
    const dayCount = getScheduleV2DayCount(editorPlan.period)
    const dayHeaders = Array.from({ length: dayCount }, (_, i) => i + 1)
      .map((day) => `<th><div>${weekday(editorPlan.period, day)}</div><div>${day}</div></th>`)
      .join('')

    const rosterTables = sectionOptions
      .map((section) => {
        const sectionRows = tableRows.filter((row) => row.rosterSection === section)
        if (sectionRows.length === 0) return ''

        const styles = rosterSectionStyles[section] ?? rosterSectionStyles['Crew Office']
        const totals = rosterSectionTotals(sectionRows, dayCount)
        const showOperatorTotals = section === 'Service Operation' || section === 'Repair Retread'

        const bodyRows = sectionRows
          .map(
            (row) => `
        <tr><td>${row.employee?.name || row.employeeId}</td><td>${row.employee?.employeeSn || '-'}</td><td>${row.sectionLabel}</td><td>${row.positionOnSite}</td><td>${row.employee?.sio || '-'}</td>${row.schedule.map((code) => `<td class="cell ${code ? code.toLowerCase() : ''}">${code || '·'}</td>`).join('')}<td>${row.schedule.filter(Boolean).length}/${dayCount}</td></tr>
      `
          )
          .join('')

        const headerRow = `<tr><th>Nama</th><th>SN</th><th>Section</th><th>Posisi On Site</th><th>Sertifikat SIO</th>${dayHeaders}<th>Terisi</th></tr>`
        const totalRow = (
          label: string,
          subLabel: string,
          key: 'ds' | 'ns' | 'dayOperator' | 'nightOperator' | 'off' | 'manpower',
          className = ''
        ) => `
        <tr class="total ${className}"><td>${label}</td><td colspan="4">${subLabel}</td>${totals.map((item) => `<td>${item[key]}</td>`).join('')}<td>${key === 'manpower' ? sectionRows.length : totals.reduce((sum, item) => sum + item[key], 0)}</td></tr>
      `

        return `<table class="roster"><thead><tr><th class="title" colspan="${dayCount + 6}">${styles.title} ${editorPlan.period}</th></tr>${headerRow}</thead><tbody>${bodyRows}</tbody><tfoot>${totalRow('Dayshift', 'Day Shift', 'ds')}${totalRow('Nightshift', 'Night Shift', 'ns')}${showOperatorTotals ? totalRow('Day Operator', 'LV + TH', 'dayOperator', 'operator-day') + totalRow('Night Operator', 'LV + TH', 'nightOperator', 'operator-night') : ''}${totalRow('OFF', 'OFF', 'off', 'off-total')}${totalRow('TOTAL MAN POWER', 'Aktif', 'manpower', 'manpower')}</tfoot></table>`
      })
      .join('')

    const printable = window.open('', '_blank', 'width=1200,height=800')
    if (!printable) return

    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 landscape; margin: 4mm; }
            html, body { width: 289mm; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h1 { font-size: 10px; margin: 0 0 2px; }
            p { margin: 0 0 4px; color: #475569; font-size: 7px; }
            table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 4.5px; line-height: 1.05; page-break-inside: avoid; margin-bottom: 6px; }
            th { background: #bae6fd; color: #0f172a; }
            .title { text-align: left; font-size: 7px; background: #bfdbfe; }
            th:first-child, td:first-child { text-align: left; width: 23mm; }
            th:nth-child(2), td:nth-child(2) { width: 9mm; }
            th:nth-child(3), td:nth-child(3) { width: 18mm; }
            th:nth-child(4), td:nth-child(4) { width: 13mm; }
            th:nth-child(5), td:nth-child(5) { width: 13mm; }
            th:last-child, td:last-child { width: 7mm; }
            th, td { border: 0.5px solid #94a3b8; padding: 1px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            tfoot .total { background: #f8fafc; font-weight: 700; }
            .operator-day { background: #ffffff; }
            .operator-night { background: #cbd5e1; }
            .off-total { color: #b91c1c; }
            .manpower { background: #ffffff; color: #0f172a; }
            .cell.in { color: #047857; font-weight: 700; }
            .cell.ds { background: #bae6fd; }
            .cell.ns { background: #22c55e; }
            .cell.off { background: #ef4444; color: white; }
            .cell.fb { background: #fde047; }
            .section { margin-top: 14px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Karyawan: ${tableRows.length}</p>
          ${rosterTables}
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `)
    printable.document.close()
  }

  function saveProfile() {
    if (!selectedEmployeeId) return
    setRows((current) =>
      current.map((row) =>
        row.employeeId === selectedEmployeeId
          ? {
              ...row,
              section: profileSection,
              positionOnSite: profilePositionOnSite,
              kimperLv: profileKimperLv,
              kimperTh: profileKimperTh,
            }
          : row
      )
    )
    setSelectedEmployeeId(null)
  }

  function handleProfileSectionChange(value: string) {
    setProfileSection(value)
    setProfilePositionOnSite('')
  }

  useEffect(() => {
    const stopDragging = () => {
      dragging.current = false
      visitedCells.current.clear()
    }
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTool(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!editorPlan) return
    let active = true
    getIndonesiaHolidaysAction({ period: editorPlan.period })
      .then((items) => active && setHolidays(items as Holiday[]))
      .catch(() => active && setHolidays([]))
    return () => {
      active = false
    }
  }, [editorPlan])

  function openEditor(plan: ScheduleV2Plan) {
    const siteEmployees = employeesForSite(employees, plan.siteId)
    setEditorPlan(plan)
    setRows(reconcileRows(plan, siteEmployees))
    setSelectedTool(null)
  }

  function resetScheduleImport() {
    setScheduleImport(null)
    setImportFileName('')
    setImportInputKey((current) => current + 1)
  }

  async function handleScheduleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      resetScheduleImport()
      return
    }
    if (!/\.xlsx?$/i.test(file.name)) {
      toast.error('Gunakan file Excel .xlsx atau .xls')
      resetScheduleImport()
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10 MB')
      resetScheduleImport()
      return
    }

    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          raw: true,
          defval: '',
          blankrows: true,
        }) as unknown[][],
      }))
      const result = parseScheduleV2Import(
        sheets,
        employeesForSite(employees, Number(siteId)),
        period
      )
      if (!result.importedCells) {
        throw new Error('Tidak ada nama karyawan dan kode schedule yang cocok.')
      }
      setScheduleImport(result)
      setImportFileName(file.name)
      toast.success(`${result.matchedNames.length} karyawan terdeteksi dari Excel`)
    } catch (error) {
      resetScheduleImport()
      toast.error('File Excel gagal diimport', {
        description: error instanceof Error ? error.message : 'Format tidak dikenali',
      })
    } finally {
      setImporting(false)
    }
  }

  function handleCellPointerDown(event: React.PointerEvent, employeeId: number, day: number) {
    if (!canEdit || selectedTool === null || event.button !== 0) return
    event.preventDefault()
    dragging.current = true
    visitedCells.current.clear()

    setRows((current) => {
      const row = current.find((r) => r.employeeId === employeeId)
      const currentCode = row?.schedule[day - 1] ?? ''
      const targetTool = currentCode === selectedTool ? '' : selectedTool
      activePaintTool.current = targetTool

      const key = `${employeeId}:${day}`
      visitedCells.current.add(key)
      return applyScheduleV2Code(current, employeeId, day, targetTool, selectedTool === 'OFF')
    })
  }

  function handleCellPointerEnter(employeeId: number, day: number) {
    if (!dragging.current || selectedTool === null) return
    const targetTool = activePaintTool.current ?? selectedTool
    const key = `${employeeId}:${day}`
    if (visitedCells.current.has(key)) return
    visitedCells.current.add(key)
    setRows((current) => applyScheduleV2Code(current, employeeId, day, targetTool, selectedTool === 'OFF'))
  }

  function handleCellClick(employeeId: number, day: number) {
    if (!canEdit || selectedTool !== null) return
    setRows((current) => {
      const row = current.find((item) => item.employeeId === employeeId)
      const code = row?.schedule[day - 1] ?? ''
      const nextCode = cycleScheduleV2Code(code)
      return applyScheduleV2Code(current, employeeId, day, nextCode, false)
    })
  }

  function createPlan() {
    const numericSiteId = Number(siteId)
    if (!numericSiteId || !period) return
    startTransition(async () => {
      try {
        const result = await createSchedulingTimesheetPlanV2Action({
          siteId: numericSiteId,
          period,
        })
        const existing = plans.find(
          (plan) => plan.siteId === numericSiteId && plan.period === period
        )
        if (existing) {
          const siteEmployees = employeesForSite(employees, numericSiteId)
          const nextRows = scheduleImport
            ? mergeScheduleV2Import(reconcileRows(existing, siteEmployees), scheduleImport.rows)
            : reconcileRows(existing, siteEmployees)
          const saved = scheduleImport
            ? await saveSchedulingTimesheetPlanV2DraftAction({
                siteId: numericSiteId,
                period,
                rows: nextRows,
              })
            : null
          const nextPlan = {
            ...existing,
            draftSchedule: nextRows,
            updatedAt: saved?.updatedAt ?? existing.updatedAt,
          }
          setPlans((current) => current.map((plan) => (plan.id === existing.id ? nextPlan : plan)))
          setCreateOpen(false)
          openEditor(nextPlan)
          resetScheduleImport()
          toast.info(
            scheduleImport
              ? 'Schedule sudah ada. Data Excel diterapkan ke draft.'
              : 'Schedule site dan bulan ini sudah ada. Draft dibuka.'
          )
          return
        }
        if (result.existing) {
          setCreateOpen(false)
          toast.info('Schedule site dan bulan ini sudah ada. Data dimuat ulang.')
          router.refresh()
          return
        }
        const siteEmployees = employeesForSite(employees, numericSiteId)
        const now = new Date().toISOString()
        const siteConfig = configs?.find((c) => c.siteId === numericSiteId)
        const baseRows = createPrefilledScheduleV2(siteEmployees, period, siteConfig?.scheduleType)
        const draftSchedule = scheduleImport
          ? mergeScheduleV2Import(baseRows, scheduleImport.rows)
          : baseRows
        const saved = scheduleImport
          ? await saveSchedulingTimesheetPlanV2DraftAction({
              siteId: numericSiteId,
              period,
              rows: draftSchedule,
            })
          : null

        const plan: ScheduleV2Plan = {
          id: result.id ?? Date.now(),
          siteId: numericSiteId,
          period,
          status: 'draft',
          draftSchedule,
          activeSchedule: [],
          creatorName: currentEmployeeName,
          activatedAt: null,
          createdAt: now,
          updatedAt: saved?.updatedAt ?? now,
        }
        setPlans((current) => [plan, ...current])
        setCreateOpen(false)
        openEditor(plan)
        resetScheduleImport()
        router.refresh()
      } catch (error) {
        toast.error('Gagal membuat Schedule V2', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function updateLocalPlan(update: Partial<ScheduleV2Plan>) {
    if (!editorPlan) return
    const next = { ...editorPlan, ...update }
    setEditorPlan(next)
    setPlans((current) => current.map((plan) => (plan.id === next.id ? next : plan)))
  }

  function saveDraft() {
    if (!editorPlan) return
    startTransition(async () => {
      try {
        const result = await saveSchedulingTimesheetPlanV2DraftAction({
          siteId: editorPlan.siteId,
          period: editorPlan.period,
          rows,
        })
        updateLocalPlan({ draftSchedule: rows, updatedAt: result.updatedAt })
        toast.success('Draft Schedule V2 tersimpan')
        router.refresh()
      } catch (error) {
        toast.error('Gagal menyimpan draft', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function activatePlan() {
    if (!editorPlan) return
    startTransition(async () => {
      try {
        const result = await activateSchedulingTimesheetPlanV2Action({
          siteId: editorPlan.siteId,
          period: editorPlan.period,
          rows,
        })
        updateLocalPlan({
          status: 'active',
          draftSchedule: rows,
          activeSchedule: rows,
          activatedAt: result.activatedAt,
          updatedAt: result.activatedAt,
        })
        toast.success('Schedule V2 aktif untuk attendance dan payroll')
        router.refresh()
      } catch (error) {
        toast.error('Schedule belum dapat diaktifkan', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function deletePlan() {
    if (!deleteTarget) return
    const target = deleteTarget
    startTransition(async () => {
      try {
        await deleteSchedulingTimesheetPlanV2Action({
          siteId: target.siteId,
          period: target.period,
        })
        setPlans((current) => current.filter((plan) => plan.id !== target.id))
        if (editorPlan?.id === target.id) setEditorPlan(null)
        setDeleteTarget(null)
        toast.success('Schedule V2 dihapus')
        router.refresh()
      } catch (error) {
        toast.error('Gagal menghapus Schedule V2', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  const scorecards = [
    {
      label: 'Total Schedule',
      value: plans.length,
      description: 'Site dan bulan tersimpan',
      icon: <CalendarDays className="size-4" />,
    },
    {
      label: 'Aktif',
      value: plans.filter((plan) => plan.status === 'active').length,
      description: 'Dipakai attendance/payroll',
      tone: 'success' as const,
      icon: <CheckCircle2 className="size-4" />,
    },
    {
      label: 'Draft',
      value: plans.filter((plan) => plan.status !== 'active').length,
      description: 'Belum menjadi sumber operasional',
      tone: 'warning' as const,
      icon: <Pencil className="size-4" />,
    },
  ]

  return (
    <>
      <MinimalTableShell
        label="Schedule V2"
        title="Schedule V2 — Manual grid"
        description="Buat schedule bulanan tanpa auto-generate. Draft terpisah; hanya schedule aktif yang dipakai attendance dan payroll."
        searchPlaceholder="Cari site, bulan, atau pembuat..."
        showImport={false}
        dateFilter={false}
        scorecards={scorecards}
        access={access}
        filters={
          <>
            <select
              data-table-filter-key="site"
              className="border-border/70 h-9 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Semua site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.name}>
                  {site.name}
                </option>
              ))}
            </select>
            <select
              data-table-filter-key="status"
              className="border-border/70 h-9 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="draft">Draft</option>
            </select>
            <Input
              type="month"
              data-table-filter-key="period"
              className="h-9 w-[160px]"
              aria-label="Filter bulan"
            />
          </>
        }
        primaryAction={
          canEdit ? (
            <Button size="dense" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Tambah Schedule
            </Button>
          ) : undefined
        }
        columnOptions={[
          { key: 'site', label: 'Site', required: true },
          { key: 'period', label: 'Bulan' },
          { key: 'status', label: 'Status' },
          { key: 'progress', label: 'Progress' },
          { key: 'creator', label: 'Dibuat oleh' },
          { key: 'updated', label: 'Updated' },
          { key: 'actions', label: 'Aksi', required: true },
        ]}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Bulan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Dibuat oleh</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const planProgress = getScheduleV2Progress(plan.draftSchedule)
              const siteName = siteById.get(plan.siteId)?.name ?? `Site ${plan.siteId}`
              return (
                <TableRow
                  key={plan.id}
                  data-filter-site={siteName}
                  data-filter-status={plan.status}
                  data-filter-period={plan.period}
                  data-date-value={plan.updatedAt}
                >
                  <TableCell className="font-semibold">{siteName}</TableCell>
                  <TableCell>{formatPeriod(plan.period)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                      {plan.status === 'active' ? 'Aktif' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums">
                      {planProgress.filled}/{planProgress.total}
                    </span>
                  </TableCell>
                  <TableCell>{plan.creatorName}</TableCell>
                  <TableCell>{new Date(plan.updatedAt).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {plan.status !== 'active' && canEdit ? (
                        <Button size="dense" variant="outline" onClick={() => openEditor(plan)}>
                          Aktifkan
                        </Button>
                      ) : null}
                      <EnterpriseActionButtons
                        access={{ canView: true, canEdit, canDelete }}
                        onView={() => openEditor(plan)}
                        onEdit={() => openEditor(plan)}
                        onDelete={() => setDeleteTarget(plan)}
                        labels={{
                          view: 'Lihat schedule',
                          edit: 'Edit schedule',
                          delete: 'Hapus schedule',
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {!plans.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                  Belum ada Schedule V2. Klik Tambah Schedule untuk membuat grid manual.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Schedule V2</DialogTitle>
            <DialogDescription>
              Pilih site dan bulan. Grid dibuat kosong untuk semua karyawan aktif pada site.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Site</Label>
              <select
                value={siteId}
                onChange={(event) => {
                  setSiteId(event.target.value)
                  resetScheduleImport()
                }}
                className="border-border h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Bulan</Label>
              <Input
                type="month"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value)
                  resetScheduleImport()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-v2-import">Import roster Excel (opsional)</Label>
              <Input
                key={importInputKey}
                id="schedule-v2-import"
                type="file"
                accept=".xlsx,.xls"
                disabled={importing || !siteId}
                onChange={handleScheduleImport}
              />
              <p className="text-muted-foreground text-xs">
                Sistem mencari tanggal, kode shift, dan mencocokkan karyawan berdasarkan NAMA.
              </p>
              {scheduleImport ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <Upload className="size-4" />
                    {importFileName}
                  </div>
                  <p className="mt-1">
                    {scheduleImport.matchedNames.length} karyawan · {scheduleImport.importedCells}{' '}
                    cell · periode {formatPeriod(scheduleImport.period)}
                  </p>
                  {scheduleImport.detectedPeriod &&
                  scheduleImport.detectedPeriod !== scheduleImport.period ? (
                    <p className="mt-1 text-amber-800">
                      Header Excel tertulis {formatPeriod(scheduleImport.detectedPeriod)}; import tetap
                      memakai bulan yang dipilih: {formatPeriod(scheduleImport.period)}.
                    </p>
                  ) : null}
                  {scheduleImport.unmatchedNames.length ? (
                    <p className="mt-1 text-amber-800">
                      Nama tidak cocok: {scheduleImport.unmatchedNames.slice(0, 5).join(', ')}
                      {scheduleImport.unmatchedNames.length > 5
                        ? ` +${scheduleImport.unmatchedNames.length - 5}`
                        : ''}
                    </p>
                  ) : null}
                  {scheduleImport.unknownCodes.length ? (
                    <p className="mt-1 text-amber-800">
                      Kode dilewati: {scheduleImport.unknownCodes.join(', ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Dibuat oleh</Label>
              <Input value={currentEmployeeName} readOnly className="bg-muted/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              BATAL
            </Button>
            <Button disabled={pending || importing || !siteId || !period} onClick={createPlan}>
              {pending ? 'MEMBUAT...' : 'BUAT SCHEDULE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editorPlan)} onOpenChange={(open) => !open && setEditorPlan(null)}>
        <DialogContent className="flex h-[94vh] max-h-[94vh] w-[98vw] max-w-[98vw] flex-col overflow-hidden p-0">
          {editorPlan ? (
            <>
              <DialogHeader className="border-border/60 bg-surface-container-low border-b px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                  <div>
                    <DialogTitle>Schedule V2 · {siteById.get(editorPlan.siteId)?.name}</DialogTitle>
                    <DialogDescription>
                      {formatPeriod(editorPlan.period)} · {selectedSiteEmployees.length} karyawan ·{' '}
                      {progress.filled}/{progress.total} cell terisi
                    </DialogDescription>
                  </div>
                  <Badge variant={editorPlan.status === 'active' ? 'default' : 'secondary'}>
                    {editorPlan.status === 'active' ? 'Aktif' : 'Draft'}
                  </Badge>
                </div>
              </DialogHeader>
              <div
                className="border-border/60 flex flex-wrap items-center gap-2 border-b bg-white px-4 py-3"
                role="toolbar"
                aria-label="Kode schedule"
              >
                <span className="text-muted-foreground mr-1 text-xs font-semibold tracking-[0.12em] uppercase">
                  Paint
                </span>
                {toolOptions.map((tool) => (
                  <Button
                    key={tool.label}
                    type="button"
                    size="dense"
                    variant={selectedTool === tool.code ? 'default' : 'outline'}
                    aria-pressed={selectedTool === tool.code}
                    onClick={() =>
                      setSelectedTool((current) => (current === tool.code ? null : tool.code))
                    }
                    disabled={!canEdit}
                  >
                    {tool.code === '' ? <Eraser className="size-4" /> : null}
                    {tool.label}
                  </Button>
                ))}
                <span className="text-muted-foreground ml-2 text-xs">
                  Drag mengecat cell terlewati. OFF berulang tiap 7 hari sampai akhir bulan. Escape
                  mematikan tool.
                </span>
              </div>
              {holidays.length ? (
                <div className="border-border/60 flex gap-2 overflow-x-auto border-b bg-amber-50/60 px-4 py-2">
                  {holidays.map((holiday) => (
                    <Badge
                      key={holiday.date}
                      variant="outline"
                      className="border-amber-300 bg-white whitespace-nowrap"
                    >
                      {holiday.day} · {holiday.localName || holiday.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="bg-surface min-h-0 flex-1 overflow-auto p-3 select-none">
                <table className="min-w-max border-separate border-spacing-0 overflow-hidden rounded-xl bg-white text-xs shadow-sm">
                  <thead className="sticky top-0 z-30">
                    <tr>
                      <th className="border-border sticky left-0 z-40 min-w-48 border-r border-b bg-slate-100 px-3 py-2 text-left">
                        Nama
                      </th>
                      <th className="border-border sticky left-48 z-40 min-w-24 border-r border-b bg-slate-100 px-3 py-2">
                        SN
                      </th>
                      <th className="border-border sticky left-72 z-40 min-w-36 border-r border-b bg-slate-100 px-3 py-2">
                        Section
                      </th>
                      <th className="border-border sticky left-[27rem] z-40 min-w-36 border-r border-b bg-slate-100 px-3 py-2">
                        Posisi
                      </th>
                      <th className="border-border sticky left-[36rem] z-40 min-w-40 max-w-48 border-r border-b bg-slate-100 px-3 py-2">
                        Sertifikat SIO
                      </th>

                      {Array.from(
                        { length: getScheduleV2DayCount(editorPlan.period) },
                        (_, index) => index + 1
                      ).map((day) => {
                        const holiday = holidayByDay.get(day)
                        return (
                          <th
                            key={day}
                            title={holiday?.localName || holiday?.name}
                            className={cn(
                              'border-border min-w-12 border-r border-b px-1 py-2 text-center font-semibold',
                              holiday ? 'bg-amber-100 text-amber-950' : 'bg-slate-100'
                            )}
                          >
                            <div>{weekday(editorPlan.period, day)}</div>
                            <div className="tabular-nums">{day}</div>
                          </th>
                        )
                      })}
                      <th className="border-border min-w-20 border-b bg-slate-100 px-2 py-2">
                        Terisi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionOptions.map((section) => {
                      const sectionRows = tableRows.filter((row) => row.rosterSection === section)
                      if (sectionRows.length === 0) return null

                      const styles = rosterSectionStyles[section] ?? rosterSectionStyles['Crew Office']
                      const dayCount = getScheduleV2DayCount(editorPlan.period)
                      const totals = rosterSectionTotals(sectionRows, dayCount)
                      const showOperatorTotals = section === 'Service Operation' || section === 'Repair Retread'

                      return (
                        <Fragment key={section}>
                          <tr>
                            <td
                              colSpan={dayCount + 6}
                              className={cn(
                                'border-border sticky left-0 z-30 border-r border-b px-4 py-3 font-semibold uppercase tracking-wider',
                                styles.head
                              )}
                            >
                              {styles.title} ({sectionRows.length} orang)
                            </td>
                          </tr>
                          <tr className="bg-slate-50">
                            <td className="border-border sticky left-0 z-20 min-w-48 border-r border-b px-3 py-1 text-left text-[10px] font-semibold text-slate-500">Nama</td>
                            <td className="border-border sticky left-48 z-20 min-w-24 border-r border-b px-3 py-1 text-[10px] font-semibold text-slate-500">SN</td>
                            <td className="border-border sticky left-72 z-20 min-w-36 border-r border-b px-3 py-1 text-[10px] font-semibold text-slate-500">Section</td>
                            <td className="border-border sticky left-[27rem] z-20 min-w-36 border-r border-b px-3 py-1 text-[10px] font-semibold text-slate-500">Posisi</td>
                            <td className="border-border sticky left-[36rem] z-20 min-w-40 border-r border-b px-3 py-1 text-[10px] font-semibold text-slate-500">SIO</td>
                            {Array.from({ length: dayCount }, (_, i) => i + 1).map(day => (
                              <td key={day} className="border-border min-w-12 border-r border-b px-1 py-1 text-center text-[10px] font-semibold text-slate-500">{day}</td>
                            ))}
                            <td className="border-border min-w-20 border-b px-2 py-1 text-[10px] font-semibold text-slate-500">Terisi</td>
                          </tr>
                          {sectionRows.map((row) => (
                            <tr key={row.employeeId} className="group">
                              <td className="border-border sticky left-0 z-20 border-r border-b bg-white px-3 py-2 font-semibold group-hover:bg-slate-50">
                                <div className="flex flex-col items-start gap-1">
                                  <span>{row.employee?.name ?? `Employee ${row.employeeId}`}</span>
                                  {(row.kimperLv || row.kimperTh) && (
                                    <div className="flex gap-1 text-[10px] font-bold">
                                      {row.kimperLv && (
                                        <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-white">
                                          <Car className="size-3" /> LV
                                        </span>
                                      )}
                                      {row.kimperTh && (
                                        <span className="flex items-center gap-1 rounded bg-sky-600 px-1.5 py-0.5 text-white">
                                          <Forklift className="size-3" /> TH
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="border-border sticky left-48 z-20 border-r border-b bg-white px-3 py-2 text-center group-hover:bg-slate-50">
                                {row.employee?.employeeSn || row.employeeId}
                              </td>
                              <td className="border-border sticky left-72 z-20 border-r border-b bg-white px-3 py-2 group-hover:bg-slate-50">
                                <div className="flex flex-col items-start gap-1">
                                  <span>{row.sectionLabel}</span>
                                  <button
                                    type="button"
                                    onClick={() => openProfileEditor(row.employeeId)}
                                    className="text-[10px] font-semibold text-blue-600 hover:underline"
                                  >
                                    Edit Profil Grid
                                  </button>
                                </div>
                              </td>
                              <td className="border-border sticky left-[27rem] z-20 border-r border-b bg-white px-3 py-2 group-hover:bg-slate-50">
                                <div className="flex flex-col items-start gap-1">
                                  <span>{row.positionOnSite}</span>
                                </div>
                              </td>
                              <td className="border-border sticky left-[36rem] z-20 border-r border-b bg-white px-3 py-2 text-[10px] text-muted-foreground group-hover:bg-slate-50 truncate max-w-48" title={row.employee?.sio || '-'}>
                                {row.employee?.sio || '-'}
                              </td>
                              {row.schedule.map((code, index) => {
                                const day = index + 1
                                const holiday = holidayByDay.get(day)
                                return (
                                  <td
                                    key={`${row.employeeId}-${day}`}
                                    className={cn(
                                      'border-border border-r border-b p-0',
                                      holiday && 'bg-amber-50'
                                    )}
                                  >
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      aria-label={`${row.employee?.name ?? row.employeeId}, hari ${day}, ${code || 'kosong'}`}
                                      className={cn(
                                        'h-12 w-full px-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none focus-visible:ring-inset',
                                        codeClass(code),
                                        holiday && !code && 'bg-amber-50'
                                      )}
                                      onPointerDown={(event) =>
                                        handleCellPointerDown(event, row.employeeId, day)
                                      }
                                      onPointerEnter={() => handleCellPointerEnter(row.employeeId, day)}
                                      onClick={() => handleCellClick(row.employeeId, day)}
                                    >
                                      {code || '·'}
                                    </button>
                                  </td>
                                )
                              })}
                              <td className="border-border border-b px-2 text-center font-semibold tabular-nums">
                                {row.schedule.filter(Boolean).length}/{row.schedule.length}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td
                              colSpan={5}
                              className={cn(
                                'border-border sticky left-0 z-30 border-r border-b px-3 py-2 text-right font-semibold',
                                styles.total
                              )}
                            >
                              Manpower Plan
                            </td>
                            {totals.map((t, index) => (
                              <td
                                key={`mp-${index}`}
                                className={cn(
                                  'border-border border-r border-b text-center tabular-nums font-semibold',
                                  styles.total
                                )}
                              >
                                {t.manpower}
                              </td>
                            ))}
                            <td className={cn('border-border border-b', styles.total)} />
                          </tr>
                          <tr>
                            <td
                              colSpan={5}
                              className={cn(
                                'border-border sticky left-0 z-30 border-r border-b px-3 py-2 text-right font-semibold',
                                styles.day
                              )}
                            >
                              DS
                            </td>
                            {totals.map((t, index) => (
                              <td
                                key={`ds-${index}`}
                                className={cn(
                                  'border-border border-r border-b text-center tabular-nums',
                                  styles.day
                                )}
                              >
                                {t.ds}
                              </td>
                            ))}
                            <td className={cn('border-border border-b', styles.day)} />
                          </tr>
                          {showOperatorTotals && (
                            <tr>
                              <td
                                colSpan={5}
                                className={cn(
                                  'border-border sticky left-0 z-30 border-r border-b px-3 py-2 text-right text-[10px] text-muted-foreground',
                                  styles.day
                                )}
                              >
                                Operator DS (LV+TH)
                              </td>
                              {totals.map((t, index) => (
                                <td
                                  key={`dso-${index}`}
                                  className={cn(
                                    'border-border border-r border-b text-center tabular-nums text-[10px] text-muted-foreground',
                                    styles.day
                                  )}
                                >
                                  {t.dayOperator}
                                </td>
                              ))}
                              <td className={cn('border-border border-b', styles.day)} />
                            </tr>
                          )}
                          <tr>
                            <td
                              colSpan={5}
                              className={cn(
                                'border-border sticky left-0 z-30 border-r border-b bg-slate-800 px-3 py-2 text-right font-semibold text-white'
                              )}
                            >
                              NS
                            </td>
                            {totals.map((t, index) => (
                              <td
                                key={`ns-${index}`}
                                className={cn(
                                  'border-border border-r border-b bg-slate-800 text-center tabular-nums text-white'
                                )}
                              >
                                {t.ns}
                              </td>
                            ))}
                            <td className="border-border border-b bg-slate-800" />
                          </tr>
                          {showOperatorTotals && (
                            <tr>
                              <td
                                colSpan={5}
                                className={cn(
                                  'border-border sticky left-0 z-30 border-r border-b bg-slate-800 px-3 py-2 text-right text-[10px] text-slate-300'
                                )}
                              >
                                Operator NS (LV+TH)
                              </td>
                              {totals.map((t, index) => (
                                <td
                                  key={`nso-${index}`}
                                  className={cn(
                                    'border-border border-r border-b bg-slate-800 text-center tabular-nums text-[10px] text-slate-300'
                                  )}
                                >
                                  {t.nightOperator}
                                </td>
                              ))}
                              <td className="border-border border-b bg-slate-800" />
                            </tr>
                          )}
                          <tr>
                            <td
                              colSpan={5}
                              className={cn(
                                'border-border sticky left-0 z-30 border-r border-b bg-rose-50 px-3 py-2 text-right font-semibold text-rose-900'
                              )}
                            >
                              OFF
                            </td>
                            {totals.map((t, index) => (
                              <td
                                key={`off-${index}`}
                                className={cn(
                                  'border-border border-r border-b bg-rose-50 text-center tabular-nums text-rose-900'
                                )}
                              >
                                {t.off}
                              </td>
                            ))}
                            <td className="border-border border-b bg-rose-50" />
                          </tr>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <DialogFooter className="border-border/60 border-t bg-white px-5 py-3 sm:justify-between">
                <div className="text-muted-foreground text-sm">
                  Holiday hanya penanda. Schedule aktif lama tetap dipakai sampai draft diaktifkan
                  ulang.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditorPlan(null)}>
                    Tutup
                  </Button>
                  <Button variant="outline" onClick={exportSchedulePdf}>
                    <Printer className="size-4" /> Export PDF
                  </Button>
                  {canEdit ? (
                    <Button variant="outline" disabled={pending} onClick={saveDraft}>
                      <Save className="size-4" /> {pending ? 'Menyimpan...' : 'Save Draft'}
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button disabled={pending || !progress.complete} onClick={activatePlan}>
                      <CheckCircle2 className="size-4" /> Aktifkan
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Schedule V2?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === 'active'
                ? 'Schedule aktif akan dihapus. Attendance dan payroll kembali memakai Schedule V1 untuk site/bulan ini.'
                : 'Draft Schedule V2 akan dihapus permanen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={deletePlan}>
              <Trash2 className="mr-2 size-4" /> Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(selectedEmployee)} onOpenChange={() => setSelectedEmployeeId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profil Grid V2</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.name} · {selectedEmployee?.employeeSn}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Grouping Section</Label>
              <select
                value={profileSection}
                onChange={(event) => handleProfileSectionChange(event.target.value)}
                className="border-border h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                {sectionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {rosterSectionLabel(opt)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Posisi On Site (Grid)</Label>
              <select
                value={profilePositionOnSite}
                onChange={(event) => setProfilePositionOnSite(event.target.value)}
                className="border-border h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Pilih jabatan
                </option>
                {positionOptionsForSection(profileSection).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <Label>Kimper (Khusus Operator)</Label>
              <label className={cn("flex items-center gap-3", selectedEmployee?.kimperLv ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                <input
                  type="checkbox"
                  className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                  checked={Boolean(profileKimperLv || selectedEmployee?.kimperLv)}
                  disabled={selectedEmployee?.kimperLv}
                  onChange={(e) => setProfileKimperLv(e.target.checked)}
                />
                <div>
                  <div className="font-semibold">
                    Light Vehicle (LV)
                    {selectedEmployee?.kimperLv && <span className="text-muted-foreground ml-2 text-xs font-normal">(Sync dari Training)</span>}
                  </div>
                  <div className="text-muted-foreground text-xs">Valid kimper unit LV</div>
                </div>
              </label>
              <label className={cn("flex items-center gap-3", selectedEmployee?.kimperTh ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                <input
                  type="checkbox"
                  className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                  checked={Boolean(profileKimperTh || selectedEmployee?.kimperTh)}
                  disabled={selectedEmployee?.kimperTh}
                  onChange={(e) => setProfileKimperTh(e.target.checked)}
                />
                <div>
                  <div className="font-semibold">
                    Tower / Heavy (TH)
                    {selectedEmployee?.kimperTh && <span className="text-muted-foreground ml-2 text-xs font-normal">(Sync dari Training)</span>}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Valid kimper equipment besar
                  </div>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmployeeId(null)}>
              Batal
            </Button>
            <Button onClick={saveProfile}>Simpan Profil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
