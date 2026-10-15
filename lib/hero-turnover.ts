import { db } from '@/db'
import {
  hcTurnoverSettings,
  hcTurnoverMovements,
  employees,
  masterDepartments,
  masterSections,
  masterPositions,
  sites,
  type HcTurnoverMovement,
} from '@/db/schema/hero'
import { and, desc, eq, gte, lte } from 'drizzle-orm'

export interface TurnoverMonthlyData {
  month: number
  monthName: string
  startHeadcount: number
  incomings: {
    newHire: number
    transfer: number
    reHire: number
    total: number
  }
  outgoings: {
    resign: number
    contractComplete: number
    terminate: number
    pension: number
    total: number
  }
  endHeadcount: number
  turnoverRate: number // percentage
}

export interface TurnoverMatrixSummary {
  year: number
  initialHeadcount: number
  months: TurnoverMonthlyData[]
  totals: {
    incomings: {
      newHire: number
      transfer: number
      reHire: number
      total: number
    }
    outgoings: {
      resign: number
      contractComplete: number
      terminate: number
      pension: number
      total: number
    }
    averageTurnoverRate: number
    finalHeadcount: number
    netGrowth: number
  }
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

export async function getTurnoverDashboardData(year = 2026) {
  // 1. Initial Headcount from hcTurnoverSettings
  const [initialSetting] = await db
    .select()
    .from(hcTurnoverSettings)
    .where(eq(hcTurnoverSettings.year, year))
    .limit(1)

  const initialHeadcount = initialSetting?.initialHeadcount ?? 471

  // 2. Fetch movements for the year
  const startDateStr = `${year}-01-01`
  const endDateStr = `${year}-12-31`

  const movements = await db
    .select()
    .from(hcTurnoverMovements)
    .where(
      and(
        gte(hcTurnoverMovements.movementDate, startDateStr),
        lte(hcTurnoverMovements.movementDate, endDateStr)
      )
    )
    .orderBy(desc(hcTurnoverMovements.movementDate))

  // 3. Separate into incoming & outgoing
  const incomingList: HcTurnoverMovement[] = []
  const outgoingList: HcTurnoverMovement[] = []

  movements.forEach((m) => {
    if (m.movementType === 'incoming') {
      incomingList.push(m)
    } else {
      outgoingList.push(m)
    }
  })

  // 4. Calculate monthly matrix
  const monthlyData: TurnoverMonthlyData[] = []
  let runningHeadcount = initialHeadcount

  let totalNewHire = 0
  let totalTransferIn = 0
  let totalReHire = 0
  let totalResign = 0
  let totalContractComplete = 0
  let totalTerminate = 0
  let totalPension = 0

  for (let mIndex = 0; mIndex < 12; mIndex++) {
    const monthNumber = mIndex + 1
    const padMonth = String(monthNumber).padStart(2, '0')
    const monthPrefix = `${year}-${padMonth}`

    const monthMovements = movements.filter((m) => {
      const movementStr = typeof m.movementDate === 'string'
        ? m.movementDate
        : new Date(m.movementDate).toISOString().slice(0, 10)
      return movementStr.startsWith(monthPrefix)
    })

    let newHire = 0
    let transfer = 0
    let reHire = 0
    let resign = 0
    let contractComplete = 0
    let terminate = 0
    let pension = 0

    monthMovements.forEach((m) => {
      const rem = (m.remark || '').toLowerCase().trim()
      if (m.movementType === 'incoming') {
        if (rem.includes('transfer')) {
          transfer++
        } else if (rem.includes('re hire') || rem.includes('rehire') || rem.includes('re-hire')) {
          reHire++
        } else {
          newHire++
        }
      } else if (m.movementType === 'outgoing') {
        if (rem.includes('contract') || rem.includes('habis kontrak')) {
          contractComplete++
        } else if (rem.includes('terminate') || rem.includes('phk') || rem.includes('dikeluarkan')) {
          terminate++
        } else if (rem.includes('pensiun') || rem.includes('pension')) {
          pension++
        } else {
          resign++
        }
      }
    })

    const totalIncomingMonth = newHire + transfer + reHire
    const totalOutgoingMonth = resign + contractComplete + terminate + pension

    const startH = runningHeadcount
    const endH = startH + totalIncomingMonth - totalOutgoingMonth
    runningHeadcount = endH

    const avgH = (startH + endH) / 2
    const turnoverRate = avgH > 0 ? (totalOutgoingMonth / avgH) * 100 : 0

    totalNewHire += newHire
    totalTransferIn += transfer
    totalReHire += reHire
    totalResign += resign
    totalContractComplete += contractComplete
    totalTerminate += terminate
    totalPension += pension

    monthlyData.push({
      month: monthNumber,
      monthName: MONTH_NAMES[mIndex],
      startHeadcount: startH,
      incomings: {
        newHire,
        transfer,
        reHire,
        total: totalIncomingMonth,
      },
      outgoings: {
        resign,
        contractComplete,
        terminate,
        pension,
        total: totalOutgoingMonth,
      },
      endHeadcount: endH,
      turnoverRate: parseFloat(turnoverRate.toFixed(2)),
    })
  }

  const grandTotalIncoming = totalNewHire + totalTransferIn + totalReHire
  const grandTotalOutgoing = totalResign + totalContractComplete + totalTerminate + totalPension
  const avgYearlyHeadcount = (initialHeadcount + runningHeadcount) / 2
  const yearlyTurnoverRate =
    avgYearlyHeadcount > 0 ? (grandTotalOutgoing / avgYearlyHeadcount) * 100 : 0

  const summary: TurnoverMatrixSummary = {
    year,
    initialHeadcount,
    months: monthlyData,
    totals: {
      incomings: {
        newHire: totalNewHire,
        transfer: totalTransferIn,
        reHire: totalReHire,
        total: grandTotalIncoming,
      },
      outgoings: {
        resign: totalResign,
        contractComplete: totalContractComplete,
        terminate: totalTerminate,
        pension: totalPension,
        total: grandTotalOutgoing,
      },
      averageTurnoverRate: parseFloat(yearlyTurnoverRate.toFixed(2)),
      finalHeadcount: runningHeadcount,
      netGrowth: grandTotalIncoming - grandTotalOutgoing,
    },
  }

  // 5. Reference options for select
  const [depts, secs, pos, siteList] = await Promise.all([
    db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(masterDepartments.name),
    db
      .select({ id: masterSections.id, name: masterSections.name, departmentId: masterSections.departmentId })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(masterSections.name),
    db
      .select({ id: masterPositions.id, name: masterPositions.name })
      .from(masterPositions)
      .where(eq(masterPositions.isActive, true))
      .orderBy(masterPositions.name),
    db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(sites.name),
  ])

  // Active employees for picking outgoing or linking
  const activeEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      section: employees.section,
      poh: employees.pointOfHire,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      joinDate: employees.joinDate,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(employees.name)

  const distinctMovementDepts = Array.from(
    new Set(movements.map((m) => m.department).filter(Boolean))
  ).sort()
  const distinctMovementSecs = Array.from(
    new Set(movements.map((m) => m.section).filter(Boolean))
  ).sort()

  return {
    summary,
    incomingList,
    outgoingList,
    options: {
      departments: depts,
      sections: secs,
      positions: pos,
      sites: siteList,
      activeEmployees,
      movementDepartments: distinctMovementDepts,
      movementSections: distinctMovementSecs,
    },
  }
}
