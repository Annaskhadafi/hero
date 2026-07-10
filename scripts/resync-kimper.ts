import 'dotenv/config'
import { eq, inArray, sql } from 'drizzle-orm'
import Fuse from 'fuse.js'
import { db } from '@/db'
import { trainingRecords, sioCertifications } from '@/db/schema/hero'
import { timesheetSchedulingPlansV2 } from '@/db/schema/timesheet'

async function run() {
  console.log('Starting Kimper resync...')
  
  // 1. Fetch valid training records
  const trainingRecordsRows = await db
    .select({
      employeeId: trainingRecords.employeeId,
      trainingName: trainingRecords.trainingName,
      status: trainingRecords.status,
    })
    .from(trainingRecords)
    .where(inArray(sql`lower(${trainingRecords.status})`, ['valid', 'active', 'aktif']))
  const sioCertificationsRows = await db
    .select({
      employeeId: sioCertifications.employeeId,
      certName: sioCertifications.certName,
      certType: sioCertifications.certType,
      status: sioCertifications.status,
    })
    .from(sioCertifications)
    .where(inArray(sql`lower(${sioCertifications.status})`, ['valid', 'active', 'aktif']))

  // 2. Compute kimperMap
  const kimperMap = new Map<number, { isLV: boolean; isTH: boolean }>()
  const thKeywords = ['forklift', 'loader', 'tyrehandler', 'tyre handler', 'heavy', 'excavator', 'dozer', 'grader']
  const isLV = (name: string) => /\b(lv|light vehicle|sim a|sim b)\b/i.test(name)

  const allRecords = [
    ...sioCertificationsRows.map((r) => ({
      employeeId: r.employeeId,
      name: `${r.certName} ${r.certType}`,
    })),
  ]

  for (const record of allRecords) {
    const name = record.name.toLowerCase()
    const state = kimperMap.get(record.employeeId) || { isLV: false, isTH: false }
    
    if (isLV(name)) {
      state.isLV = true
    }
    
    const words = name.split(/[\s,/-]+/)
    const thFuse = new Fuse(thKeywords.map(kw => ({ kw })), { keys: ['kw'], threshold: 0.3 })
    
    let matchedTH = false
    for (const w of words) {
      if (thFuse.search(w).length > 0) {
        matchedTH = true
        break
      }
    }
    // Check exact matches just in case the phrase has spaces like 'tyre handler'
    for (const kw of thKeywords) {
      if (name.includes(kw)) {
        matchedTH = true
        break
      }
    }
    if (matchedTH) {
      state.isTH = true
    }
    kimperMap.set(record.employeeId, state)
  }

  // 3. Fetch all v2 plans
  const plans = await db
    .select()
    .from(timesheetSchedulingPlansV2)

  let updatedCount = 0
  
  for (const plan of plans) {
    let changed = false
    const draftSchedule = (plan.draftSchedule || []) as any[]
    const activeSchedule = (plan.activeSchedule || []) as any[]

    for (const row of draftSchedule) {
      const syncedState = kimperMap.get(row.employeeId) || { isLV: false, isTH: false }
      // Force sync: ONLY keep what the training records say
      if (row.kimperLv !== syncedState.isLV || row.kimperTh !== syncedState.isTH) {
        row.kimperLv = syncedState.isLV
        row.kimperTh = syncedState.isTH
        changed = true
      }
    }

    for (const row of activeSchedule) {
      const syncedState = kimperMap.get(row.employeeId) || { isLV: false, isTH: false }
      if (row.kimperLv !== syncedState.isLV || row.kimperTh !== syncedState.isTH) {
        row.kimperLv = syncedState.isLV
        row.kimperTh = syncedState.isTH
        changed = true
      }
    }

    if (changed) {
      await db
        .update(timesheetSchedulingPlansV2)
        .set({
          draftSchedule,
          activeSchedule,
        })
        .where(eq(timesheetSchedulingPlansV2.id, plan.id))
      
      updatedCount++
    }
  }

  console.log(`Resync complete! Updated ${updatedCount} plans.`)
  process.exit(0)
}

run().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
