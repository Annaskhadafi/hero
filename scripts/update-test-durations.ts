import { db } from "../db";
import { hcOnlineTests } from "../db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function run() {
  console.log("Updating Test Durations...");

  const allTests = await db.select({ id: hcOnlineTests.id, title: hcOnlineTests.title }).from(hcOnlineTests);
  const getTestId = (titleIncludes: string) => {
    const t = allTests.find(t => t.title.toLowerCase().includes(titleIncludes.toLowerCase()));
    if (!t) return null;
    return t.id;
  };

  const updates = [
    { id: getTestId("Application Form"), timeLimit: 15 },
    { id: getTestId("APM"), timeLimit: 40 },
    { id: getTestId("AMR"), timeLimit: 25 },
    { id: getTestId("DISC"), timeLimit: 15 },
    { id: getTestId("VAK"), timeLimit: 15 },
    { id: getTestId("IQ"), timeLimit: 30 }
  ];

  for (const u of updates) {
    if (u.id) {
      await db.update(hcOnlineTests).set({ timeLimitMinutes: u.timeLimit }).where(eq(hcOnlineTests.id, u.id));
      console.log(`Updated Test ID ${u.id} to ${u.timeLimit} minutes.`);
    }
  }
}

run().catch(console.error);
