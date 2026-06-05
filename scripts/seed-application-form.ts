import { db } from "../db";
import { hcOnlineTests } from "../db/schema/hero";

async function seed() {
  console.log("Creating Application Form test instance...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "Application Form",
    description: "Mohon isi formulir aplikasi ini dengan lengkap dan benar sesuai dengan data diri Anda. Data yang Anda masukkan akan digunakan untuk keperluan rekrutmen perusahaan.",
    timeLimitMinutes: 120, // 2 hours
    passingScore: 0,
    isActive: true,
    isApplicationForm: true,
  }).returning();

  console.log("Created Application Form with ID:", test.id);
  console.log("Done! Application Form test instance created.");
}

seed().catch(console.error);
