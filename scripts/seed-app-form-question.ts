import { db } from "../db";
import { hcOnlineTestQuestions } from "../db/schema/hero";

async function seed() {
  console.log("Adding dummy question to Application Form (ID: 7)...");
  await db.insert(hcOnlineTestQuestions).values({
    testId: 7,
    questionType: "essay",
    questionText: "Application Form Data",
    correctAnswer: "N/A",
    points: 0,
    sortOrder: 1,
  });
  console.log("Done.");
}

seed().catch(console.error);
