import { db } from "@/db";
import { masterSections, recruitmentSectionTemplates } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

function generateTemplate(sectionName: string) {
  const n = sectionName.toLowerCase();
  let requirements = "";
  let qualifications: string[] = [];
  let mandatoryFields: string[] = ["cv", "dateOfBirth", "address", "gender"];

  if (n.includes("driver") || n.includes("operator") || n.includes("truck") || n.includes("hauling") || n.includes("dispatcher")) {
    requirements = "Mengoperasikan kendaraan / alat berat sesuai SOP. Memastikan kondisi kendaraan prima. Mematuhi peraturan lalu lintas dan K3. Bekerja shift.\n\nDeskripsi: Mengendarai kendaraan operasional untuk aktivitas hauling, loading, atau transportasi. Bertanggung jawab atas keamanan muatan, perawatan ringan, dan koordinasi dengan dispatcher.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "drivingLicenses"];
  } else if (n.includes("admin") || n.includes("sekretaris") || n.includes("secretary") || n.includes("receptionist")) {
    requirements = "Menangani administrasi harian: filing, data entry, surat-menyurat. Mengelola jadwal meeting dan koordinasi antar departemen. Membuat laporan periodik. Melayani tamu dan telepon dengan profesional.";
    qualifications = ["Pendidikan Min. D3", "Menguasai Microsoft Office", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("teknisi") || n.includes("technician") || n.includes("mekanik") || n.includes("mechanic") || n.includes("listrik") || n.includes("electrical")) {
    requirements = "Melakukan perawatan preventif dan korektif pada mesin / peralatan. Membaca technical drawing dan manual. Menggunakan tools dan measuring instruments dengan benar. Mengisi maintenance log dan laporan kerja.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("hse") || n.includes("k3") || n.includes("safety")) {
    requirements = "Memastikan kepatuhan terhadap peraturan K3. Melakukan safety inspection, hazard identification, dan risk assessment. Menyelenggarakan safety induction dan toolbox meeting. Menyusun laporan kecelakaan kerja.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "education", "workExperience"];
  } else if (n.includes("warehouse") || n.includes("gudang") || n.includes("logistik") || n.includes("logistic")) {
    requirements = "Mengelola penerimaan, penyimpanan, dan pengeluaran barang. Melakukan stock opname. Mengoperasikan forklift (sertifikat diutamakan). Memelihara gudang tetap rapi dan aman.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("security") || n.includes("satpam") || n.includes("guard")) {
    requirements = "Melakukan patroli keamanan dan pemantauan CCTV. Mengontrol akses masuk/keluar. Menangani insiden keamanan sesuai SOP. Memiliki sertifikat Gada Pratama / Madya.";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates"];
  } else if (n.includes("cleaning") || n.includes("ob")) {
    requirements = "Membersihkan area kantor, toilet, dan area umum. Menggunakan cleaning tools dan chemical sesuai prosedur. Menjaga kebersihan dan kerapian area kerja.";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender"];
  } else if (n.includes("accounting") || n.includes("akuntan") || n.includes("finance") || n.includes("keuangan") || n.includes("tax") || n.includes("pajak")) {
    requirements = "Mencatat transaksi keuangan harian. Membuat laporan piutang, utang, dan rekon bank. Membantu penyusunan laporan pajak. Memahami standar akuntansi dan software akuntansi. Teliti dan menjaga kerahasiaan data.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("hr") || n.includes("hc") || n.includes("personnel") || n.includes("recruitment") || n.includes("payroll")) {
    requirements = "Mengelola administrasi karyawan: PKWT/PKWTT, mutasi, absensi, cuti. Menangani rekrutmen atau payroll. Memahami UU Ketenagakerjaan dan BPJS. Koordinasi dengan stakeholder internal.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("marketing") || n.includes("sales") || n.includes("business development")) {
    requirements = "Mencari prospek, mempresentasikan produk, dan menutup penjualan. Membangun hubungan dengan klien. Membuat sales proposal dan quotation. Bekerja dengan target revenue.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Memiliki SIM C", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience"];
  } else if (n.includes("it") || n.includes("programmer") || n.includes("developer") || n.includes("software") || n.includes("support") || n.includes("network")) {
    requirements = "Mengembangkan atau memelihara aplikasi / sistem IT. Melakukan troubleshooting hardware, software, dan network. Mengelola user account dan endpoint security. Berkolaborasi dengan tim teknis.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Bahasa Inggris Aktif"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience", "certificates"];
  } else if (n.includes("engineer") || n.includes("sipil") || n.includes("civil") || n.includes("survey") || n.includes("geologist") || n.includes("geotech")) {
    requirements = "Merencanakan, mengawasi, dan mengendalikan proyek / aktivitas teknik. Membaca gambar kerja dan technical specification. Melakukan quality control dan safety inspection. Membuat laporan progres dan issue log.";
    qualifications = ["Pendidikan Min. S1", "Pengalaman Min. 1 Tahun", "Memiliki SIM C", "Menguasai Microsoft Office"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "education", "workExperience", "certificates"];
  } else if (n.includes("welder") || n.includes("fabrikasi") || n.includes("fabrication") || n.includes("qc") || n.includes("qa") || n.includes("inspection") || n.includes("inspector")) {
    requirements = "Melakukan pengelasan / inspeksi sesuai standar (AWS, API, ISO). Membaca welding drawing / inspection plan. Menggunakan measuring tools dan NDT. Mengisi inspection report dan NCR.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else if (n.includes("supervisor") || n.includes("foreman") || n.includes("koordinator") || n.includes("team leader")) {
    requirements = "Memimpin dan mengkoordinasi tim lapangan. Membuat daily work plan dan progress report. Memastikan kualitas, safety, dan produktivitas tim. Menangani absensi dan performa bawahan.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 2 Tahun", "Memiliki SIM C"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "workExperience"];
  } else if (n.includes("cook") || n.includes("kitchen") || n.includes("chef") || n.includes("juru masak")) {
    requirements = "Memasak makanan sesuai menu dan standar hygiene. Mengelola stock bahan makanan. Memastikan kebersihan dapur dan area makan. Memahami food safety (HACCP).";
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates"];
  } else if (n.includes("nurse") || n.includes("medic") || n.includes("bidan") || n.includes("paramedic")) {
    requirements = "Memberikan pertolongan pertama dan perawatan medis dasar. Melakukan medical checkup karyawan. Mengelola obat-obatan dan medical record. Memiliki sertifikat NERS atau Bidan aktif.";
    qualifications = ["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "education", "workExperience"];
  } else if (n.includes("plant") || n.includes("produksi") || n.includes("production") || n.includes("batching") || n.includes("crusher")) {
    requirements = "Mengoperasikan dan memantau mesin produksi sesuai SOP. Melakukan setting, start-up, shutdown, dan troubleshooting dasar. Mengisi production log, downtime report, dan OEE. Bekerja shift dan mengikuti safety protocol.";
    qualifications = ["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"];
  } else {
    // Default template
    requirements = `Bertanggung jawab atas tugas dan operasional di bagian ${sectionName}. Melaksanakan pekerjaan sesuai SOP dan instruksi atasan. Memastikan kualitas, safety, dan efisiensi dalam setiap aktivitas. Melaporkan progress dan kendala secara berkala.`;
    qualifications = ["Pendidikan Min. SMA/SMK"];
    mandatoryFields = ["cv", "dateOfBirth", "address", "gender"];
  }

  return { requirements, qualifications, mandatoryFields };
}

async function main() {
  console.log("Seeding recruitment section templates...");

  const sections = await db.select().from(masterSections).where(eq(masterSections.isActive, true));
  console.log(`Found ${sections.length} active sections`);

  let created = 0;
  let skipped = 0;

  for (const section of sections) {
    const existing = await db
      .select()
      .from(recruitmentSectionTemplates)
      .where(eq(recruitmentSectionTemplates.sectionId, section.id));

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const template = generateTemplate(section.name);
    await db.insert(recruitmentSectionTemplates).values({
      sectionId: section.id,
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
