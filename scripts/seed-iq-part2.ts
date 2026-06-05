import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";
import { eq } from "drizzle-orm";

const iqQuestionsPart2 = [
  {
    q: "Mana dari ke-5 ini yang paling melengkapi kalimat tersebut?\n\"Jika \"GESPER\" adalah \"Kepala Gesper\", maka \"SEPATU\" adalah:",
    opts: ["Kaos Kaki", "Tumit", "Kaki", "Tali Sepatu", "Sol Sepatu"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "John menerima USD 0.41 sebagai kembalian dari pembeliannya di apotik.\nJika Jhon menerima 6 koin, maka ketiga dari koin-koin tersebut harusnya:",
    opts: ["Satu Sen", "Lima sen", "Sepuluh sen", "Seperempat dollar", "Setengah dollar"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Jika Anda mengatur ulang kata-kata \"RMANJE\", maka anda akan mendapat nama sebuah:",
    opts: ["Lautan", "Negara", "Provinsi", "Kota", "Hewan"]
  },
  {
    q: "Mana dari ke-5 pilihan yang paling tepat untuk melengkapi kalimat berikut:",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "\"Jika semua Wargs adalah Twerps dan tidak ada Twerps yang merupakan Gollums maka tidak ada Gollums yang pasti adalah Wargs.\"\nPernyataan ini adalah:",
    opts: ["Benar", "Salah", "Tidak Keduanya"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Kuda", "Kanguru", "Kuda Zebra", "Rusa", "Keledai"]
  },
  {
    q: "Mana dari gambar ini yang TIDAK sesuai dengan urutan gambar-gambar ini?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 ini yang paling melengkapi kalimat tersebut?\nJika \"Jari\" adalah \"Tangan\" maka \"Daun\" adalah:",
    opts: ["Pohon", "Cabang", "Bunga", "Ranting", "Kulit Kayu"]
  },
  {
    q: "\"Ibunya John mengirimkannya ke toko untuk membeli 9 kotak besar jeruk.\nJohn hanya dapat membawa 2 kotak dalam sekali jalan.\nBerapa kali ia harus bolak-balik ke toko?",
    opts: ["4", "4½", "5", "½", "6"]
  },
  {
    q: "Mana dari gambar ini yang TIDAK sesuai dengan urutan gambar-gambar ini?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 ini yang paling melengkapi kalimat tersebut?\nJika \"Kaki\" adalah \"Lutut\", maka \"Tangan\" adalah:",
    opts: ["Jari", "Sikut", "Tumit", "Kaki", "Lengan"]
  },
  {
    q: "Mana gambar yang paling mengikuti logika dari diagram di bawah ini?",
    opts: ["A", "B", "C", "D"]
  },
  {
    q: "Mary ada di peringkat ke-13 dari yang terbaik dan juga peringkat ke-13 dari yang terburuk dalam lomba mengeja kata. Ada berapa peserta dalam lomba mengeja kata tersebut?",
    opts: ["13", "25", "26", "27", "28"]
  },
  {
    q: "Mana dari ke-5 ini yang paling melengkapi kalimat tersebut?\nJika \"Air \" adalah \"Es Batu\", maka \"Susu\" adalah:",
    opts: ["Madu", "Keju", "Sereal", "Kopi", "Kue"]
  },
  {
    q: "Mana dari angka ini yang TIDAK sesuai dengan urutan angka-angka ini?\n1 - 2 - 5 - 10 - 13 - 26 - 29 - 48",
    opts: ["1", "2", "5", "10", "13", "26", "29", "48"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Sayap", "Iga", "Salmon", "Ayam", "Sapi"]
  },
  {
    q: "\"Jika semua Fleeps adalah Sloops dan semua Sloops adalah Loopies, maka semua Fleeps adalah pasti Loopies.\"\nPernyataan ini adalah:",
    opts: ["Benar", "Salah", "Tidak Keduanya"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Sentimeter", "Kilometer", "Hektar", "Meter", "Kaki"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "\"Seekor ikan mempunyai kepala sepanjang 9mm. Buntutnya sama panjangnya dengan ukuran kepalanya ditambah setengah kali ukuran badannya. Ukuran badannya adalah sama dengan ukuran kepala ditambah ukuran buntutnya.\" Berapa panjang ikan tersebut?",
    opts: ["27mm", "54mm", "63mm", "72mm", "81mm"]
  }
];

async function seedPart2() {
  console.log("Finding Test IQ...");
  const tests = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.title, "Test IQ")).limit(1);
  
  if (tests.length === 0) {
    console.error("Test IQ not found!");
    return;
  }
  
  const testId = tests[0].id;
  console.log("Found Test IQ with ID:", testId);

  // Since we inserted 37 questions previously
  const startOrder = 38;

  console.log(`Inserting ${iqQuestionsPart2.length} more questions starting from number ${startOrder}...`);
  for (let i = 0; i < iqQuestionsPart2.length; i++) {
    const qData = iqQuestionsPart2[i];
    const options = qData.opts.map((text, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C, D, E, etc.
      text: text,
      imageUrl: "" // user can add images later
    }));

    await db.insert(hcOnlineTestQuestions).values({
      testId: testId,
      questionType: "multiple_choice",
      questionText: qData.q,
      options: options,
      correctAnswer: "",
      points: 1,
      sortOrder: startOrder + i,
    });
  }

  console.log("Done! Inserted the remaining IQ questions.");
}

seedPart2().catch(console.error);
