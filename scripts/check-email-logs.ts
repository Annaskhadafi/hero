import { db } from '../db'
import { emailDeliveryLogs, notificationEvents, notificationDeliveries } from '../db/schema/hero'
import { desc } from 'drizzle-orm'

async function checkLogs() {
  const logs = await db.select().from(emailDeliveryLogs).orderBy(desc(emailDeliveryLogs.createdAt)).limit(30)
  console.log(`Found ${logs.length} email delivery logs:`)
  for (const l of logs) {
    console.log(`[${l.createdAt?.toISOString()}] To: ${l.toEmail} | Subject: ${l.subject} | Status: ${l.status} | Err: ${l.errorMessage || 'none'}`)
  }

  const events = await db
    .select()
    .from(notificationEvents)
    .orderBy(desc(notificationEvents.createdAt))
    .limit(10)

  console.log('\nRecent Notification Events (last 10):')
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

checkLogs().catch(console.error)
