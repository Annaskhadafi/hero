const APP_TIME_ZONE = 'Asia/Makassar'

export interface SioCertRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
  certType: string
  certNumber: string | null
  certName: string
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
  lastSyncFrom: string | null
}

export interface EmployeeOption {
  id: number
  name: string
  employeeSn: string | null
  department: string | null
  section: string | null
}

export interface DashboardAggregate {
  totalRecords: number
  activeCount: number
  expiringCount: number
  expiredCount: number
  certTypeDistribution: { type: string; count: number }[]
  departmentCoverage: { name: string; count: number; employees: number }[]
  expiringSoonList: { employeeName: string; certName: string; certType: string; daysLeft: number }[]
  expiredList: { employeeName: string; certName: string; certType: string; daysOverdue: number }[]
}

export function computeAggregates(
  rows: SioCertRow[],
  referenceDate: Date
): DashboardAggregate {
  const active: SioCertRow[] = []
  const expiring: SioCertRow[] = []
  const expired: SioCertRow[] = []

  for (const r of rows) {
    const days = r.expiryDate
      ? Math.ceil(
          (new Date(r.expiryDate).getTime() - referenceDate.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : null
    if (days === null || days > 30) active.push(r)
    else if (days >= 0) expiring.push(r)
    else expired.push(r)
  }

  const typeMap: Record<string, number> = {}
  for (const r of rows) {
    typeMap[r.certType] = (typeMap[r.certType] || 0) + 1
  }
  const certTypeDistribution = Object.entries(typeMap || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const deptMap: Record<string, { count: number; employees: Set<number> }> = {}
  for (const r of rows) {
    const dept = r.department || 'Lainnya'
    if (!deptMap[dept]) deptMap[dept] = { count: 0, employees: new Set() }
    deptMap[dept].count++
    deptMap[dept].employees.add(r.employeeId)
  }
  const departmentCoverage = Object.entries(deptMap || {})
    .map(([name, d]) => ({ name, count: d.count, employees: d.employees.size }))
    .sort((a, b) => b.count - a.count)

  const expiringSoonList = expiring.map((r) => ({
    employeeName: r.employeeName || '',
    certName: r.certName,
    certType: r.certType,
    daysLeft: Math.ceil(
      (new Date(r.expiryDate!).getTime() - referenceDate.getTime()) /
        (24 * 60 * 60 * 1000)
    ),
  }))

  const expiredList = expired.map((r) => ({
    employeeName: r.employeeName || '',
    certName: r.certName,
    certType: r.certType,
    daysOverdue: Math.abs(
      Math.ceil(
        (new Date(r.expiryDate!).getTime() - referenceDate.getTime()) /
          (24 * 60 * 60 * 1000)
      )
    ),
  }))

  return {
    totalRecords: rows.length,
    activeCount: active.length,
    expiringCount: expiring.length,
    expiredCount: expired.length,
    certTypeDistribution,
    departmentCoverage,
    expiringSoonList,
    expiredList,
  }
}
