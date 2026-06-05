import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";

const iqQuestions = [
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Beruang", "Ular", "Sapi", "Anjing", "Harimau"]
  },
  {
    q: "Jika Anda mengatur ulang kata-kata \"LINKECI\", maka Anda akan mendapat nama sebuah:",
    opts: ["Lautan", "Negara", "Provinsi", "Kota", "Hewan"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Kentang", "Jagung", "Apel", "Wortel", "Kacang"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Saat ini John berumur 12 tahun, yaitu 3 kali lebih tua dari adiknya. Berapa umur John saat umurnya 2 kali lebih tua dari umur adiknya?",
    opts: ["15", "16", "18", "20", "21"]
  },
  {
    q: "Mana dari ke-5 kata ini yang paling melengkapi kalimat tersebut?\nJika \"Kakak Laki-Laki\" itu \"Kakak Perempuan\", maka \" Keponakan Perempuan\" adalah:",
    opts: ["Ibu", "Anak Perempuan", "Bibi", "Paman", "Keponakan Laki-laki"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["A", "Z", "F", "N", "E"]
  },
  {
    q: "Mana dari ke-5 kata ini yang paling melengkapi kalimat tersebut.\nJika \"Susu\" itu \"Gelas\", maka \"Surat\" itu:",
    opts: ["Stempel", "Ballpoin", "Amplop", "Buku", "Kiriman"]
  },
  {
    q: "Mana dari ke-5 yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 kata ini yang paling melengkapi kalimat tersebut?\nJika \"HIDUP\" itu \"PUDIH\" maka 5232 adalah:",
    opts: ["2523", "3252", "2325", "3225", "5223"]
  },
  {
    q: "\"Jika beberapa Smaugs adalah Thors dan beberapa Thors adalah Thrains, maka beberapa Smaugs pasti adalah Thrains.\"\nPernyataan ini adalah:",
    opts: ["Benar", "Salah", "Tidak keduanya"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 kata yang paling melengkapi kalimat tersebut?\nJika \"Pohon\" itu \"Tanah\" maka \"Cerobong Asap\" itu:",
    opts: ["Asap", "Batu bata", "Langit", "Garasi", "Rumah"]
  },
  {
    q: "Mana dari angka-angka ini yang TIDAK masuk ke dalam urutan di bawah ini?\n9 - 7 - 8 - 6 - 7 - 5 - 6 - 3",
    opts: ["9", "7", "8", "6", "7", "5", "6", "3"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Sentuh", "Rasa", "Dengar", "Senyum", "Lihat"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Jack lebih tinggi dari Peter, dan Bill lebih pendek dari Jack.\nMana kalimat yang paling akurat?",
    opts: ["Bill lebih tinggi dari Peter", "Bill lebih pendek dari Peter", "Bill sama tingginya dengan Peter", "Mustahil untuk mengetahui apakah Bill atau Peter yang lebih tinggi"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Kaus kaki", "Baju", "Sepatu", "Dompet", "Topi"]
  },
  {
    q: "Mana dari ke-5 ini yang paling melengkapi kalimat tersebut?\nJika \"CAACCAC\" adalah \"3113313\" maka \"CACAACAC\" adalah:",
    opts: ["13133131", "13133313", "31311131", "31311313", "31313113"]
  },
  {
    q: "Jika Anda mengatur ulang kata \"RAPIS\", maka Anda akan mendapat nama sebuah:",
    opts: ["Lautan", "Negara", "Provinsi", "Kota", "Hewan"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 kata ini yang paling melengkapi kalimat tersebut?\nJika \"Peluru\" adalah \"Senjata\" maka \"Bola Api\" adalah:",
    opts: ["Pentungan", "Ketapel", "Meriam", "Pelempar", "Jepretan"]
  },
  {
    q: "\"Jika beberapa Bifurs adalah Bofurs dan semua Gloins adalah Bofurs, maka beberapa Bifurs pasti adalah Gloins.\"\nPernyataan ini adalah:",
    opts: ["Benar", "Salah", "Tidak keduanya"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["A1", "E6", "D4", "B2", "C3"]
  },
  {
    q: "Mana dari angka-angka ini yang TIDAK masuk ke dalam urutan di bawah ini?\nA - D - G - I - J - M - P - S\nPilih jawaban Anda:",
    opts: ["D", "I", "J", "M", "S"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Harga dari sebuah baju di-discount 20% untuk sebuah acara tahunan. Berapa % baju tersebut harus di-naik-kan dari harga discount tersebut, sehingga harga baju tersebut menjadi sama dengan awalnya?",
    opts: ["15%", "20%", "25%", "30%", "40%"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Tembaga", "Besi", "Kuningan", "Emas", "Timah"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Botol", "Cangkir", "Bak", "Terowongan", "Mangkuk"]
  },
  {
    q: "Mari memiliki beberapa kue. Setelah makan 1 kue, Mary memberikan ½ dari sisanya untuk adiknya.\nSetelah makan 1 kue lagi, Mary memberikan ½ dari sisanya untuk adiknya.\nMary sekarang hanya memiliki 5 kue. Berapakah jumlah awal kue yang dimiliki Mary?",
    opts: ["11", "22", "23", "45", "46"]
  },
  {
    q: "Mana dari ke-5 ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["Terigu", "Jerami", "Gandum", "Bubur", "Beras"]
  },
  {
    q: "Mana dari angka-angka ini yang TIDAK masuk ke dalam urutan di bawah ini?\n2 - 3 - 6 - 7 - 8 - 14 - 15 - 30",
    opts: ["Tiga", "Tujuh", "Delapan", "Lima belas", "Tiga puluh"]
  },
  {
    q: "Mana dari ke -5 gambar ini yang paling melengkapi kalimat gambar tersebut?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  },
  {
    q: "\"Sebuah pesawat ruang angkasa menerima 3 pesan dalam bahasa yang aneh dari sebuah planet di kejauhan. Para astronot mempelajari pesan-pesan tersebut dan menemukan bahwa :\n\"Elros Aldarion Elendil\" berarti \"Bahaya Ledakan Roket\" dan \"Edain Mnyatur Elros\" berarti \"Bahaya Kebakaran Pesawat Ruang Angkasa\" dan \"Aldarion Gimilizor Gondor\" berarti \"Ledakan Gas Yang Buruk\". Apakah arti dari \"Elendil\"?",
    opts: ["Bahaya", "Ledakan", "Bukan apa-apa", "Roket", "Gas"]
  },
  {
    q: "Mana dari ke-5 gambar ini yang paling TIDAK mirip dengan 4 yang lain?",
    opts: ["(a)", "(b)", "(c)", "(d)", "(e)"]
  }
];

async function seed() {
  console.log("Creating Test IQ...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "Test IQ",
    description: "Bagaimana melakukan tes:\n- Pilih 1 (satu) jawaban yang menurut Anda paling benar\n- Waktu tes 30 menit",
    timeLimitMinutes: 30,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  console.log(`Inserting ${iqQuestions.length} questions...`);
  for (let i = 0; i < iqQuestions.length; i++) {
    const qData = iqQuestions[i];
    const options = qData.opts.map((text, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C, D, E
      text: text,
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

  console.log("Done! Inserted all IQ questions.");
}

seed().catch(console.error);
