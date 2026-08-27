import { db } from '../db'
import { notificationDeliveries, notificationEvents } from '../db/schema/hero'
import { desc, eq } from 'drizzle-orm'

async function run() {
  const deliveries = await db
    .select({
      id: notificationDeliveries.id,
      channel: notificationDeliveries.deliveryChannel,
      recipient: notificationDeliveries.recipient,
      status: notificationDeliveries.status,
      errorReason: notificationDeliveries.errorReason,
      sentAt: notificationDeliveries.sentAt,
      createdAt: notificationDeliveries.createdAt,
      eventId: notificationEvents.id,
      eventType: notificationEvents.eventType,
      payload: notificationEvents.payloadSnapshot,
    })
    .from(notificationDeliveries)
    .leftJoin(notificationEvents, eq(notificationDeliveries.notificationEventId, notificationEvents.id))
    .where(eq(notificationDeliveries.deliveryChannel, 'email'))
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(10)

  console.log('Recent Email Deliveries:')
  for (const d of deliveries) {
    console.log(`[${d.createdAt?.toISOString()}] Email #${d.id} | To: ${d.recipient} | Event: ${d.eventType} | Status: ${d.status} | Error: ${d.errorReason || '-'}`)
    if (d.payload) console.log(`   Payload: ${d.payload}`)
  }
}

run().catch(console.error)
