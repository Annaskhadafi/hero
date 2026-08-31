import { db } from "../db";
import { emailDeliveryLogs } from "../db/schema/hero";
import { desc } from "drizzle-orm";

async function checkLogs() {
  const logs = await db.select().from(emailDeliveryLogs).orderBy(desc(emailDeliveryLogs.createdAt)).limit(30);
  console.log(`Found ${logs.length} email delivery logs:`);
  for (const l of logs) {
    console.log(`[${l.createdAt?.toISOString()}] To: ${l.toEmail} | Subject: ${l.subject} | Status: ${l.status} | Err: ${l.errorMessage || "none"}`);
  }
}

checkLogs().catch(console.error);
