import { db } from "../db";
import { hcOnlineTestGroups, hcOnlineTestGroupItems, hcOnlineTests } from "../db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function seed() {
  console.log("Seeding Test Groups...");

  // Retrieve existing tests
  const tests = await db.select().from(hcOnlineTests).where(
    inArray(hcOnlineTests.title, [
      "Application Form",
      "APM",
      "AMR",
      "FREXOR DISC Attitude Test",
      "FREXOR VAK Working Style Test",
      "Test IQ" // wait, what was it named?
    ])
  );
  
  // Wait, what is the exact name of Application Form? I need to look it up.
  const allTests = await db.select({ id: hcOnlineTests.id, title: hcOnlineTests.title }).from(hcOnlineTests);
  console.log("Available tests in DB:", allTests.map(t => t.title).join(", "));
  
  // Actually, let's just match them dynamically
  const getTestId = (titleIncludes: string) => {
    const t = allTests.find(t => t.title.toLowerCase().includes(titleIncludes.toLowerCase()));
    if (!t) throw new Error(`Test not found containing: ${titleIncludes}`);
    return t.id;
  };

  const appFormId = getTestId("Application Form");
  const apmId = getTestId("APM");
  const amrId = getTestId("AMR");
  const discId = getTestId("DISC");
  const vakId = getTestId("VAK");
  const iqId = getTestId("IQ");

  console.log("Resolved Test IDs:");
  console.log({ appFormId, apmId, amrId, discId, vakId, iqId });

  // Clean old groups
  await db.delete(hcOnlineTestGroupItems);
  await db.delete(hcOnlineTestGroups);

  // Create Test 1
  const [group1] = await db.insert(hcOnlineTestGroups).values({
    name: "Test 1",
    slug: "test-1",
    description: "Application Form, APM, AMR"
  }).returning();

  await db.insert(hcOnlineTestGroupItems).values([
    { groupId: group1.id, testId: appFormId, sortOrder: 1 },
    { groupId: group1.id, testId: apmId, sortOrder: 2 },
    { groupId: group1.id, testId: amrId, sortOrder: 3 },
  ]);

  // Create Test 2
  const [group2] = await db.insert(hcOnlineTestGroups).values({
    name: "Test 2",
    slug: "test-2",
    description: "Application Form, DISC, VAK, IQ"
  }).returning();

  await db.insert(hcOnlineTestGroupItems).values([
    { groupId: group2.id, testId: appFormId, sortOrder: 1 },
    { groupId: group2.id, testId: discId, sortOrder: 2 },
    { groupId: group2.id, testId: vakId, sortOrder: 3 },
    { groupId: group2.id, testId: iqId, sortOrder: 4 },
  ]);

  console.log("Successfully created Test Groups!");
}

seed().catch(console.error);
