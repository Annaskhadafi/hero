import { db } from '@/db';
import { emailDeliveryLogs } from '@/db/schema/hero';
import { desc } from 'drizzle-orm';

async function main() {
  const logs = await db.select().from(emailDeliveryLogs).orderBy(desc(emailDeliveryLogs.createdAt)).limit(20);
  console.log('Total recent logs:', logs.length);
  for (const l of logs) {
    const icon = l.status === 'sent' ? '✅' : '❌';
    console.log(`${icon} To: ${l.toEmail} | Template: ${l.templateCode ?? l.templateName ?? '?'} | Subject: ${l.subject ?? ''} | Status: ${l.status}`);
    if (l.errorMessage) console.log(`  Error: ${l.errorMessage}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
