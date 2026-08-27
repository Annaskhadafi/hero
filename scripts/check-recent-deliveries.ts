import { db } from '../db'
import { notificationDeliveries, notificationEvents } from '../db/schema/hero'
import { desc } from 'drizzle-orm'

async function run() {
  const events = await db
    .select()
    .from(notificationEvents)
    .orderBy(desc(notificationEvents.createdAt))
    .limit(5)

  console.log('Recent Events:')
  for (const e of events) {
    console.log(`[${e.createdAt?.toISOString()}] Event #${e.id} | Channel: ${e.channel} | Type: ${e.eventType} | Recipient: ${e.recipient} | Status: ${e.deliveryStatus} | Payload: ${e.payloadSnapshot}`)
  }

  const deliveries = await db
    .select()
    .from(notificationDeliveries)
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(5)

  console.log('\nRecent Deliveries:')
  for (const d of deliveries) {
    console.log(`[${d.createdAt?.toISOString()}] Delivery #${d.id} | Channel: ${d.deliveryChannel} | Recipient: ${d.recipient} | Status: ${d.status} | Error: ${d.errorReason || '-'}`)
  }
}

run().catch(console.error)
