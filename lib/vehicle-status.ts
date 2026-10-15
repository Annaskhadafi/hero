import type { HeroVehicle } from '@/db/schema/vehicles'

export type DocumentAlertStatus = 'expired' | 'warning' | 'safe' | 'not_applicable'

export interface VehicleComputedRow extends HeroVehicle {
  stnkDaysRemaining: number | null
  stnkAlertStatus: DocumentAlertStatus
  taxDaysRemaining: number | null
  taxAlertStatus: DocumentAlertStatus
  kirDaysRemaining: number | null
  kirAlertStatus: DocumentAlertStatus
  serviceDaysSince: number | null
  serviceAlertStatus: 'due' | 'safe' | 'not_recorded'
  siteNameFallback: string
}

export function calculateDateDiffDays(targetDate: string | Date | null): number | null {
  if (!targetDate) return null
  const target = new Date(targetDate)
  if (isNaN(target.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function computeVehicleStatus(v: HeroVehicle): VehicleComputedRow {
  const stnkDiff = calculateDateDiffDays(v.stnkExpiryDate)
  let stnkAlert: DocumentAlertStatus = 'not_applicable'
  if (stnkDiff !== null) {
    if (stnkDiff <= 0) stnkAlert = 'expired'
    else if (stnkDiff <= 30) stnkAlert = 'warning'
    else stnkAlert = 'safe'
  }

  const taxDiff = calculateDateDiffDays(v.taxExpiryDate)
  let taxAlert: DocumentAlertStatus = 'not_applicable'
  if (taxDiff !== null) {
    if (taxDiff <= 0) taxAlert = 'expired'
    else if (taxDiff <= 30) taxAlert = 'warning'
    else taxAlert = 'safe'
  }

  const kirDiff = calculateDateDiffDays(v.kirExpiryDate)
  let kirAlert: DocumentAlertStatus = 'not_applicable'
  if (kirDiff !== null) {
    if (kirDiff <= 0) kirAlert = 'expired'
    else if (kirDiff <= 30) kirAlert = 'warning'
    else kirAlert = 'safe'
  }

  let serviceDaysSince: number | null = null
  let serviceAlert: 'due' | 'safe' | 'not_recorded' = 'not_recorded'
  if (v.lastServiceDate) {
    const diff = calculateDateDiffDays(v.lastServiceDate)
    if (diff !== null) {
      serviceDaysSince = Math.abs(diff)
      if (serviceDaysSince >= 150) serviceAlert = 'due' // >= 5 months
      else serviceAlert = 'safe'
    }
  }

  return {
    ...v,
    stnkDaysRemaining: stnkDiff,
    stnkAlertStatus: stnkAlert,
    taxDaysRemaining: taxDiff,
    taxAlertStatus: taxAlert,
    kirDaysRemaining: kirDiff,
    kirAlertStatus: kirAlert,
    serviceDaysSince,
    serviceAlertStatus: serviceAlert,
    siteNameFallback: v.locationName || 'Balikpapan',
  }
}
