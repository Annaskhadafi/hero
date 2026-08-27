import { db } from '../db'
import { notificationEvents, emailLogs } from '../db/schema/hero'
import { desc } from 'drizzle-orm'

async function run() {
  const events = await db
    .select()
    .from(notificationEvents)
    .orderBy(desc(notificationEvents.createdAt))
    .limit(5)

  console.log('Events:')
  for (const e of events) {
    console.log(e)
  }

  const emails = await db
    .select()
    .from(emailLogs)
    .orderBy(desc(emailLogs.createdAt))
    .limit(5)

  console.log('\nEmail Logs:')
  for (const em of emails) {
    console.log(em)
  }
}

run().catch(console.error)
