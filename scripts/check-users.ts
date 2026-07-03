import { db } from "../db";
import { users, employees } from "../db/schema/hero";
import { like, eq } from "drizzle-orm";

async function main() {
  const u = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(like(users.name, "%Andana%"));
  console.log("Users:", u);
  
  const sessionUserEmail = u[0]?.email;
  const emp = await db.select({ email: employees.email }).from(employees).where(eq(employees.email, sessionUserEmail));
  console.log("Matched Employee by this email?", emp.length > 0);
}

main().catch(console.error).finally(() => process.exit(0));
