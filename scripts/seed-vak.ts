import { db } from "../db";
import { hcOnlineTests, hcOnlineTestQuestions } from "../db/schema/hero";

const vakQuestions = [
  {
    q: "Ketika mengoperasikan peralatan baru, saya cenderung untuk:",
    opts: ["membaca instruksi terlebih dahulu", "mendengarkan penjelasan dari orang lain yang sudah menggunakan", "mengutak-atik sendiri, saya bisa tahu kemudian seiring saya menggunakannya"]
  },
  {
    q: "Ketika saya membutuhkan arahan dalam perjalanan, saya biasanya:",
    opts: ["bertanya kepada orang lain", "melihat peta", "mengikuti kata hati dan mungkin menggunakan kompas"]
  },
  {
    q: "Ketika saya memasak menu makanan baru, saya suka:",
    opts: ["meminta teman untuk menjelaskan bagaimana cara memasak menu tersebut", "mengikuti naluri saya, coba-coba sendiri", "mengikuti resep yang ada"]
  },
  {
    q: "Jika saya mengajari seseorang sesuatu hal yang baru, saya cenderung untuk:",
    opts: ["menuliskan instruksi untuk mereka", "memberikan penjelasan secara lisan", "mendemonstrasikan terlebih dahulu, lalu membiarkan mereka mencoba sendiri"]
  },
  {
    q: "Saya cenderung untuk mengatakan:",
    opts: ["perhatikan bagaimana saya melakukannya", "kamu coba sendiri dahulu", "dengarkan penjelasan saya"]
  },
  {
    q: "Saya sangat menikmati waktu luang saya dengan:",
    opts: ["Berolahraga atau bermain puzzle", "pergi ke bioskop dan menonton film", "mendengarkan musik dan berbincang dengan teman-teman"]
  },
  {
    q: "Ketika saya pergi berbelanja pakaian, saya cenderung untuk:",
    opts: ["membayangkan bagaimana pakaian tersebut akan terlihat ketika saya pakai", "menanyakan pendapat kepada pelayan toko", "mencoba pakaian tersebut dan melihat apakah cocok untuk saya"]
  },
  {
    q: "Ketika saya memilih untuk berlibur, biasanya saya akan:",
    opts: ["membaca banyak brosur", "mendengarkan rekomendasi dari teman", "membayangkan bagaimana rasanya berada di tempat tersebut"]
  },
  {
    q: "Jika saya membeli mobil baru, saya akan:",
    opts: ["mendiskusikan apa yang saya butuhkan dengan teman-teman", "membaca review dari koran dan majalah", "menguji coba berbagai tipe mobil yang berbeda-beda"]
  },
  {
    q: "Ketika saya mempelajari keterampilan baru, saya paling nyaman:",
    opts: ["berbicara langsung dengan ahlinya hal apa saja yang harus saya lakukan", "mencoba dahulu sendiri dan mempelajarinya seiring berjalannya waktu", "melihat apa yang dilakukan oleh ahlinya"]
  },
  {
    q: "Ketika akan memilih makanan dari menu, saya cenderung untuk:",
    opts: ["membayangkan makanan tersebut akan terlihat seperti apa", "mendiskusikan dengan teman saya", "membayangkan bagaimana rasa makanan tersebut"]
  },
  {
    q: "Ketika saya mendengarkan sebuah band, saya suka:",
    opts: ["mendengarkan lirik dan irama musik", "melihat para anggota band dan kerumunan penonton", "terhanyut dalam irama musik"]
  },
  {
    q: "Ketika saya berkonsentrasi, saya paling sering:",
    opts: ["mendiskusikan permasalahan yang ada dan solusi yang memungkinkan di dalam pikiran saya sendiri", "bergerak mondar-mandir ke sekeliling, bermain-main dengan pensil atau pulpen dan menyentuh barang-barang di sekitar saya", "fokus dengan kata-kata atau gambar yang ada di depan saya"]
  },
  {
    q: "Dalam memilih perabotan rumah tangga, saya suka:",
    opts: ["warna dan bentuk perabotan tersebut", "penjelasan yang diberikan bagian penjualan kepada saya", "tekstur dari perabotan dan bagaimana rasanya menyentuh barang tersebut"]
  },
  {
    q: "Saya lebih mudah mengingat bila:",
    opts: ["melihat sesuatu hal", "melakukan sesuatu hal", "berbicara tentang sesuatu hal"]
  },
  {
    q: "Ketika saya merasa cemas, saya:",
    opts: ["tidak bisa duduk diam, berjalan bolak-balik di sekitar terus menerus", "membayangkan skenario terburuk", "berbicara pada diri sendiri di dalam kepala hal apa yang paling membuat saya khawatir"]
  },
  {
    q: "Saya merasa sangat terhubung dengan orang lain karena:",
    opts: ["bagaimana mereka terlihat", "apa yang mereka katakan kepada saya", "bagaimana mereka membuat saya merasa nyaman"]
  },
  {
    q: "Ketika saya harus merevisi ulang sebuah presentasi, saya biasanya:",
    opts: ["menulis banyak catatan dan diagram untuk revisi", "membahas catatan saya, sendiri atau dengan orang lain", "membayangkan bagaimana membuat ide-ide baru"]
  },
  {
    q: "Jika saya menjelaskan sesuatu ke seseorang, saya cenderung untuk:",
    opts: ["menjelaskan kepada mereka dengan berbagai cara sampai mereka mengerti", "memperlihatkan kepada mereka apa maksud saya", "mendorong mereka untuk mencoba dan berbicara mengenai ide-ide saya ketika mereka mencoba"]
  },
  {
    q: "Saya sangat suka:",
    opts: ["mendengarkan musik, radio atau berbicara dengan teman-teman", "mengambil bagian dalam kegiatan olahraga, mencoba restoran baru dan berdansa", "menonton film, fotografi, melihat seni"]
  },
  {
    q: "Sebagian besar waktu luang saya habiskan dengan:",
    opts: ["menonton film dan youtube", "mengobrol dengan teman-teman", "berolahraga seperti berenang atau bersepeda"]
  },
  {
    q: "Ketika saya harus menghubungi teman baru yang sudah pernah saya temui beberapa kali sebelumnya, saya lebih suka berinteraksi dengan :",
    opts: ["berbicara lewat telepon", "langsung menemuinya", "melakukan aktivitas bersama"]
  },
  {
    q: "Saya pertama kali melihat orang dari:",
    opts: ["cara mereka berbicara", "cara mereka berdiri dan bergerak", "cara mereka berpenampilan"]
  },
  {
    q: "Jika saya marah, saya cenderung untuk:",
    opts: ["terus menerus berpikir hal apa yang membuat saya marah", "menaikan suara saya dan memberitahukan ke orang-orang apa yang saya rasakan", "membanting pintu dan secara fisik menunjukan kemarahan saya"]
  },
  {
    q: "Saya merasa lebih mudah untuk mengingat:",
    opts: ["wajah", "hal-hal yang telah saya lakukan", "nama"]
  },
  {
    q: "Anda bisa merasakan seseorang sedang berbohong jika:",
    opts: ["mereka membuat lelucon", "mereka menghindari untuk melihat Anda", "nada suara mereka berubah"]
  },
  {
    q: "Ketika saya bertemu dengan teman lama:",
    opts: ["saya mengatakan \"Senang bertemu denganmu\"", "saya mengatakan \"Senang mendengar kabarmu\"", "saya memeluk atau berjabat tangan dengan mereka"]
  },
  {
    q: "Saya dapat mengingat secara baik dengan cara:",
    opts: ["menulis catatan atau mencetak secara rinci", "mengatakan dengan keras-keras atau mengulang kata-kata dan poin di dalam kepala", "berlatih atau membayangkan hal tersebut sudah dilakukan"]
  },
  {
    q: "Jika saya harus komplain tentang barang yang rusak, saya paling nyaman untuk:",
    opts: ["komplain lewat telepon", "menulis surat", "membawa barang tersebut kembali ke toko atau mengirimkan ke kantor pusat"]
  },
  {
    q: "Saya cenderung untuk mengatakan:",
    opts: ["saya mendengar apa yang kamu katakan", "saya tahu apa yang kamu rasakan", "saya mengerti apa yang kamu maksud"]
  }
];

async function seed() {
  console.log("Creating VAK Test...");
  const [test] = await db.insert(hcOnlineTests).values({
    title: "VAK Assessment",
    description: "Bagaimana melakukan tes:\n- Pilih hanya 1 (satu) jawaban yang paling mewakili diri Anda dalam berperilaku\n- Tidak ada jawaban benar atau salah",
    timeLimitMinutes: 15,
    passingScore: 0,
    isActive: true,
  }).returning();

  console.log("Created test with ID:", test.id);

  console.log("Inserting 30 questions...");
  for (let i = 0; i < vakQuestions.length; i++) {
    const qData = vakQuestions[i];
    const options = qData.opts.map((text, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C
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

  console.log("Done! Inserted all VAK questions.");
}

seed().catch(console.error);
