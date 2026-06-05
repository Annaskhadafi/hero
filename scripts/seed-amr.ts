import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";

async function seed() {
  console.log("Creating Test AMR...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "AMR",
    description: "Bagaimana melakukan tes:\n- Pilih satu jawaban yang menurut Anda paling tepat untuk menyelesaikan persoalan mekanik/logika pada gambar.\n- Waktu tes 20 menit",
    timeLimitMinutes: 20,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  // Defaulting to 30 questions
  const totalQuestions = 30;
  console.log(`Inserting ${totalQuestions} questions...`);
  
  for (let i = 1; i <= totalQuestions; i++) {
    // Generate options A, B, C, D
    const options = ["A", "B", "C", "D"].map((optVal) => ({
      id: optVal, 
      text: optVal,
      imageUrl: "" // user can add images later if needed
    }));

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

  console.log(`Done! Inserted all ${totalQuestions} AMR questions.`);
}

seed().catch(console.error);
