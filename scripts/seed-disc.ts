import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";

const discQuestions = [
  { opts: ["Lembut, ramah", "Membujuk, meyakinkan", "Sederhana, mudah menerima, rendah hati", "Asli, berdaya cipta, individualis"] },
  { opts: ["Menarik, mempesona, menarik bagi orang lain", "Dapat bekerja sama, mudah menyetujui", "Keras kepala, tidak mudah menyerah", "Manis, memuaskan/menyenangkan"] },
  { opts: ["Mau dipimpin, cenderung mengikuti/pengikut", "Tangguh, berani", "Loyal, setia, mengabdi", "Mempesona, menyenangkan"] },
  { opts: ["Bepandangan terbuka, mau menerima", "Berani, suka menolong", "Pemelihara, berkemauan keras", "Periang, selalu bergembira"] },
  { opts: ["Periang, suka bergurau", "Teliti, tepat", "Kasar, berani, kurang sopan, tidak mudah malu", "Tenang, emosi yang terkendali, tidak mudah heboh"] },
  { opts: ["Kompetitif, selalu ingin berhasil", "Timbang rasa, peduli, bijaksana", "Terbuka, ramah, suka bersenang-senang", "Harmonis, mudah menyetujui"] },
  { opts: ["Rewel, cerewet, sulit untuk dipuaskan hatinya", "Taat, melakukan apa yang diperintahkan, patuh", "Tidak mudah mundur, fokus akan satu hal, ulet", "Suka melucu, lincah, periang"] },
  { opts: ["Berani, tidak gentar, tangguh", "Membangkitkan semangat, memotivasi", "Patuh, berhasil, menyerah", "Takut-takut, malu, pendiam"] },
  { opts: ["Suka bergaul dan bersosialisasi", "Sabar, penuh keyakinan, bersikap toleransi", "Percaya diri, mandiri", "Berwatak halus/lembut, pendiam, suka menyendiri"] },
  { opts: ["Menyukai hal-hal baru, suka tantangan", "Terbuka dan mau menerima ide-ide baru dan saran", "Ramah, hangat, bersahabat", "Moderat, menghindari hal-hal yang ekstrim atau aneh"] },
  { opts: ["Banyak bicara, cerewet", "Terkendali, mandiri", "Melakukan hal-hal yang sudah biasa, tidak berlebihan", "Tegas, cepat dalam membuat keputusan"] },
  { opts: ["Berbudi bahasa halus, tingkah laku yang halus", "Berani, suka mengambil resiko", "Diplomatik, bijaksana", "Mudah puas atau senang"] },
  { opts: ["Agresif, suka tantangan, penuh inisiatif", "Menyukai hiburan, ramah, suka pesta/acara kumpul", "Pengikut, mudah diguna-dayakan oleh orang lain", "Gelisah, khawatir"] },
  { opts: ["Berhati-hati", "Fokus pada satu hal tertentu, tidak mudah goyah", "Meyakinkan", "Baik hati, menyenangkan"] },
  { opts: ["Rela berkorban, mengikuti arus", "Antusias, selalu ingin tahu", "Mudah menyetujui", "Lincah, antusias"] },
  { opts: ["Percaya diri, yakin pada diri sendiri", "Simpatik, orang yang pengertian", "Toleran", "Tegas, agresif"] },
  { opts: ["Disiplin, terkendali", "Dermawan, suka berbagi", "Suka berekspresi", "Gigih, tidak mudah menyerah"] },
  { opts: ["Terpuji, dapat dikagumi, patut dipuji", "Ramah, senang menolong", "Mudah menyerah/menerima pendapat yang lain", "Memiliki karakter kuat, tangguh"] },
  { opts: ["Menunjukkan rasa hormat", "Pelopor, perintis, giat, mau berusaha", "Optimis, pandangan positif", "Selalu siap membantu"] },
  { opts: ["Dapat berargumentasi", "Fleksibel, mudah beradaptasi", "Naif, acuh tak acuh, tidak perhatian", "Riang, tiada yang dipikirkan sama sekali"] },
  { opts: ["Dapat dipercaya, percaya kepada orang lain", "Mudah puas, selalu merasa cukup", "Selalu positif, tidak diragukan", "Tenang, pendiam"] },
  { opts: ["Mudah bergaul, suka berteman", "Berbudaya, memiliki banyak pengetahuan", "Bersemangat, giat", "Toleransi, tidak tegas"] },
  { opts: ["Menyenangkan, ramah", "Teliti, akurat", "Terus terang, bicara bebas", "Terkendali, emosi terkendali"] },
  { opts: ["Resah, tidak bisa santai", "Baik hati, ramah", "Populer, disukai banyak orang", "Rapi, teratur"] }
];

async function seed() {
  console.log("Creating Test DISC...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "DISC Assessment",
    description: "Cara mengisi:\n- Pilih 1 (satu) huruf yang Paling Mirip kepribadian Anda dan letakkan jawabannya di kotak 'Mirip'\n- Pilih 1 (satu) huruf yang Paling Tidak Mirip kepribadian Anda dan letakkan jawabannya di kotak 'Tidak Mirip'\nJadi, di setiap kotak hanya akan ada 1 Paling Mirip dan 1 Paling Tidak Mirip",
    timeLimitMinutes: 15,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  console.log(`Inserting ${discQuestions.length} questions...`);
  for (let i = 0; i < discQuestions.length; i++) {
    const qData = discQuestions[i];
    const options = qData.opts.map((text, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C, D
      text: text,
      imageUrl: "" 
    }));

    await db.insert(hcOnlineTestQuestions).values({
      testId: test.id,
      questionType: "disc",
      questionText: `Silakan pilih 1 yang paling MIRIP dan 1 yang paling TIDAK MIRIP dengan Anda pada kelompok pernyataan nomor ${i + 1}`,
      options: options,
      correctAnswer: "",
      points: 1,
      sortOrder: i + 1,
    });
  }

  console.log("Done! Inserted all DISC questions.");
}

seed().catch(console.error);
