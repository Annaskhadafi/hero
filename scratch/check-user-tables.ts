import { db } from "../db"
import { hrEmployees, employees } from "../db/schema/hero"
import { user } from "../db/schema/auth"
import { sql } from "drizzle-orm"

async function run() {
  try {
    const hrCount = await db.select({ count: sql<number>`count(*)` }).from(hrEmployees)
    const empCount = await db.select({ count: sql<number>`count(*)` }).from(employees)
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(user)
    
    console.log("--- TABLE ROW COUNTS ---")
    console.log("hrEmployees count:", hrCount[0]?.count)
    console.log("employees count:", empCount[0]?.count)
    console.log("user (auth) count:", userCount[0]?.count)

    // Let's print some sample rows
    if (empCount[0]?.count > 0) {
      const sampleEmp = await db.select().from(employees).limit(3)
      console.log("\nSample employees:", sampleEmp)
    }

    if (hrCount[0]?.count > 0) {
      const sampleHr = await db.select().from(hrEmployees).limit(3)
      console.log("\nSample hrEmployees:", sampleHr)
    }

    if (userCount[0]?.count > 0) {
      const sampleUser = await db.select().from(user).limit(3)
      console.log("\nSample users:", sampleUser)
    }
  } catch (error) {
    console.error("Error reading tables:", error)
  }
  process.exit(0)
}

run()
