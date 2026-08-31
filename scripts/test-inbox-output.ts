import { getSopWinRequestInboxItems } from "../lib/approval-workspace";
import { db } from "../db";
import { employees } from "../db/schema/hero";
import { eq } from "drizzle-orm";

async function testInbox() {
  const [ria] = await db.select().from(employees).where(eq(employees.email, "ria.annisa@chitraparatama.com")).limit(1);
  console.log("Testing inbox resolution for Ria Annisa (id:", ria?.id, ")...");

  const items = await (getSopWinRequestInboxItems as any)("ria.annisa@chitraparatama.com", ria);
  console.log(`Found ${items.length} items for Ria Annisa inbox:`);
  for (const item of items) {
    console.log(`- ${item.documentNumber} | ${item.title} | Step: ${item.currentStepLabel} | Status: ${item.status}`);
  }
}

testInbox().catch(console.error);
