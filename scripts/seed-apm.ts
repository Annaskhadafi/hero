import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";

async function seed() {
  console.log("Creating Test APM...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "APM",
    description: "Bagaimana melakukan tes:\n- Pilih pola gambar (1-8) yang paling tepat untuk melengkapi gambar utama.\n- Waktu tes 25 menit",
    timeLimitMinutes: 25,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  console.log(`Inserting 36 questions...`);
  
  for (let i = 1; i <= 36; i++) {
    // Generate options 1 to 8
    const options = Array.from({ length: 8 }, (_, idx) => {
      const optVal = String(idx + 1);
      return {
        id: optVal, 
        text: optVal,
        imageUrl: "" // user can add images later if needed
      };
    });

    await db.insert(hcOnlineTestQuestions).values({
      testId: test.id,
      questionType: "multiple_choice",
      questionText: `Soal ${i}`,
      options: options,
      correctAnswer: "",
      points: 1,
      sortOrder: i,
    });
  }

  console.log("Done! Inserted all 36 APM questions.");
}

seed().catch(console.error);
