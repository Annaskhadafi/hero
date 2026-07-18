/**
 * Unit Utility Calculation Engine
 *
 * Mengkonsolidasikan data dari hero_daily_activity_session_items
 * berdasarkan unitNumber (freetext) untuk menghitung utilitas unit/object.
 *
 * Dua mode penggunaan:
 *
 * Mode A — Unit Tambang (DT001, EX002, dll):
 *   Satu unit dioperasikan bergantian oleh beberapa operator.
 *   totalUsageMinutes = Σ durasi semua operator
 *   utilityPercent = (totalUsageMinutes / 1440) * 100
 *
 * Mode B — Workshop Object (SN-12345, EQ-PUMP-01):
 *   Beberapa orang mengerjakan aktivitas BERBEDA pada objek yang sama.
 *   Snapshot per operator tetap direkam, tapi interpretasi bukan aggregate utilitas.
 *   Fungsi ini tetap menghitung total untuk konsistensi DB,
 *   tapi UI akan menampilkannya sebagai breakdown per aktivitas.
 */

import { AVAILABILITY_MINUTES } from './calculate-ewh'

export interface SessionItemEntry {
  sessionItemId: number
  sessionCode: string
  employeeId: number
  employeeName: string
  section: string
  activityLabel: string       // snapshotLabel dari session item
  startedAt: Date | null
  endedAt: Date | null
  isChecked: boolean
  unitNumber: string
  remark?: string
}

export interface UnitOperatorSlot {
  employeeId: number
  employeeName: string
  section: string
  activityLabel: string
  sessionCode: string
  startedAt: Date | null
  endedAt: Date | null
  durationMinutes: number
  operationMode: 'operating' | 'standby' | 'breakdown'  // default: 'operating'
}

export interface UnitUtilityResult {
  unitNumber: string
  totalUsageMinutes: number
  utilityPercent: number
  utilityPercentStr: string
  operatorCount: number
  activityEntryCount: number
  breakdownMinutes: number
  standbyMinutes: number
  operators: UnitOperatorSlot[]
}

/**
 * Kalkulasi durasi dalam menit dari dua Date.
 * Return 0 jika salah satu null atau endedAt < startedAt.
 */
function calcItemDuration(startedAt: Date | null, endedAt: Date | null): number {
  if (!startedAt || !endedAt) return 0
  const ms = endedAt.getTime() - startedAt.getTime()
  return ms > 0 ? Math.round(ms / 60000) : 0
}

/**
 * Deteksi operation mode dari remark (case-insensitive).
 * Karyawan bisa menulis "breakdown", "standby", "BD", "SB" di remark.
 */
function detectOperationMode(remark?: string): 'operating' | 'standby' | 'breakdown' {
  if (!remark) return 'operating'
  const r = remark.toLowerCase()
  if (r.includes('breakdown') || r.includes(' bd') || r.startsWith('bd')) return 'breakdown'
  if (r.includes('standby') || r.includes(' sb') || r.startsWith('sb')) return 'standby'
  return 'operating'
}

/**
 * Hitung utilitas unit untuk satu hari dari kumpulan session items.
 */
export function calculateUnitUtility(
  unitNumber: string,
  items: SessionItemEntry[]
): UnitUtilityResult {
  if (!items.length) {
    return {
      unitNumber,
      totalUsageMinutes: 0,
      utilityPercent: 0,
      utilityPercentStr: '0.00',
      operatorCount: 0,
      activityEntryCount: 0,
      breakdownMinutes: 0,
      standbyMinutes: 0,
      operators: [],
    }
  }

  const operators: UnitOperatorSlot[] = items.map((item) => {
    const durationMinutes = calcItemDuration(item.startedAt, item.endedAt)
    const operationMode = detectOperationMode(item.remark)
    return {
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      section: item.section,
      activityLabel: item.activityLabel,
      sessionCode: item.sessionCode,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      durationMinutes,
      operationMode,
    }
  })

  const totalUsageMinutes = operators.reduce((sum, op) => sum + op.durationMinutes, 0)
  const breakdownMinutes = operators
    .filter((op) => op.operationMode === 'breakdown')
    .reduce((sum, op) => sum + op.durationMinutes, 0)
  const standbyMinutes = operators
    .filter((op) => op.operationMode === 'standby')
    .reduce((sum, op) => sum + op.durationMinutes, 0)

  const uniqueEmployeeIds = new Set(operators.map((op) => op.employeeId))
  const utilityPercent = Math.round((totalUsageMinutes / AVAILABILITY_MINUTES) * 10000) / 100

  return {
    unitNumber,
    totalUsageMinutes,
    utilityPercent,
    utilityPercentStr: utilityPercent.toFixed(2),
    operatorCount: uniqueEmployeeIds.size,
    activityEntryCount: items.length,
    breakdownMinutes,
    standbyMinutes,
    operators,
  }
}

/**
 * Klasifikasi utilitas unit untuk display (color coding).
 */
export function classifyUtility(
  utilityPercent: number
): 'high' | 'medium' | 'low' | 'idle' | 'breakdown' {
  if (utilityPercent === 0) return 'idle'
  if (utilityPercent >= 75) return 'high'
  if (utilityPercent >= 50) return 'medium'
  if (utilityPercent >= 25) return 'low'
  return 'breakdown'
}
