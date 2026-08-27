import { db } from '../db'
import { notificationEvents, notificationDeliveries } from '../db/schema/hero'
import { desc } from 'drizzle-orm'

async function run() {
  const events = await db
    .select()
    .from(notificationEvents)
    .orderBy(desc(notificationEvents.createdAt))
    .limit(10)

  console.log('Recent Notification Events (last 10):')
  for (const e of events) {
    console.log(`[${e.createdAt?.toISOString()}] Event #${e.id} | Type: ${e.eventType} | Recipient: ${e.recipient} | Status: ${e.deliveryStatus} | Payload: ${e.payloadSnapshot}`)
  }

  const deliveries = await db
    .select()
    .from(notificationDeliveries)
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(10)

  console.log('\nRecent Notification Deliveries (last 10):')
  for (const d of deliveries) {
    console.log(`[${d.createdAt?.toISOString()}] Delivery #${d.id} | Channel: ${d.deliveryChannel} | Recipient: ${d.recipient} | Status: ${d.status}`)
  }
}

run().catch(console.error)
