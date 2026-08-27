import { db } from '../db'
import { notificationDeliveries } from '../db/schema/hero'
import { desc, eq } from 'drizzle-orm'

async function run() {
  const deliveries = await db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.deliveryChannel, 'email'))
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(10)

  console.log('Email deliveries count:', deliveries.length)
  for (const d of deliveries) {
    console.log(`[${d.createdAt?.toISOString()}] Delivery #${d.id} | To: ${d.recipient} | Status: ${d.status} | Error: ${d.errorReason || '-'}`)
  }
}

run().catch(console.error)
