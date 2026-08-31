import { db } from "../db";
import { employees } from "../db/schema/hero";
import { like, or } from "drizzle-orm";

async function checkAbian() {
  const list = await db.select().from(employees).where(or(like(employees.name, "%Abian%"), like(employees.email, "%abian%")));
  console.log(`Found ${list.length} employees matching Abian:`);
  for (const e of list) {
    console.log(`- ID: ${e.id} | Name: ${e.name} | Email: ${e.email} | Role: ${e.role} | AccessRole: ${e.accessRole}`);
  }
}

checkAbian().catch(console.error);
