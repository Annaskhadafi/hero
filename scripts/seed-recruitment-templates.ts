import { db } from "@/db";
import { masterSections, recruitmentSectionTemplates } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";

function generateTemplate(sectionName: string) {
  const n = sectionName.toLowerCase();
  let jobDescription = "";
  let requirements = "";
  let qualifications: string[] = [];
  let mandatoryFields: string[] = ["cv", "dateOfBirth", "address", "gender"];

  if (n.includes("driver") || n.includes("operator") || n.includes("truck") || n.includes("hauling") || n.includes("dispatcher")) {
    jobDescription = "- Mengoperasikan kendaraan operasional sesuai SOP\n- Memastikan kondisi kendaraan prima sebelum dan sesudah operasi\n- Melaporkan kondisi jalan, cuaca, dan hambatan operasional";
    requirements = "- Min. SMA/SMK sederajat\n- Memiliki SIM sesuai jenis kendaraan (C/B2)\n- Pengalaman mengemudi min. 1 tahun\n- Familiar dengan area operasional\n- Siap kerja shift";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "drivingLicenses"];
  } else if (n.includes("admin") || n.includes("sekretaris") || n.includes("secretary") || n.includes("receptionist")) {
    jobDescription = "- Menangani administrasi harian (filing, data entry, surat-menyurat)\n- Mengelola jadwal meeting dan booking ruangan\n- Membuat laporan periodik menggunakan MS Office\n- Melayani tamu dan telepon dengan profesional";
    requirements = "- Min. D3/S1 semua jurusan\n- Mahir Microsoft Office (Word, Excel, PowerPoint)\n- Komunikasi aktif dan detail-oriented\n- Pengalaman admin min. 1 tahun (diutamakan)";
    qualifications = ["Pendidikan Min. D3", "Menguasai Microsoft Office", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("teknisi") || n.includes("technician") || n.includes("mekanik") || n.includes("mechanic") || n.includes("listrik") || n.includes("electrical")) {
    jobDescription = "- Melakukan perawatan preventif dan korektif mesin/peralatan\n- Membaca technical drawing dan manual peralatan\n- Menggunakan tools dan measuring instruments dengan benar\n- Mengisi maintenance log dan laporan kerja";
    requirements = "- Min. SMA/SMK teknik (elektro/mesin/otomotif)\n- Memiliki sertifikat kompetensi (diutamakan)\n- Pengalaman min. 1 tahun di bidang terkait\n- Memahami troubleshooting dasar";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("hse") || n.includes("k3") || n.includes("safety")) {
    jobDescription = "- Memastikan kepatuhan terhadap peraturan K3 di lapangan\n- Melakukan safety inspection dan hazard identification\n- Menyelenggarakan safety induction dan toolbox meeting\n- Menyusun laporan kecelakaan dan investigasi K3";
    requirements = "- Min. D3/S1 teknik/K3/lingkungan\n- Memiliki sertifikat K3 (AK3, BNSP, dll)\n- Pengalaman HSE min. 1 tahun\n- Memahami SMK3 dan ISO 45001";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "education", "workExperience"];
  } else if (n.includes("warehouse") || n.includes("gudang") || n.includes("logistik") || n.includes("logistic")) {
    jobDescription = "- Mengelola penerimaan, penyimpanan, dan pengeluaran barang\n- Melakukan stock opname dan rekonsiliasi\n- Mengoperasikan forklift (sertifikat diutamakan)\n- Memelihara gudang tetap rapi dan aman";
    requirements = "- Min. SMA/SMK sederajat\n- Pengalaman warehouse/logistik min. 1 tahun\n- Memiliki SIM C (diutamakan forklift)\n- Teliti dan terorganisir";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("security") || n.includes("satpam") || n.includes("guard")) {
    jobDescription = "- Melakukan patroli keamanan dan pemantauan CCTV\n- Mengontrol akses masuk/keluar personel dan kendaraan\n- Menangani insiden keamanan sesuai SOP\n- Membuat laporan patroli harian";
    requirements = "- Min. SMA/SMK sederajat\n- Memiliki sertifikat Gada Pratama / Madya\n- Postur tubuh proporsional dan sehat\n- Jujur, tegas, dan profesional";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates"];
  } else if (n.includes("cleaning") || n.includes("ob")) {
    jobDescription = "- Membersihkan area kantor, toilet, dan area umum\n- Menggunakan cleaning tools dan chemical sesuai prosedur\n- Memilah sampah sesuai kategori\n- Menjaga kebersihan dan kerapian area kerja";
    requirements = "- Min. SMA/SMP sederajat\n- Sehat jasmani dan rohani\n- Rajin, disiplin, dan teliti\n- Berpengalaman sebagai cleaning service (diutamakan)";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender"];
  } else if (n.includes("accounting") || n.includes("akuntan") || n.includes("finance") || n.includes("keuangan") || n.includes("tax") || n.includes("pajak")) {
    jobDescription = "- Mencatat transaksi keuangan harian (jurnal, buku besar, kas kecil)\n- Membuat laporan piutang, utang, dan rekon bank\n- Membantu penyusunan laporan pajak (PPN, PPh 21, PPh 23)\n- Menggunakan software akuntansi dengan tepat";
    requirements = "- Min. D3/S1 akuntansi/keuangan/manajemen\n- Memahami standar akuntansi (PSAK)\n- Teliti, cermat, dan menjaga kerahasiaan data\n- Pengalaman akuntansi min. 1 tahun (diutamakan)";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("hr") || n.includes("hc") || n.includes("personnel") || n.includes("recruitment") || n.includes("payroll")) {
    jobDescription = "- Mengelola administrasi karyawan (PKWT/PKWTT, mutasi, absensi, cuti)\n- Menangani rekrutmen, onboarding, dan offboarding\n- Memahami perhitungan gaji, THR, dan tunjangan\n- Koordinasi dengan BPJS Ketenagakerjaan dan Kesehatan";
    requirements = "- Min. D3/S1 psikologi/HRM/manajemen\n- Memahami UU Ketenagakerjaan dan peraturan BPJS\n- Komunikatif dan empati tinggi\n- Pengalaman HR min. 1 tahun (diutamakan)";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("marketing") || n.includes("sales") || n.includes("business development")) {
    jobDescription = "- Mencari prospek dan membangun database klien\n- Mempresentasikan produk dan menutup penjualan\n- Membuat sales proposal, quotation, dan kontrak\n- Menganalisis market trend dan competitor activity";
    requirements = "- Min. D3/S1 semua jurusan\n- Memiliki SIM C dan kendaraan (diutamakan)\n- Komunikatif, persuasif, dan target-oriented\n- Pengalaman sales min. 1 tahun (diutamakan)";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Memiliki SIM C", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("it") || n.includes("programmer") || n.includes("developer") || n.includes("software") || n.includes("support") || n.includes("network")) {
    jobDescription = "- Mengembangkan dan memelihara aplikasi / sistem IT\n- Melakukan troubleshooting hardware, software, dan network\n- Mengelola user account, permission, dan endpoint security\n- Membantu pelatihan teknis untuk karyawan";
    requirements = "- Min. D3/S1 teknik informatika/ilmu komputer/elektro\n- Memahami programming, database, dan network\n- Memiliki sertifikat IT (diutamakan)\n- Problem solving dan teamwork yang baik";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience", "certificates"];
  } else if (n.includes("engineer") || n.includes("sipil") || n.includes("civil") || n.includes("survey") || n.includes("geologist") || n.includes("geotech")) {
    jobDescription = "- Merencanakan, mengawasi, dan mengendalikan proyek teknik\n- Membaca gambar kerja, shop drawing, dan technical specification\n- Melakukan quality control dan safety inspection lapangan\n- Membuat laporan progres, varians, dan issue log";
    requirements = "- Min. S1 teknik (sipil/mesin/elektro/geologi)\n- Memahami software engineering (AutoCAD, SAP, dll)\n- Memiliki sertifikat kompetensi (diutamakan)\n- Pengalaman project min. 1 tahun (diutamakan)";
    qualifications = ["Pendidikan Min. S1", "Pengalaman Min. 1 Tahun", "Memiliki SIM C", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience", "certificates"];
  } else if (n.includes("welder") || n.includes("fabrikasi") || n.includes("fabrication") || n.includes("qc") || n.includes("qa") || n.includes("inspection") || n.includes("inspector")) {
    jobDescription = "- Melakukan pengelasan sesuai standar (SMAW, GMAW, GTAW)\n- Membaca welding drawing dan WPS/PQR\n- Melakukan surface preparation dan NDT inspection\n- Mengisi inspection report, NCR, dan CAR";
    requirements = "- Min. SMA/SMK teknik (mesin/teknik pengelasan)\n- Memiliki sertifikat welder (BNSP/AWS) aktif\n- Pengalaman welding/inspection min. 1 tahun\n- Memahami standar AWS, API, atau ISO";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("supervisor") || n.includes("foreman") || n.includes("koordinator") || n.includes("team leader")) {
    jobDescription = "- Memimpin dan mengkoordinasi tim lapangan (10-30 orang)\n- Membuat daily work plan, job assignment, dan progress report\n- Memastikan kualitas, safety, dan produktivitas tim\n- Menangani absensi, konflik, dan performa bawahan";
    requirements = "- Min. SMA/SMK sederajat (D3/S1 diutamakan)\n- Pengalaman supervisory min. 2 tahun\n- Memiliki SIM C dan kendaraan (diutamakan)\n- Leadership, komunikasi, dan problem solving kuat";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 2 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "workExperience"];
  } else if (n.includes("cook") || n.includes("kitchen") || n.includes("chef") || n.includes("juru masak")) {
    jobDescription = "- Memasak makanan sesuai menu, porsi, dan standar hygiene\n- Mengelola stock bahan makanan dan kitchen inventory\n- Memastikan kebersihan dapur, peralatan, dan area makan\n- Kreatif dalam penyajian dan inovasi menu";
    requirements = "- Min. SMA/SMK sederajat (sekolah kuliner diutamakan)\n- Memahami food safety (HACCP, BPOM)\n- Pengalaman masak skala besar (diutamakan)\n- Kreatif, rajin, dan teliti";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates"];
  } else if (n.includes("nurse") || n.includes("medic") || n.includes("bidan") || n.includes("paramedic")) {
    jobDescription = "- Memberikan pertolongan pertama dan perawatan medis dasar\n- Melakukan medical checkup karyawan secara berkala\n- Mengelola obat-obatan, medical supplies, dan medical record\n- Memahami occupational health dan emergency response";
    requirements = "- Min. D3 keperawatan/bidan/paramedic\n- Memiliki sertifikat NERS, Bidan, atau Paramedic aktif\n- Pengalaman medis min. 1 tahun (diutamakan)\n- Empati tinggi dan detail-oriented";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "education", "workExperience"];
  } else if (n.includes("plant") || n.includes("produksi") || n.includes("production") || n.includes("batching") || n.includes("crusher")) {
    jobDescription = "- Mengoperasikan dan memantau mesin produksi sesuai SOP\n- Melakukan setting, start-up, shutdown, dan troubleshooting dasar\n- Mengisi production log, downtime report, dan OEE\n- Bekerja shift dan mengikuti safety protocol";
    requirements = "- Min. SMA/SMK teknik (mesin/elektro/otomotif)\n- Memiliki sertifikat kompetensi operator (diutamakan)\n- Pengalaman produksi min. 1 tahun (diutamakan)\n- Siap kerja shift dan overtime";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else {
    // Default template
    jobDescription = `- Bertanggung jawab atas tugas operasional di bagian ${sectionName}\n- Melaksanakan pekerjaan sesuai SOP dan instruksi atasan\n- Memastikan kualitas, safety, dan efisiensi dalam setiap aktivitas\n- Melaporkan progress dan kendala secara berkala`;
    requirements = "- Min. SMA/SMK sederajat\n- Sehat jasmani dan rohani\n- Disiplin, rajin, dan bertanggung jawab\n- Bersedia ditempatkan di area operasional";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender"];
  }

  return { jobDescription, requirements, qualifications, mandatoryFields };
}

async function main() {
  console.log("Seeding recruitment section templates...");

  const sections = await db.select().from(masterSections).where(eq(masterSections.isActive, true));
  console.log(`Found ${sections.length} active sections`);

  let created = 0;
  let skipped = 0;

  // Clear existing templates to force re-seed with new format
  await db.execute(sql`DELETE FROM hero_recruitment_section_templates`);
  console.log("Cleared existing templates");

  for (const section of sections) {
    const template = generateTemplate(section.name);
    await db.insert(recruitmentSectionTemplates).values({
      sectionId: section.id,
      jobDescription: template.jobDescription,
      requirements: template.requirements,
      qualifications: template.qualifications,
      mandatoryFields: template.mandatoryFields,
    });
    created++;
    console.log(`Created template for: ${section.name}`);
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
