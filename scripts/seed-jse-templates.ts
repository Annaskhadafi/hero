import { db } from '../db'
import {
  checklistTemplates,
  checklistTemplateRevisions,
  checklistTemplateRevisionItems,
} from '../db/schema/hero'
import { eq, and, sql } from 'drizzle-orm'

type TemplateDef = {
  title: string
  description: string
  items: Array<{
    orderIndex: number
    prompt: string
    inputType: 'yes_no_na' | 'scale_1_5' | 'free_text'
    isRequired: boolean
  }>
}

const JSE_TEMPLATES: TemplateDef[] = [
  // ──────────────────────────────────────────────
  // 1. HARIAN KESELAMATAN WORKSHOP TIRE REPAIR
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Harian Keselamatan Area Workshop Tire Repair',
    description:
      'Pemeriksaan harian wajib sebelum operasional untuk memastikan area repair ban dalam kondisi aman dan siap pakai.',
    items: [
      { orderIndex: 0, prompt: 'Lantai area kerja bersih dari ceceran oli, gemuk, dan serpihan karet', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Penerangan ruangan memadai (minimal 200 lux) di seluruh area workshop', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Ventilasi dan exhaust fan berfungsi normal, udara tidak pengap', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Rambu K3 terpasang jelas: jalur evakuasi, titik kumpul, larangan merokok', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Semua mesin pengepres ban (hydraulic press) dalam kondisi tidak bocor oli', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Guard/Safety cover mesin pengepres terpasang dan kokoh', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Emergency stop pada mesin press dan alat mekanis berfungsi saat dites', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Alat pemecah bead (bead breaker) dalam kondisi baik, tidak retak atau aus', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Kompresor angin tekanan normal, selang tidak bocor, safety valve OK', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Jack stand dan dongkrak hidrolik tidak bocor dan mampu menahan beban kerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Area penyimpanan ban bekas dan ban baru tertata rapi, tidak menghalangi jalur', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Kotak P3K tersedia lengkap (perban, plester, antiseptik, gunting, sarung tangan)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'APAR tersedia di lokasi strategis, pin pengaman terpasang, tekanan normal', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Eye wash station / botol pencuci mata tersedia dan berfungsi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Tempat sampah limbah B3 (oli bekas, lap terkontaminasi) tersedia dan tertutup', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Semua pekerja menggunakan APD lengkap: helm, sepatu safety, sarung tangan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Kabel listrik dan kabel ekstensi tidak terkelupas atau terjepit', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Area sekitar panel listrik bersih, tidak ada bahan mudah terbakar dalam radius 1 meter', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Jalur evakuasi dan pintu darurat bebas hambatan, tidak terkunci dari dalam', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 19, prompt: 'Catatan: Temuan ketidaksesuaian dicatat dan dilaporkan ke Supervisor langsung', inputType: 'free_text', isRequired: false },
      { orderIndex: 20, prompt: 'Tindakan perbaikan yang diperlukan dan batas waktu', inputType: 'free_text', isRequired: false },
      { orderIndex: 21, prompt: 'Nama & Tanda tangan petugas pemeriksa', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 2. MINGGUAN KELAYAKAN PERALATAN TIRE SERVICE
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Mingguan Kelayakan Peralatan di Area Tire Service',
    description:
      'Inspeksi mingguan menyeluruh terhadap semua peralatan servis ban untuk mencegah kegagalan alat dan kecelakaan kerja.',
    items: [
      { orderIndex: 0, prompt: 'Mesin tire changer beroperasi normal, tidak ada suara abnormal atau getaran berlebih', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Roda pemasangan (mounting head) tire changer tidak aus dan terkalibrasi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Mesin wheel balancer terkalibrasi, hasil balancing akurat (deviasi ≤5 gram)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Selang udara tire changer dan wheel balancer tidak retak atau bocor', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Pressure gauge pada kompresor dan alat ukur tekanan ban akurat (±1 psi)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Impact wrench (air/electric) berfungsi normal, tidak overheat saat digunakan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Socket impact wrench lengkap semua ukuran, tidak aus atau retak', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Alat pengisian nitrogen ban berfungsi normal, konsentrasi N2 ≥95%', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Peralatan spooring/alignment berfungsi normal, sensor tidak error', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Lift kendaraan (hydraulic lift) naik/turun lancar, lock safety berfungsi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Baut angkur dan baut pengikat mesin-mesin utama tidak kendor', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Semua alat memiliki label inspeksi terakhir dan kalibrasi yang masih berlaku', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Toolbox pekerja lengkap dan tertata, tidak ada alat hilang atau rusak', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Grease gun dan pelumas rantai/sprocket tersedia dan berfungsi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Semua peralatan listrik portabel sudah melalui uji PAT (Portable Appliance Testing)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Area servis ban bersih dari oli, air, dan kotoran yang menyebabkan slip', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Cone dan pembatas area servis terpasang untuk melindungi pejalan kaki', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Kondisi selang hidrolik pada semua peralatan tidak retak atau menggelembung', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Rating kelayakan peralatan secara keseluruhan (1 = buruk, 5 = prima)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 19, prompt: 'Catatan temuan dan rekomendasi perbaikan', inputType: 'free_text', isRequired: false },
      { orderIndex: 20, prompt: 'Nama & Tanda tangan teknisi pemeriksa', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 3. BULANAN KETERSEDIAAN & KELAYAKAN APD
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Bulanan Ketersediaan dan Kelayakan APD Seluruh Area Kerja',
    description:
      'Audit bulanan kelayakan Alat Pelindung Diri (APD) untuk seluruh pekerja di semua area operasional bengkel dan kantor.',
    items: [
      { orderIndex: 0, prompt: 'Safety helmet tersedia untuk setiap pekerja, tidak retak, tidak kadaluarsa (maks 3 tahun)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Safety shoes/boots tersedia sesuai jumlah pekerja, sol tidak aus, steel toe cap utuh', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Sarung tangan (gloves) sesuai jenis pekerjaan: mekanik, kimia, panas, tersedia lengkap', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Kacamata safety (safety goggles) tersedia untuk pekerja di area gerinda dan press', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Face shield tersedia untuk pekerjaan berisiko percikan dan tersimpan bersih', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Ear plug / ear muff untuk area bising (kompresor, impact wrench) tersedia', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Masker debu / respirator N95 tersedia untuk pekerjaan yang menimbulkan partikel', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Apron / wear pack tahan minyak dan bahan kimia tersedia dan tidak robek', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Rompi safety (safety vest) reflektif tersedia untuk pekerja di area lalu lintas kendaraan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Stok APD cadangan tersedia minimal 10% dari jumlah pekerja untuk penggantian darurat', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Semua APD memiliki label SNI atau standar keselamatan yang diakui', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Tempat penyimpanan APD bersih, kering, dan tidak terkena sinar matahari langsung', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Dokumentasi pemakaian APD tercatat di log harian setiap pekerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Prosedur sanksi bagi pekerja yang tidak memakai APD lengkap diberlakukan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Pelatihan penggunaan APD terbaru sudah diberikan dalam 6 bulan terakhir', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Kondisi umum kelayakan APD secara keseluruhan (1 = buruk, 5 = prima)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 16, prompt: 'Daftar APD yang perlu diganti dan jumlah yang dibutuhkan', inputType: 'free_text', isRequired: false },
      { orderIndex: 17, prompt: 'Nama & Tanda tangan pemeriksa (HSE Officer)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 4. RUTIN FUNGSI & KETERSEDIAAN APAR
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Rutin Fungsi dan Ketersediaan APAR di Semua Zona Bengkel dan Kantor',
    description:
      'Inspeksi bulanan seluruh Alat Pemadam Api Ringan (APAR) untuk memastikan kesiapan tanggap darurat kebakaran.',
    items: [
      { orderIndex: 0, prompt: 'Jumlah APAR sesuai peta lokasi dan mencukupi untuk luas area (1 APAR per 150m²)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'APAR tipe CO2 tersedia di area panel listrik dan ruang server', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'APAR tipe Dry Chemical Powder (ABC) tersedia di area workshop dan servis', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Tekanan indikator APAR menunjukkan zona hijau (tidak di zona merah)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Pin pengaman (safety pin) terpasang dan segel masih utuh pada semua APAR', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Selang dan nozzle tidak tersumbat, tidak retak, dan terpasang dengan baik', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Tabung APAR bebas karat, penyok, atau kerusakan fisik lainnya', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'APAR belum kadaluarsa (periksa tanggal isi ulang, maks 2 tahun sejak pengisian)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Label instruksi penggunaan masih terbaca jelas, tidak pudar atau rusak', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Bracket/gantungan APAR terpasang kokoh di dinding dengan ketinggian 120 cm dari lantai', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Tanda/rambu APAR terpasang jelas dan terlihat dari jarak minimal 20 meter', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Tidak ada benda yang menghalangi akses ke APAR (radius 1 meter bebas hambatan)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Kartu inspeksi bulanan terpasang dan tercatat dengan benar pada setiap APAR', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'APAR cadangan tersedia minimal 1 unit per zona sebagai antisipasi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Semua petugas mengetahui lokasi APAR dan cara penggunaannya (tes random 3 orang)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Jadwal maintenance dan refill APAR berikutnya masih berlaku', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Rating kesiapan APAR secara keseluruhan (1 = tidak siap, 5 = sangat siap)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 17, prompt: 'Daftar APAR yang perlu isi ulang / ganti dan batas waktunya', inputType: 'free_text', isRequired: false },
      { orderIndex: 18, prompt: 'Nama & Tanda tangan pemeriksa (Fire Safety Officer)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 5. KELAYAKAN FIRE HYDRANT
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Kelayakan Sistem Fire Hydrant dan Jaringan Pemadam Api Lainnya',
    description:
      'Inspeksi triwulan terhadap sistem fire hydrant, selang pemadam, pompa, dan reservoir air untuk kesiapan maksimal.',
    items: [
      { orderIndex: 0, prompt: 'Semua katup hydrant (indoor & outdoor) berfungsi dan dapat dibuka dengan kunci hydrant', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Selang hydrant (fire hose) tidak bocor, tidak retak, dan tersimpan rapi di box hydrant', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Nozzle hydrant terpasang dan dapat dioperasikan dengan baik (pola semprot jet & spray)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Box hydrant tidak rusak, kaca tidak pecah, dan pintu dapat dibuka dengan mudah', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Pompa hydrant (jockey pump, main pump, diesel pump) berfungsi dan auto-start OK', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Tekanan air dalam sistem hydrant antara 4-7 bar saat pompa beroperasi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Reservoir / tangki air pemadam kebakaran terisi penuh sesuai kapasitas', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Panel kontrol pompa hydrant berfungsi, indikator lampu normal, tidak ada alarm error', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Diesel pump memiliki bahan bakar cukup (minimal 3/4 tangki) dan aki terisi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Sistem alarm kebakaran (fire alarm) dan smoke detector berfungsi saat dites', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Sprinkler system tidak tersumbat, tidak korosi, dan coverage area sesuai standar', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Heat detector di area workshop dan area berisiko api berfungsi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Manual call point (MCP) berfungsi dan tidak ada yang rusak', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Pipa hydrant tidak bocor, bebas korosi, dan support bracket masih kokoh', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Emergency exit sign dan lampu darurat menyala saat listrik utama dipadamkan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Prosedur emergency response dan denah evakuasi terpampang di titik strategis', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Simulasi fire drill terakhir dilakukan dalam ≤6 bulan terakhir', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Rating kesiapan sistem hydrant keseluruhan (1 = tidak siap, 5 = sangat siap)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 18, prompt: 'Daftar perbaikan dan spare part yang dibutuhkan', inputType: 'free_text', isRequired: false },
      { orderIndex: 19, prompt: 'Nama & Tanda tangan pemeriksa (Teknisi Fire System)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 6. KESELAMATAN KERJA HARIAN OFFICE
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Keselamatan Kerja Harian Area Ruang Kantor (Office)',
    description:
      'Checklist harian untuk memastikan lingkungan kantor aman, ergonomis, dan bebas potensi bahaya.',
    items: [
      { orderIndex: 0, prompt: 'Lantai kantor bersih, kering, dan tidak licin (tidak ada kabel melintang di jalur jalan)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Meja kerja tertata rapi, tidak ada tumpukan dokumen yang berpotensi jatuh', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Posisi monitor sejajar mata, keyboard dan mouse dalam jangkauan ergonomis', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Kursi kantor berfungsi baik: hydraulic naik-turun, sandaran punggung OK, roda tidak macet', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Semua kabel listrik, data, dan ekstensi terorganisir dengan cable management', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Stop kontak tidak bertumpuk (maks 1 sambungan T per outlet) dan tidak panas', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'AC / pendingin ruangan berfungsi baik, suhu ruangan nyaman (24-26°C)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Penerangan ruangan merata, tidak ada area gelap atau silau berlebih', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Tersedia kotak P3K standar kantor (obat sakit kepala, plester, antiseptik, gunting)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'APAR di area kantor tersedia dan mudah diakses (dapur, ruang server, lobby)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Laci dan filing cabinet tidak terbuka, tidak ada benda berat di area atas lemari', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Jalur evakuasi dan pintu darurat bebas hambatan, pintu dapat dibuka satu arah', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Denah evakuasi dan nomor telepon darurat terpampang di area lobby', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Dapur kantor bersih, kompor/listrik aman, tidak ada kebocoran gas jika pakai LPG', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Tempat sampah tersedia dan dipisahkan (organik, anorganik, B3 ringan)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Area parkir kendaraan tertib, tidak menghalangi akses darurat', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Kondisi keselamatan kantor secara keseluruhan (1 = buruk, 5 = prima)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 17, prompt: 'Catatan perbaikan yang diperlukan', inputType: 'free_text', isRequired: false },
      { orderIndex: 18, prompt: 'Nama & Tanda tangan pemeriksa (Admin/HSE)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 7. PRA-KERJA PERBAIKAN BAN BERAT
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Pra-Kerja Sebelum Melakukan Pekerjaan Perbaikan Ban Berat',
    description:
      'Pemeriksaan wajib sebelum memulai setiap pekerjaan perbaikan ban alat berat (OTR/Heavy Duty) untuk mencegah fatality.',
    items: [
      { orderIndex: 0, prompt: 'Area kerja sudah dipasang barikade dan cone pengaman di sekeliling kendaraan/alat berat', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Kendaraan/alat berat dalam posisi parkir aman, rem tangan aktif, roda diganjal', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Kunci kontak sudah dilepas dan kunci disimpan oleh petugas yang berwenang (lockout)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Jack stand dan/atau support blok berkapasitas cukup (min 1.5x beban kerja) tersedia dan siap pakai', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Dongkrak hidrolik kapasitas sesuai, selang tidak bocor, base plate diletakkan di permukaan rata dan keras', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Petugas sudah memakai APD lengkap: helm, safety shoes, gloves, goggles', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Prosedur JSA (Job Safety Analysis) spesifik untuk pekerjaan ini sudah direview dan ditandatangani', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Toolbox meeting / safety briefing singkat sudah dilakukan sebelum mulai kerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Alat komunikasi (HT/radio/telepon) berfungsi untuk keadaan darurat', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Tidak ada pekerja dalam radius zona bahaya saat proses lifting/jacking', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Tekanan angin ban sudah dikeluarkan sepenuhnya sebelum membuka baut pelek (untuk ban multi-piece rim)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Baut pelek dibuka dengan pola bintang (star pattern) menggunakan torque wrench yang sesuai', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Cage/sangkar pengaman ban (tire inflation cage) tersedia untuk pengisian ulang angin ban besar', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Peralatan rigging/sling (jika diperlukan) dalam kondisi baik dan memiliki sertifikasi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'P3K dan eye wash station dalam jangkauan (≤10 meter dari lokasi kerja)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Kondisi pencahayaan di area kerja minimal 200 lux (lampu kerja tambahan jika perlu)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Kondisi cuaca aman untuk pekerjaan outdoor (tidak hujan lebat, tidak petir)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Prosedur tanggap darurat sudah dipahami oleh seluruh personel yang terlibat', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Tingkat risiko pekerjaan secara keseluruhan (1 = rendah, 5 = tinggi)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 19, prompt: 'Temuan ketidaksesuaian dan tindakan mitigasi', inputType: 'free_text', isRequired: false },
      { orderIndex: 20, prompt: 'Nama & Tanda tangan Supervisor / PIC pekerjaan', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 8. KEAMANAN DAN KEBERSIHAN MINGGUAN BENGKEL
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Keamanan dan Kebersihan Lingkungan Kerja Mingguan Seluruh Area Bengkel',
    description:
      'Housekeeping dan safety walk mingguan menyeluruh terhadap semua area bengkel untuk memastikan lingkungan kerja bersih dan aman.',
    items: [
      { orderIndex: 0, prompt: 'Semua area kerja bersih dari sampah, limbah, dan material sisa produksi (5R diterapkan)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Area penyimpanan oli bekas tertutup rapat, tidak bocor, dan diberi label B3', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Limbah ban bekas disimpan di area khusus, tidak menghalangi akses, dan tercatat jumlahnya', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Majun/lap bekas terkontaminasi oli dibuang di tempat sampah B3 tertutup', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Saluran air/drainase tidak tersumbat, bebas genangan yang bisa jadi sarang nyamuk', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Marking lantai (line marking) jalur pejalan kaki dan jalur forklift masih terlihat jelas', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Pagar pengaman dan railing di area elevated/platform dalam kondisi kokoh', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'CCTV berfungsi dan merekam (verifikasi footage 24 jam terakhir jika ada)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Pencahayaan area luar (parkir, loading dock, jalan akses) berfungsi semua', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Genset dan area penyimpanan BBM aman, tidak ada kebocoran, ventilasi cukup', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Tempat istirahat pekerja bersih, tersedia air minum, dan tempat duduk yang layak', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Toilet dan fasilitas sanitasi bersih, tersedia sabun dan air mengalir', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Tidak ada sarang serangga atau tikus di area kerja dan penyimpanan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Semua material dan peralatan disimpan pada tempatnya (tidak ada yang berserakan di lantai)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Area loading/unloading bersih, tidak ada tumpahan oli atau material licin', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Poster K3 dan safety sign dalam kondisi baik, tidak pudar atau robek', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Sistem pengelolaan limbah sesuai dengan peraturan lingkungan yang berlaku', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Lockout/Tagout (LOTO) kit tersedia lengkap dan personel sudah terlatih', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Rating kebersihan dan keamanan lingkungan keseluruhan (1 = buruk, 5 = prima)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 19, prompt: 'Daftar area yang perlu perbaikan segera dan batas waktunya', inputType: 'free_text', isRequired: false },
      { orderIndex: 20, prompt: 'Nama & Tanda tangan pemeriksa (Housekeeping / HSE Officer)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 9. KELAYAKAN INSTALASI LISTRIK & PERALATAN MEKANIS
  // ──────────────────────────────────────────────
  {
    title: 'JSE Pemeriksaan Kelayakan Instalasi Listrik dan Peralatan Mekanis di Workshop',
    description:
      'Pemeriksaan triwulan menyeluruh pada instalasi listrik dan peralatan mekanis untuk mencegah bahaya listrik dan kerusakan mesin.',
    items: [
      { orderIndex: 0, prompt: 'Panel listrik utama dan sub-panel tertutup rapat, terkunci, hanya personel authorized yang akses', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Tidak ada kabel terbuka, sambungan tidak standar, atau kabel jumper ilegal di panel', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'MCB dan ELCB (Earth Leakage Circuit Breaker) berfungsi (tes tombol TEST pada ELCB)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Semua stop kontak memiliki grounding, hasil tes grounding ≤5 Ohm', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Kabel tray dan conduit tidak rusak, kabel tidak menjuntai atau terjepit', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Tanda bahaya listrik tegangan tinggi terpasang di semua panel dan area berbahaya', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Area sekitar panel listrik bersih radius 1 meter, tidak ada bahan mudah terbakar', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Thermal imaging/infrared scan pada panel tidak menunjukkan hotspot >50°C di atas ambient', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Semua mesin dan peralatan mekanis memiliki emergency stop yang berfungsi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Belt, pulley, chain, dan rotating parts memiliki guard/casing pelindung', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Bearing dan moving parts sudah dilumasi sesuai jadwal, tidak ada suara abnormal', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Sistem hidrolik tidak ada kebocoran, tekanan kerja normal, selang tidak aus', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Kompresor angin sudah menjalani drainase harian dan service periodik (cek logbook)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Motor listrik bersih, ventilasi tidak tersumbat, suhu operasi normal (≤65°C casing)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Penerangan darurat (emergency light) di workshop berfungsi saat listrik utama mati (tes simulasi)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Semua peralatan listrik portabel sudah diuji insulasi (insulation resistance test)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Tidak ada penggunaan colokan bertumpuk (daisy chain) pada peralatan listrik', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Pemeriksaan visual isolasi kabel pada semua mesin dan alat, tidak ada yang terkelupas', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Rating kelayakan instalasi listrik dan mekanis (1 = bahaya, 5 = sangat aman)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 19, prompt: 'Daftar temuan kritis yang harus segera diperbaiki dan batas waktunya', inputType: 'free_text', isRequired: false },
      { orderIndex: 20, prompt: 'Nama & Tanda tangan pemeriksa (Teknisi Elektrikal / Mekanikal)', inputType: 'free_text', isRequired: true },
    ],
  },

  // ──────────────────────────────────────────────
  // 10. EVALUASI TAHUNAN KEPATUHAN K3
  // ──────────────────────────────────────────────
  {
    title: 'JSE Evaluasi Tahunan Kepatuhan Standar Keselamatan Kerja Seluruh Operasional Bengkel Ban',
    description:
      'Audit tahunan komprehensif terhadap seluruh aspek K3 operasional bengkel ban mengacu pada PP No. 50/2012, Permenaker, dan ISO 45001.',
    items: [
      { orderIndex: 0, prompt: 'Dokumen kebijakan K3 tersedia, ditandatangani Top Management, dan dikomunikasikan ke seluruh pekerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 1, prompt: 'Struktur organisasi P2K3 (Panitia Pembina K3) masih aktif dengan notulen rapat bulanan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 2, prompt: 'Program tahunan K3 tersedia dan tercatat realisasinya (target vs capaian)', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 3, prompt: 'Dokumen IBPR (Identifikasi Bahaya dan Penilaian Risiko) terbaru tersedia untuk setiap area kerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 4, prompt: 'Prosedur JSA untuk semua pekerjaan kritis terdokumentasi, direview, dan disetujui', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 5, prompt: 'Statistik kecelakaan kerja tahun berjalan: zero fatality, LTIFR ≤ target, ada tren penurunan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 6, prompt: 'Laporan investigasi kecelakaan (incident report) ditindaklanjuti dengan corrective action yang closed', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 7, prompt: 'Program pelatihan K3 tahunan (initial dan refresh) tercapai minimal 90% dari rencana', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 8, prompt: 'Sertifikasi operator (forklift, crane, kompresor, panel listrik) masih berlaku untuk semua personel', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 9, prompt: 'Pemeriksaan kesehatan (medical check-up) tahunan sudah dilakukan untuk semua pekerja', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 10, prompt: 'Hasil pengukuran lingkungan kerja (kebisingan, pencahayaan, debu, getaran) di bawah NAB', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 11, prompt: 'Semua APAR, hydrant, fire alarm, dan sprinkler sudah diinspeksi dan diservis sesuai jadwal', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 12, prompt: 'Sistem pengelolaan limbah B3 (oli bekas, ban bekas, majun) mematuhi peraturan lingkungan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 13, prompt: 'Emergency response plan diuji melalui minimal 2x simulasi/tahun, termasuk fire drill', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 14, prompt: 'Izin operasional dan perizinan lingkungan (UKL-UPL / AMDAL) masih berlaku', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 15, prompt: 'Kontraktor dan vendor yang bekerja di area bengkel sudah melalui safety induction', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 16, prompt: 'Program 5R (Ringkas, Rapi, Resik, Rawat, Rajin) berjalan konsisten di semua area', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 17, prompt: 'Safety reward dan punishment system diterapkan dan terdokumentasi', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 18, prompt: 'Program STOP (Safety Training Observation Program) atau behavioral safety berjalan rutin', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 19, prompt: 'Sistem permit to work (izin kerja khusus) untuk pekerjaan berisiko tinggi diterapkan', inputType: 'yes_no_na', isRequired: true },
      { orderIndex: 20, prompt: 'Rating kepatuhan K3 secara keseluruhan (1 = sangat kurang, 5 = excellence)', inputType: 'scale_1_5', isRequired: true },
      { orderIndex: 21, prompt: 'Temuan ketidakpatuhan mayor dan minor yang harus ditindaklanjuti', inputType: 'free_text', isRequired: false },
      { orderIndex: 22, prompt: 'Rekomendasi perbaikan dan rencana aksi untuk tahun berikutnya', inputType: 'free_text', isRequired: false },
      { orderIndex: 23, prompt: 'Nama & Tanda tangan Lead Auditor K3', inputType: 'free_text', isRequired: true },
    ],
  },
]

async function main() {
  await db.execute(sql`
    ALTER TABLE IF EXISTS hero_checklist_template_revisions
    ADD COLUMN IF NOT EXISTS created_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL
  `)

  console.log(`Seeding ${JSE_TEMPLATES.length} JSE checklist templates...\n`)

  for (const template of JSE_TEMPLATES) {
    const [existing] = await db
      .select({ id: checklistTemplates.id })
      .from(checklistTemplates)
      .where(and(eq(checklistTemplates.title, template.title), eq(checklistTemplates.isActive, true)))
      .limit(1)

    if (existing) {
      console.log(`  ⏭  SKIP: "${template.title}" (sudah ada)`)
      continue
    }

    await db.transaction(async (tx) => {
      const [tpl] = await tx
        .insert(checklistTemplates)
        .values({
          title: template.title,
          description: template.description,
          isActive: true,
        })
        .returning()

      const [rev] = await tx
        .insert(checklistTemplateRevisions)
        .values({
          templateId: tpl.id,
          revisionNumber: 1,
          title: template.title,
          description: template.description,
        })
        .returning()

      await tx.insert(checklistTemplateRevisionItems).values(
        template.items.map((item) => ({
          revisionId: rev.id,
          orderIndex: item.orderIndex,
          prompt: item.prompt,
          inputType: item.inputType,
          options: null,
          isRequired: item.isRequired,
        })),
      )
    })

    console.log(`  ✓ CREATED: "${template.title}" (${template.items.length} items)`)
  }

  console.log(`\n✅ Semua template JSE berhasil di-seed.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
