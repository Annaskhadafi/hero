import { db } from '../db'
import { dailyActivitySessions, dailyActivitySessionItems } from '../db/schema/hero'
import { eq, inArray } from 'drizzle-orm'

async function main() {
  const codes = ['DAS-20261007-73453-474', 'DAS-20261006-76791-869']
  const sessions = await db
    .select()
    .from(dailyActivitySessions)
    .where(inArray(dailyActivitySessions.sessionCode, codes))

  console.log('Sessions found:', sessions.map((s) => ({ id: s.id, code: s.sessionCode, status: s.status })))

  for (const session of sessions) {
    const items = await db
      .select()
      .from(dailyActivitySessionItems)
      .where(eq(dailyActivitySessionItems.sessionId, session.id))

    console.log(`\n--- Session ${session.sessionCode} (ID: ${session.id}) has ${items.length} items ---`)
    
    // Group identical items by (snapshotLabel, startedAt, endedAt, remark)
    const grouped = new Map<string, typeof items>()
    for (const item of items) {
      const key = `${item.snapshotLabel}||${item.startedAt?.toISOString()}||${item.endedAt?.toISOString()}||${item.remark}`
      const existing = grouped.get(key) || []
      existing.push(item)
      grouped.set(key, existing)
    }

    const idsToDelete: number[] = []
    const itemsToUpdate: Array<{ id: number; combinedUnit: string }> = []

    for (const [key, groupItems] of grouped.entries()) {
      if (groupItems.length > 1) {
        console.log(`Found duplicate group (${groupItems.length} items) for key: ${key.slice(0, 60)}...`)
        // Keep the first item, combine unitNumbers
        const keepItem = groupItems[0]
        const allUnits = Array.from(new Set(groupItems.map((gi) => gi.unitNumber).filter(Boolean)))
        const combinedUnit = allUnits.join(', ')

        itemsToUpdate.push({ id: keepItem.id, combinedUnit })

        for (let i = 1; i < groupItems.length; i++) {
          idsToDelete.push(groupItems[i].id)
        }
      }
    }

    console.log(`Session ${session.sessionCode}: updating ${itemsToUpdate.length} kept items, deleting ${idsToDelete.length} duplicate items.`)

    for (const upd of itemsToUpdate) {
      await db
        .update(dailyActivitySessionItems)
        .set({ unitNumber: upd.combinedUnit })
        .where(eq(dailyActivitySessionItems.id, upd.id))
    }

    if (idsToDelete.length > 0) {
      await db
        .delete(dailyActivitySessionItems)
        .where(inArray(dailyActivitySessionItems.id, idsToDelete))
    }
  }

  console.log('\nDeduplication cleanup complete!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
