import { db } from "../db";
import {
  hcCandidateInterviews,
  hcCandidateMcu,
  hcCandidateOfferings,
  hcCandidatePanelEvaluations,
  hcCandidateStages,
  hcCandidates,
  hcRecruitments,
} from "../db/schema/hero";
import { asc, sql } from "drizzle-orm";

const STAGES = ["Sourcing", "Screening", "Psikotes", "Interview", "Offering", "Hired"];
const SOURCES = ["LinkedIn", "JobStreet", "Referral", "Website", "Walk-in", "Instagram", "Disnaker", "Campus Hiring"];
const BANKS = ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga"];
const CITIES = ["Balikpapan", "Samarinda", "Banjarmasin", "Makassar", "Surabaya", "Yogyakarta", "Bandung", "Jakarta", "Palembang", "Medan"];

const candidates = [
  ["Ahmad Fauzi", "Hired", "Laki-laki", 92],
  ["Siti Nurhaliza", "Hired", "Perempuan", 88],
  ["Budi Santoso", "Hired", "Laki-laki", 84],
  ["Dewi Lestari", "Hired", "Perempuan", 79],
  ["Rizky Pratama", "Hired", "Laki-laki", 86],
  ["Maya Kartika", "Offering", "Perempuan", 82],
  ["Andi Saputra", "Offering", "Laki-laki", 76],
  ["Nur Aisyah", "Offering", "Perempuan", 74],
  ["Fajar Ramadhan", "Offering", "Laki-laki", 71],
  ["Putri Maharani", "Interview", "Perempuan", 68],
  ["Agus Setiawan", "Interview", "Laki-laki", 66],
  ["Rina Oktaviani", "Interview", "Perempuan", 63],
  ["Hendra Wijaya", "Interview", "Laki-laki", 58],
  ["Laras Puspita", "Interview", "Perempuan", 61],
  ["Dimas Arya", "Interview", "Laki-laki", 55],
  ["Yuni Anggraini", "Psikotes", "Perempuan", 52],
  ["Teguh Wibowo", "Psikotes", "Laki-laki", 49],
  ["Intan Permata", "Psikotes", "Perempuan", 57],
  ["Arif Maulana", "Psikotes", "Laki-laki", 46],
  ["Nadia Safitri", "Psikotes", "Perempuan", 54],
  ["Bayu Nugroho", "Screening", "Laki-laki", 43],
  ["Citra Amelia", "Screening", "Perempuan", 48],
  ["Eko Prasetyo", "Screening", "Laki-laki", 38],
  ["Fitri Handayani", "Screening", "Perempuan", 41],
  ["Gilang Mahendra", "Screening", "Laki-laki", 35],
  ["Hani Rahmawati", "Sourcing", "Perempuan", 29],
  ["Imam Hidayat", "Sourcing", "Laki-laki", 31],
  ["Joko Susilo", "Sourcing", "Laki-laki", 24],
  ["Kartika Dewi", "Sourcing", "Perempuan", 33],
  ["Lukman Hakim", "Sourcing", "Laki-laki", 27],
] as const;

function dateIn2026(index: number, dayOffset = 0) {
  const month = index % 6;
  const day = 2 + ((index * 3 + dayOffset) % 24);
  return new Date(2026, month, day, 8 + (index % 7), 15, 0);
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const vacancies = await db
    .select({ id: hcRecruitments.id, title: hcRecruitments.jobTitle, department: hcRecruitments.department })
    .from(hcRecruitments)
    .orderBy(asc(hcRecruitments.id));

  if (vacancies.length === 0) {
    throw new Error("No recruitment vacancies found. Create vacancies first.");
  }

  await db.delete(hcCandidates).where(sql`${hcCandidates.email} LIKE 'demo.recruitment.%@hero.local'`);

  for (const [index, candidate] of candidates.entries()) {
    const [fullName, currentStage, gender, aiScore] = candidate;
    const vacancy = vacancies[index % vacancies.length];
    const createdAt = dateIn2026(index);
    const city = CITIES[index % CITIES.length];
    const slug = toSlug(fullName);
    const email = `demo.recruitment.${String(index + 1).padStart(2, "0")}.${slug}@hero.local`;
    const birthYear = 1990 + (index % 12);
    const currentStageIndex = STAGES.indexOf(currentStage);
    const isRejected = [12, 16, 22, 27].includes(index);

    const [inserted] = await db
      .insert(hcCandidates)
      .values({
        recruitmentId: vacancy.id,
        fullName,
        email,
        phone: `08${String(1234567890 + index * 731).slice(0, 10)}`,
        dateOfBirth: new Date(birthYear, index % 12, 5 + (index % 20)),
        address: `Jl. Merdeka No. ${12 + index}, ${city}, Indonesia`,
        gender,
        workExperience: [
          {
            company: ["PT Borneo Energi", "PT Karya Mandiri", "PT Nusantara Mining", "PT Logistik Prima"][index % 4],
            role: ["Operator", "Admin Operasional", "Marketing Officer", "Teknisi", "Supervisor Trainee"][index % 5],
            yearIn: String(2018 + (index % 4)),
            yearOut: index % 3 === 0 ? "Sekarang" : String(2023 + (index % 2)),
            description: "Mengelola pekerjaan harian, membuat laporan, koordinasi lintas tim, dan menjaga target operasional.",
          },
        ],
        education: [
          {
            level: index % 4 === 0 ? "S1" : index % 4 === 1 ? "D3" : "SMA/SMK",
            institution: ["Universitas Mulawarman", "Politeknik Negeri Balikpapan", "SMK Negeri 1 Samarinda", "Universitas Hasanuddin"][index % 4],
            major: ["Manajemen", "Teknik Mesin", "Administrasi Perkantoran", "Teknik Informatika", "Akuntansi"][index % 5],
            yearIn: String(2010 + (index % 5)),
            yearOut: String(2014 + (index % 6)),
          },
        ],
        drivingLicenses: index % 3 === 0 ? ["SIM A", "SIM B2"] : index % 3 === 1 ? ["SIM A", "SIM C"] : ["SIM C"],
        certificates: [
          {
            name: ["K3 Umum", "Microsoft Office", "Basic Safety Training", "Customer Handling", "Sertifikasi Operator"][index % 5],
            year: String(2021 + (index % 5)),
            publisher: ["BNSP", "Disnaker", "LSP HERO", "Training Center Indonesia"][index % 4],
          },
        ],
        achievements: `Masuk shortlist kandidat ${vacancy.title}; memiliki pengalaman relevan dan catatan kerja baik.`,
        cvUrl: `/demo/recruitment/cv/${slug}.pdf`,
        source: SOURCES[index % SOURCES.length],
        currentStage,
        rating: 1 + (index % 5),
        aiScore,
        aiSummary: `Skor ${aiScore}. Kandidat cocok untuk ${vacancy.title} dengan kekuatan utama pada disiplin kerja dan adaptasi lapangan.`,
        aiDetails: {
          breakdown: [
            { criterion: "Pengalaman kerja", score: Math.min(100, aiScore + 4), weight: 35, reason: "Pengalaman sesuai kebutuhan posisi." },
            { criterion: "Kualifikasi pendidikan", score: Math.max(20, aiScore - 5), weight: 25, reason: "Pendidikan mendukung kebutuhan dasar jabatan." },
            { criterion: "Komunikasi", score: Math.max(20, aiScore - 2), weight: 20, reason: "Komunikasi cukup baik saat proses seleksi." },
            { criterion: "Kesiapan lokasi", score: Math.min(100, aiScore + 8), weight: 20, reason: "Bersedia ditempatkan sesuai kebutuhan operasional." },
          ],
          knockout: [
            { criterion: "Dokumen lengkap", passed: true, reason: "CV, KTP, dan kontak darurat tersedia." },
            { criterion: "Pengalaman minimum", passed: aiScore >= 35, reason: aiScore >= 35 ? "Memenuhi pengalaman minimum." : "Perlu pengalaman tambahan." },
          ],
          recommendation: aiScore >= 70 ? "Strong Match" : aiScore >= 50 ? "Consider" : "Review Further",
        },
        aiAssessmentDate: dateIn2026(index, 1),
        notes: `Demo kandidat recruitment untuk dashboard. Vacancy: ${vacancy.title}. Stage: ${currentStage}.`,
        rejectionReason: isRejected ? `Belum memenuhi standar pada tahap ${currentStage}.` : "-",
        rejectedAtStage: isRejected ? currentStage : "-",
        onboardingToken: `demo-onboarding-${String(index + 1).padStart(2, "0")}`,
        nikKtp: `64${String(71000000000000 + index * 97).slice(0, 14)}`,
        npwpNumber: `09.${String(100000000 + index * 1123).slice(0, 3)}.${String(200000 + index * 13).slice(0, 3)}.${String(300 + index).slice(0, 3)}-${String(400 + index).slice(0, 3)}.${String(500 + index).slice(0, 3)}`,
        bpjsKesehatan: `000${String(1234567890 + index * 101).slice(0, 10)}`,
        bpjsKetenagakerjaan: `TK${String(2026000000 + index * 211).slice(0, 10)}`,
        bankName: BANKS[index % BANKS.length],
        bankAccountNumber: String(7000000000 + index * 314159).slice(0, 10),
        emergencyContactName: ["Bapak Surya", "Ibu Wati", "Rudi Hartono", "Sri Wahyuni"][index % 4],
        emergencyContactPhone: `08${String(9876543210 - index * 619).slice(0, 10)}`,
        kkUrl: `/demo/recruitment/docs/${slug}-kk.pdf`,
        ktpUrl: `/demo/recruitment/docs/${slug}-ktp.pdf`,
        bankBookUrl: `/demo/recruitment/docs/${slug}-rekening.pdf`,
        startDate: currentStage === "Hired" ? formatDate(new Date(2026, 6 + (index % 3), 1 + index)) : formatDate(new Date(2026, 8, 1 + (index % 20))),
        onboardingCompletedAt: currentStage === "Hired" ? dateIn2026(index, 20) : null,
        createdAt,
        updatedAt: dateIn2026(index, 6),
      })
      .returning({ id: hcCandidates.id });

    for (let stageIndex = 0; stageIndex <= currentStageIndex; stageIndex++) {
      const stage = STAGES[stageIndex];
      await db.insert(hcCandidateStages).values({
        candidateId: inserted.id,
        stage,
        enteredAt: dateIn2026(index, stageIndex * 2),
        exitedAt: stageIndex < currentStageIndex ? dateIn2026(index, stageIndex * 2 + 1) : null,
        result: stageIndex < currentStageIndex ? "pass" : isRejected ? "fail" : currentStage === "Hired" ? "pass" : "pending",
        evaluator: ["Ratna HR", "Bayu Recruiter", "Mira HC", "Doni User"][stageIndex % 4],
        notes: `${fullName} berada pada tahap ${stage}.`,
        score: Math.max(20, Math.min(100, aiScore - 5 + stageIndex * 4)),
        createdAt: dateIn2026(index, stageIndex * 2),
      });
    }

    if (currentStageIndex >= STAGES.indexOf("Interview")) {
      const [interview] = await db
        .insert(hcCandidateInterviews)
        .values({
          candidateId: inserted.id,
          scheduledAt: dateIn2026(index, 9),
          durationMinutes: 60,
          interviewType: index % 2 === 0 ? "Offline" : "Online",
          locationOrLink: index % 2 === 0 ? "Ruang Interview HC Balikpapan" : "https://meet.hero.local/recruitment-demo",
          interviewerName: ["Rina HC Manager", "Dedi Operation Manager", "Maya Section Head"][index % 3],
          status: currentStage === "Interview" && !isRejected ? "Scheduled" : "Completed",
          result: isRejected ? "Fail" : currentStage === "Interview" ? "Pending" : "Pass",
          notes: isRejected ? "Kompetensi teknis belum sesuai kebutuhan user." : "Komunikasi baik dan pengalaman relevan.",
          createdAt: dateIn2026(index, 8),
          updatedAt: dateIn2026(index, 10),
        })
        .returning({ id: hcCandidateInterviews.id });

      if (currentStage !== "Interview" || isRejected) {
        await db.insert(hcCandidatePanelEvaluations).values({
          candidateId: inserted.id,
          interviewId: interview.id,
          panelistName: ["Rina HC Manager", "Dedi Operation Manager", "Maya Section Head"][index % 3],
          panelistRole: ["HC", "User", "Section Head"][index % 3],
          technicalScore: Math.max(30, aiScore - 5),
          communicationScore: Math.max(30, aiScore - 2),
          cultureScore: Math.max(30, aiScore),
          problemSolvingScore: Math.max(30, aiScore - 7),
          attitudeScore: Math.max(30, aiScore + 3),
          overallRecommendation: isRejected ? "Reject" : aiScore >= 75 ? "Hire" : "Review",
          strengths: "Disiplin, responsif, pengalaman relevan.",
          concerns: isRejected ? "Perlu peningkatan kompetensi teknis." : "Perlu adaptasi pada sistem internal.",
          notes: "Evaluasi panel demo untuk kebutuhan dashboard recruitment.",
          submittedAt: dateIn2026(index, 11),
          createdAt: dateIn2026(index, 11),
          updatedAt: dateIn2026(index, 11),
        });
      }
    }

    if (currentStage === "Offering" || currentStage === "Hired") {
      await db.insert(hcCandidateMcu).values({
        candidateId: inserted.id,
        klinikName: ["Klinik Kimia Farma Balikpapan", "Prodia Samarinda", "RS Siloam Balikpapan"][index % 3],
        klinikEmail: ["kimiafarma.demo@hero.local", "prodia.demo@hero.local", "siloam.demo@hero.local"][index % 3],
        paketMcu: ["Basic MCU", "MCU Operator", "MCU Staff Office"][index % 3],
        scheduledDate: formatDate(dateIn2026(index, 12)),
        status: currentStage === "Hired" ? "Fit" : "Scheduled",
        resultNotes: currentStage === "Hired" ? "Fit to work, tidak ada catatan medis kritis." : "Menunggu pelaksanaan MCU.",
        resultFileUrl: currentStage === "Hired" ? `/demo/recruitment/mcu/${slug}.pdf` : "-",
        resultDate: currentStage === "Hired" ? formatDate(dateIn2026(index, 13)) : null,
        resultBy: currentStage === "Hired" ? "Dokter Klinik Rekanan" : "-",
        createdAt: dateIn2026(index, 12),
        updatedAt: dateIn2026(index, 13),
      });

      await db.insert(hcCandidateOfferings).values({
        candidateId: inserted.id,
        position: vacancy.title,
        directSupervisor: ["Supervisor Operasional", "HC Manager", "Marketing Lead", "Workshop Head"][index % 4],
        salary: `Rp ${(5_000_000 + index * 275_000).toLocaleString("id-ID")}`,
        contractDurationMonths: [6, 12, 24][index % 3],
        startDate: formatDate(new Date(2026, 7 + (index % 3), 1 + (index % 20))),
        outpatientBenefit: "Bantuan rawat jalan sesuai kebijakan perusahaan.",
        inpatientBenefit: "Jaminan rawat inap mengikuti program benefit perusahaan.",
        maternityBenefit: "Benefit maternity mengikuti ketentuan perusahaan dan regulasi berlaku.",
        accidentInsurance: "Perusahaan menanggung asuransi kecelakaan kerja sesuai ketentuan.",
        bpjsEmployment: "BPJS Ketenagakerjaan didaftarkan oleh perusahaan.",
        bpjsHealth: "BPJS Kesehatan didaftarkan oleh perusahaan.",
        thr: "THR diberikan sesuai ketentuan pemerintah.",
        otherTerms: "Ketentuan lain mengikuti peraturan perusahaan yang berlaku.",
        signatoryName: "Ratna Puspitasari",
        signatoryTitle: "HC Manager",
        signatureUrl: "/demo/signatures/hc-manager.png",
        letterNumber: `HERO/OFFER/2026/${String(index + 1).padStart(3, "0")}`,
        pdfUrl: `/demo/recruitment/offering/${slug}.pdf`,
        status: currentStage === "Hired" ? "Accepted" : "Sent",
        sentAt: dateIn2026(index, 14),
        respondedAt: currentStage === "Hired" ? dateIn2026(index, 15) : null,
        notes: currentStage === "Hired" ? "Kandidat menerima offering." : "Offering sudah dikirim, menunggu jawaban kandidat.",
        createdAt: dateIn2026(index, 14),
        updatedAt: dateIn2026(index, 15),
      });
    }
  }

  const rows = await db.execute(sql`
    SELECT current_stage, count(*)::int as total
    FROM hero_hc_candidates
    WHERE email LIKE 'demo.recruitment.%@hero.local'
    GROUP BY current_stage
    ORDER BY current_stage
  `);

  console.log("Seeded 30 demo recruitment candidates.");
  console.table(rows.rows);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
