import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";
import { eq } from "drizzle-orm";

const amrData = [
  {
    q: "Yang manakah diantara balok-balok dibawah ini yang paling sulit untuk digulingkan?",
    opts: ["A", "B", "C", "D", "Semua Sama"]
  },
  {
    q: "Bila roda berputar kearah →, titik manakah yang akan menyentuh diri terlebih dahulu?",
    opts: ["F", "G", "H", "J"]
  },
  {
    q: "Bila roda X berputar dan menggerakkan roda yang lainnya, maka roda Z akan bergerak...",
    opts: ["Lebih cepat daripada X", "Lebih lambat daripada X", "Memiliki kecepatan yang sama dengan X", "Tidak bergerak", "Tidak dapat disimpulkan"]
  },
  {
    q: "Roda mana yang berputar dengan arah yang sama dengan roda A?",
    opts: ["S", "T", "Tidak ada", "Keduanya", "Tidak dapat disimpulkan"]
  },
  {
    q: "Kedua sisinya diputar dengan kecepatan yang sama menurut arah yang ditunjukkan oleh tanda panah, maka batang itu akan bergerak ke arah...",
    opts: ["A", "B", "C", "D", "T"]
  },
  {
    q: "Bila roda berputar sesuai dengan tanda panah, maka R akan...",
    opts: ["Bergerak kekiri lalu berhenti", "Bergerak ke kanan lalu berhenti", "Bergerak bolak balik", "Tidak bergerak", "Bergerak ke arah → lalu terus menerus"]
  },
  {
    q: "Berikut ini adalah pasak-pasak tenda yang dihancurkan ke dalam tanah yang lunak, yang manakah diantara pasak-pasak tersebut yang paling kuat pada saat tali ditarik?",
    opts: ["I", "M", "N", "P", "R"]
  },
  {
    q: "Manakah pernyataan yang benar?",
    opts: ["A, B, C dan D semua bergerak ke arah yang sama", "A, C dan G bergerak kearah yang sama", "A dan C bergerak kearah yang sama", "B dan D bergerak kearah yang sama", "A dan D bergerak kearah yang sama"]
  },
  {
    q: "Bila tuas kecil X digeser/digerakkan kearah sesuai tanda panah, maka W akan bergerak...",
    opts: ["Kekiri dan kebawah", "Ke kanan dan kebawah", "Tidak bergerak", "Bolak balik", "Ke kanan dan ke atas"]
  },
  {
    q: "Bila A bergerak kearah → maka...",
    opts: ["B akan bergerak kearah → dan C bearah →", "B dan C keduanya akan bergerak kearah →", "B dan C keduanya akan bergerak bolak balik", "B akan bergerak kearah ←", "B dan C keduanya akan bergerak kearah ←"]
  },
  {
    q: "Roda F dalam keadaan diam. Jangan berkehendak I membentuk meja–meja gigi bergerak memutar seperti yang ditunjukkan oleh tanda panah. Maka G berputar kearah...",
    opts: ["→ dan lebih cepat dari F", "→ dan lebih lambat dari H", "→ dan lebih lambat dari F", "→ dan lebih cepat dari G", "→ dan lebih lambat dari F"]
  },
  {
    q: "Y dan Z adalah roda. Untuk membuat Z berputar empat putaran penuh, maka Y harus diputar...",
    opts: ["1 kali", "4 kali", "8 kali", "16 kali", "18 kali"]
  },
  {
    q: "Tuas B ditayang kebawah, ke arah manakah S dan T akan bergerak?",
    opts: ["S turun, T turun", "S turun, T naik", "S naik, T Tetap", "S naik, T turun", "S naik, T naik"]
  },
  {
    q: "Untuk menarik penshu ke atas dari jalan tuo yang terlihat pada gambar, pada titik mana yang terbaik untuk mengikatkan tali pada topor?",
    opts: ["F", "G", "H", "J", "K"]
  },
  {
    q: "Roda W pada setiap putaran menggerakkan sebuah tungkul naik dan kebawah, manakah roda yang bergerak hanya ke 1 (satu) arah?",
    opts: ["I", "M", "O", "P", "SEMUA"]
  },
  {
    q: "Untuk menurunkan lampu sejauh 12 cm maka pembawanya harus...",
    opts: ["Dinaikkan 12 cm", "Diturunkan 12 cm", "Dinaikkan 18 cm", "Diturunkan 18 cm", "Dinaikkan 6 cm"]
  },
  {
    q: "Setiap roda bergigi memungkinkan rodanya untuk bergerak hanya kearah...",
    opts: ["A", "B", "C", "D", "Semua"]
  },
  {
    q: "Tangki air mana yang dapat dialirkan lebih cepat melalui pipanya?",
    opts: ["F", "GC", "H", "J", "Semua pada arah yang sama"]
  },
  {
    q: "Pada diagram yang mana ikan X akan berlaku sebagai penahan yang paling kuat pada roda ketika tuas W ditarik kearah yang ditunjuk oleh panah?",
    opts: ["I", "M", "O", "P", "Semua sama"]
  },
  {
    q: "Tuas X ditarik kearah, maka balkon Y akan...",
    opts: ["Tetap", "Bergerak kearah → dan naik", "Bergerak kearah → dan turun", "Bergerak kearah ← dan naik", "Bergerak kearah ← dan turun"]
  },
  {
    q: "Garis tengah roda W dan X masing-masing 12 cm dan garis tengah roda A dan B masing-masing 6 cm. Kalau W berputar 1 kali, roda B akan berputar...",
    opts: ["1 kali", "2 kali", "3 kali", "4 kali", "6 kali"]
  },
  {
    q: "Tuas berputar pada kecepatan yang tetap dan menggulung bali pada penggulungnya. Penggulung B akan berputar...",
    opts: ["Dengan kecepatan yang sama dengan penggulung A", "Lebih lambat dari penggulung A", "Pada kecepatan yang meningkat", "Pada kecepatan yang menurun"]
  },
  {
    q: "Roda yang dipasangi sebuah jarum diputar, pada posisi mana jarum akan berada bila penunjuk dibawah bergerak dengan kecepatan tertinggi?",
    opts: ["I", "M", "O", "P", "Semua Sama"]
  },
  {
    q: "Motor menggerakkan roda–roda. Roda yang berputar paling lambat adalah...",
    opts: ["S", "T", "U", "W", "Semua sama"]
  }
];

async function seed() {
  console.log("Cleaning up old AMR tests...");
  // Find old AMR tests
  const oldTests = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.title, "AMR"));
  
  for (const t of oldTests) {
    await db.delete(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.testId, t.id));
    await db.delete(hcOnlineTests).where(eq(hcOnlineTests.id, t.id));
    console.log("Deleted old test ID:", t.id);
  }

  console.log("Creating Test AMR...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "AMR",
    description: "Bagaimana melakukan tes:\n- Pilih satu jawaban yang menurut Anda paling tepat untuk menyelesaikan persoalan mekanik/logika pada gambar.\n- Waktu tes 25 menit",
    timeLimitMinutes: 25,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  console.log(`Inserting ${amrData.length} questions...`);
  
  for (let i = 0; i < amrData.length; i++) {
    const qData = amrData[i];
    
    // Generate options A, B, C, D...
    const options = qData.opts.map((optText, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C...
      text: optText,
      imageUrl: "" // user can add images later
    }));

    await db.insert(hcOnlineTestQuestions).values({
      testId: test.id,
      questionType: "multiple_choice",
      questionText: qData.q,
      options: options,
      correctAnswer: "",
      points: 1,
      sortOrder: i + 1,
    });
  }

  console.log(`Done! Inserted all ${amrData.length} AMR questions.`);
}

seed().catch(console.error);
