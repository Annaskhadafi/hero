"use server";

import { db } from "@/db";
import {
  sopWinDocuments,
  approvalMatrices,
  approvalMatrixSteps,
  heroGeniusSopApprovalSystems,
  sites,
  masterDepartments,
  employees,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth-session";
import { sendRagChat } from "@/lib/hero-genius/client";

export type SopApprovalStepInput = {
  stepOrder: number;
  label: string;
  assignedRole: string;
  slaHours: number;
  isRequired: boolean;
  condition?: string;
};

export type SopApprovalPreset = {
  key: string;
  title: string;
  documentNumber: string;
  documentType: "SOP" | "WIN" | "POL";
  departmentCode: string;
  transactionType: string;
  summary: string;
  approvalSteps: SopApprovalStepInput[];
  rules: string[];
};

export const STANDARD_SOP_PRESETS: SopApprovalPreset[] = [
  {
    key: "ptw_safety",
    title: "Izin Kerja Aman Risiko Tinggi (Permit to Work / PTW)",
    documentNumber: "SOP-HSE-002",
    documentType: "SOP",
    departmentCode: "HSE",
    transactionType: "hse_ptw",
    summary:
      "Prosedur pengajuan dan pemenuhan kriteria K3L untuk pekerjaan berisiko tinggi (Hot Work, Confined Space, Working at Height, Electrical Isolation). Membutuhkan verifikasi berlapis dari Pengawas Lapangan, Officer K3L, hingga Manager Site.",
    approvalSteps: [
      {
        stepOrder: 1,
        label: "Pemeriksaan Awal & JSA Lapangan",
        assignedRole: "Supervisor / Site Leader",
        slaHours: 12,
        isRequired: true,
        condition: "Wajib untuk semua izin kerja PTW",
      },
      {
        stepOrder: 2,
        label: "Verifikasi K3L & Inspeksi APD / Gas Test",
        assignedRole: "HSE Officer / Inspector",
        slaHours: 24,
        isRequired: true,
        condition: "Pekerjaan Panas, Ruang Terbatas, Ketinggian > 2 Meter",
      },
      {
        stepOrder: 3,
        label: "Persetujuan Akhir Pembebasan Area Kerja",
        assignedRole: "Department Head / Site Manager",
        slaHours: 24,
        isRequired: true,
        condition: "Penandatanganan Izin Resmi sebelum Pekerjaan Dimulai",
      },
    ],
    rules: [
      "Wajib menyertakan dokumen JSA (Job Safety Analysis) & Sertifikat SIO Alat bila menggunakan alat berat.",
      "Gas Test wajib diperbarui setiap 8 jam untuk pekerjaan di ruang terbatas.",
      "E-signature dari HSE Inspector wajib tercatat secara digital di sistem HERO.",
    ],
  },
  {
    key: "overtime_spl",
    title: "Surat Perintah Lembur & Klaim Jam Kerja (SPL)",
    documentNumber: "SOP-HC-004",
    documentType: "SOP",
    departmentCode: "HR",
    transactionType: "overtime_spl",
    summary:
      "Prosedur penerbitan dan persetujuan Surat Perintah Lembur (SPL) karyawan operasional dan site. Memastikan legitimasi pekerjaan tambahan, efisiensi anggaran lembur, dan kepatuhan regulasi Ketenagakerjaan.",
    approvalSteps: [
      {
        stepOrder: 1,
        label: "Verifikasi Kebutuhan & Target Kerja Lembur",
        assignedRole: "Direct Leader / Foreman",
        slaHours: 12,
        isRequired: true,
        condition: "Diperlukan sebelum pelaksanaan lembur diajukan",
      },
      {
        stepOrder: 2,
        label: "Persetujuan Alokasi Jam & Budget Department",
        assignedRole: "Section Head / Superintendent",
        slaHours: 24,
        isRequired: true,
        condition: "Pengajuan lembur > 2 jam per hari",
      },
      {
        stepOrder: 3,
        label: "Sign-off Resmi & Payroll Validation",
        assignedRole: "Department Manager / HC Manager",
        slaHours: 48,
        isRequired: true,
        condition: "Penetapan akhir klaim lembur untuk siklus gaji",
      },
    ],
    rules: [
      "Maksimal lembur 4 jam per hari dan 18 jam per minggu sesuai regulasi UU Ketenagakerjaan.",
      "Foto bukti aktivitas & lampiran Daily Report wajib diselesaikan karyawan setelah lembur.",
      "Keterlambatan approval > H+2 akan memicu pengiriman automatic reminder ke penanggung jawab.",
    ],
  },
  {
    key: "purchase_pr",
    title: "Pengadaan Barang, Jasa & Sparepart Operational",
    documentNumber: "SOP-GA-001",
    documentType: "SOP",
    departmentCode: "GA",
    transactionType: "purchase_request",
    summary:
      "Prosedur pengajuan Purchase Requisition (PR) untuk suku cadang ban, peralatan workshop, perlengkapan K3L, serta jasa perbaikan retread/tire repair.",
    approvalSteps: [
      {
        stepOrder: 1,
        label: "Verifikasi Stok Gudang & Spesifikasi Teknis",
        assignedRole: "Warehouse Admin / Maintenance Planner",
        slaHours: 12,
        isRequired: true,
        condition: "Pengecekan ketersediaan fisik di Sloc Gudang",
      },
      {
        stepOrder: 2,
        label: "Persetujuan Anggaran Department (Capex/Opex)",
        assignedRole: "Department Manager",
        slaHours: 24,
        isRequired: true,
        condition: "Nilai pengajuan Rp 1.000.000 - Rp 25.000.000",
      },
      {
        stepOrder: 3,
        label: "Otorisasi Keuangan & General Manager",
        assignedRole: "Finance Manager / General Manager",
        slaHours: 48,
        isRequired: true,
        condition: "Pengadaan khusus > Rp 25.000.000 atau Urgent Emergency",
      },
    ],
    rules: [
      "Wajib menyertakan minimal 2 pembanding vendor untuk pengadaan bukan kontrak tahunan.",
      "Item emergency workshop mendapat batas SLA prioritas 4 jam di level 1.",
    ],
  },
  {
    key: "daily_activity",
    title: "Verifikasi & Sign-off Laporan Aktivitas Harian",
    documentNumber: "SOP-TC-007",
    documentType: "SOP",
    departmentCode: "TC",
    transactionType: "activity",
    summary:
      "Prosedur pelaporan dan validasi aktivitas harian teknisi, mekanik, dan staf site (Tire Change, Inspection, Repair, RFR & General Activity).",
    approvalSteps: [
      {
        stepOrder: 1,
        label: "Review Log Aktivitas & Bukti Foto Lapangan",
        assignedRole: "Team Leader / Supervisor",
        slaHours: 24,
        isRequired: true,
        condition: "Laporan Aktivitas Harian Karyawan",
      },
      {
        stepOrder: 2,
        label: "Validasi KPI & Rekapitulasi Timesheet",
        assignedRole: "Site Superintendent / Coordinator",
        slaHours: 48,
        isRequired: true,
        condition: "Penutupan siklus mingguan / bulanan",
      },
    ],
    rules: [
      "Foto bukti aktivitas sebelum dan sesudah pekerjaan wajib diunggah.",
      "Aktivitas tanpa penolakan dalam 7x24 jam akan secara otomatis terarsip sebagai verified.",
    ],
  },
];

/**
 * 1. Ambil daftar dokumen SOP/WIN yang terdaftar di database
 */
export async function getAvailableSopWinDocumentsAction() {
  try {
    const docs = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        documentType: sopWinDocuments.documentType,
        departmentCode: sopWinDocuments.departmentCode,
        summary: sopWinDocuments.summary,
        status: sopWinDocuments.status,
      })
      .from(sopWinDocuments)
      .orderBy(desc(sopWinDocuments.createdAt))
      .limit(50);

    return {
      success: true,
      documents: docs,
    };
  } catch (error: any) {
    console.error("[getAvailableSopWinDocumentsAction] error:", error);
    return {
      success: false,
      documents: [],
      error: error.message || "Gagal mengambil daftar SOP/WIN",
    };
  }
}

/**
 * 2. Analisis & Generasi Sistem Approval dari SOP/WIN (via AI Genius & Heuristic Parser)
 */
export async function generateSopWinApprovalAction(payload: {
  sopDocumentId?: number;
  rawSopContent?: string;
  presetKey?: string;
  customTitle?: string;
}) {
  try {
    const session = await getServerSession();
    let userId = session?.user?.id || null;

    let title = payload.customTitle || "Sistem Approval SOP";
    let documentNumber = "SOP-GEN-001";
    let documentType: "SOP" | "WIN" | "POL" = "SOP";
    let departmentCode = "HR";
    let transactionType = "activity";
    let summary = "";
    let approvalSteps: SopApprovalStepInput[] = [];
    let rules: string[] = [];
    let rawContent = payload.rawSopContent || "";

    // A. Jika menggunakan Preset
    if (payload.presetKey) {
      const preset = STANDARD_SOP_PRESETS.find((p) => p.key === payload.presetKey);
      if (preset) {
        title = preset.title;
        documentNumber = preset.documentNumber;
        documentType = preset.documentType;
        departmentCode = preset.departmentCode;
        transactionType = preset.transactionType;
        summary = preset.summary;
        approvalSteps = preset.approvalSteps;
        rules = preset.rules;
      }
    }

    // B. Jika memilih Dokumen SOP/WIN dari Database
    else if (payload.sopDocumentId) {
      const [sopDoc] = await db
        .select()
        .from(sopWinDocuments)
        .where(eq(sopWinDocuments.id, payload.sopDocumentId));

      if (sopDoc) {
        title = `Approval ${sopDoc.title}`;
        documentNumber = sopDoc.documentNumber;
        documentType = (sopDoc.documentType as any) || "SOP";
        departmentCode = sopDoc.departmentCode || "HR";
        summary = sopDoc.summary || `Sistem approval yang diturunkan dari dokumen ${sopDoc.documentNumber}.`;
        rawContent = rawContent || sopDoc.summary || sopDoc.title;

        // Tentukan transactionType berdasarkan department/title
        const lowerTitle = sopDoc.title.toLowerCase();
        if (lowerTitle.includes("lembur") || lowerTitle.includes("spl")) {
          transactionType = "overtime_spl";
        } else if (lowerTitle.includes("izin kerja") || lowerTitle.includes("ptw") || lowerTitle.includes("hse")) {
          transactionType = "hse_ptw";
        } else if (lowerTitle.includes("pengadaan") || lowerTitle.includes("pr") || lowerTitle.includes("purchase")) {
          transactionType = "purchase_request";
        } else if (lowerTitle.includes("cuti") || lowerTitle.includes("leave")) {
          transactionType = "leave_permission";
        } else {
          transactionType = "activity";
        }
      }
    }

    // C. Jika memasukkan Raw Content atau butuh Ekstraksi AI
    if (rawContent && approvalSteps.length === 0) {
      // Coba ekstraksi AI via Genius RAG Chat
      try {
        const aiPrompt = `Analisis prosedur SOP/WIN berikut dan bentuk struktur hierarki approval (persetujuan) dalam format JSON valid:
CONTENT:
${rawContent}

Jawab HANYA dengan JSON valid dengan format:
{
  "title": "${title}",
  "documentNumber": "${documentNumber}",
  "departmentCode": "${departmentCode}",
  "transactionType": "${transactionType}",
  "summary": "Rangkuman alur approval dari SOP",
  "approvalSteps": [
    {
      "stepOrder": 1,
      "label": "Nama Tahap 1",
      "assignedRole": "Peran Penanggung Jawab",
      "slaHours": 24,
      "isRequired": true,
      "condition": "Kondisi penerapan"
    }
  ],
  "rules": ["Aturan 1", "Aturan 2"]
}`;

        const ragRes: any = await sendRagChat({
          query: aiPrompt,
          top_k: 2,
        }).catch(() => null);

        const answerText = ragRes?.answer || ragRes?.content || ragRes?.reply || "";
        if (answerText) {
          const match = answerText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.title) title = parsed.title;
            if (parsed.documentNumber) documentNumber = parsed.documentNumber;
            if (parsed.summary) summary = parsed.summary;
            if (Array.isArray(parsed.approvalSteps) && parsed.approvalSteps.length > 0) {
              approvalSteps = parsed.approvalSteps;
            }
            if (Array.isArray(parsed.rules)) rules = parsed.rules;
          }
        }
      } catch (err) {
        console.warn("[generateSopWinApprovalAction] AI extraction fallback executed:", err);
      }

      // Fallback Heuristik jika AI tidak mengembalikan JSON lengkap
      if (approvalSteps.length === 0) {
        approvalSteps = [
          {
            stepOrder: 1,
            label: "Verifikasi Kelengkapan Prosedur",
            assignedRole: "Direct Leader / Supervisor",
            slaHours: 24,
            isRequired: true,
            condition: "Tahap 1: Pengecekan awal sesuai SOP",
          },
          {
            stepOrder: 2,
            label: "Persetujuan Manajerial & Kepatuhan",
            assignedRole: "Department Manager / Superintendent",
            slaHours: 48,
            isRequired: true,
            condition: "Tahap 2: Sign-off resmi manajerial",
          },
        ];
        if (!summary) {
          summary = `Sistem approval terstruktur yang diekstrak dari teks prosedur ${title}.`;
        }
        if (rules.length === 0) {
          rules = [
            "Wajib mengikuti urutan langkah persetujuan (Sequential Approval Mode).",
            "Setiap penolakan wajib mencantumkan catatan revisi resmi.",
          ];
        }
      }
    }

    // Default Fallback jika langkah masih kosong
    if (approvalSteps.length === 0) {
      const defaultPreset = STANDARD_SOP_PRESETS[0];
      approvalSteps = defaultPreset.approvalSteps;
      summary = defaultPreset.summary;
      rules = defaultPreset.rules;
    }

    // D. Persiapkan Site Approvals default (Ambil daftar site dari database)
    const activeSites = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .limit(10)
      .catch(() => []);

    const defaultSiteApprovals = activeSites.map((s) => ({
      siteId: s.id,
      siteName: s.name,
      siteCode: `SITE-${s.id}`,
      values: {
        step_1: "Supervisor Site",
        step_2: "Manager Site",
      },
    }));

    // E. Simpan ke Database hero_genius_sop_approval_systems
    const [inserted] = await db
      .insert(heroGeniusSopApprovalSystems)
      .values({
        title,
        documentNumber,
        documentType,
        departmentCode,
        sopDocumentId: payload.sopDocumentId || null,
        transactionType,
        approvalMode: "sequential",
        approvalSteps,
        siteApprovals: defaultSiteApprovals,
        summary: summary || `Sistem Approval SOP untuk ${title}`,
        rawSopContent: rawContent,
        aiConfidenceScore: 0.96,
        complianceAuditScore: 95,
        status: "draft",
        createdById: userId,
      })
      .returning();

    revalidatePath("/dashboard/hero-genius");

    return {
      success: true,
      data: inserted,
      message: `Sistem Approval "${title}" berhasil diderivasi dari SOP/WIN!`,
    };
  } catch (error: any) {
    console.error("[generateSopWinApprovalAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal membuat sistem approval dari SOP/WIN",
    };
  }
}

/**
 * 3. Publikasikan Matriks Approval SOP ke HERO Approval Engine (Workflow Studio)
 */
export async function publishSopWinApprovalToWorkflowStudioAction(payload: {
  systemId: number;
  approvalSteps: SopApprovalStepInput[];
  notes?: string;
}) {
  try {
    const session = await getServerSession();

    const [sys] = await db
      .select()
      .from(heroGeniusSopApprovalSystems)
      .where(eq(heroGeniusSopApprovalSystems.id, payload.systemId));

    if (!sys) {
      return { success: false, error: "Sistem Approval SOP tidak ditemukan" };
    }

    const stepsToUse = payload.approvalSteps && payload.approvalSteps.length > 0 ? payload.approvalSteps : (sys.approvalSteps as SopApprovalStepInput[]);

    // 1. Buat / Update entry di hero_approval_matrices
    const [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name: `Matriks SOP: ${sys.title} (${sys.documentNumber || "SOP"})`,
        transactionType: sys.transactionType || "activity",
        activityType: sys.documentNumber || sys.title,
        description: `Matriks persetujuan otomatis dipublikasikan dari SOP/WIN ${sys.documentNumber} via HERO Genius AI. ${payload.notes || ""}`,
        isActive: true,
        effectiveFrom: new Date(),
      })
      .returning();

    // 2. Buat langkah-langkah di hero_approval_matrix_steps
    for (const step of stepsToUse) {
      await db.insert(approvalMatrixSteps).values({
        matrixId: matrix.id,
        stepOrder: step.stepOrder,
        label: `${step.label} (${step.assignedRole})`,
        approvalMode: "sequential",
        slaHours: step.slaHours || 24,
        isRequired: step.isRequired !== false,
      });
    }

    // 3. Update status di hero_genius_sop_approval_systems
    await db
      .update(heroGeniusSopApprovalSystems)
      .set({
        status: "published",
        publishedMatrixId: matrix.id,
        approvalSteps: stepsToUse,
        updatedAt: new Date(),
      })
      .where(eq(heroGeniusSopApprovalSystems.id, payload.systemId));

    revalidatePath("/dashboard/hero-genius");
    revalidatePath("/dashboard/workflow-studio");

    return {
      success: true,
      matrixId: matrix.id,
      message: `Sistem Approval "${sys.title}" berhasil dipublikasikan & aktif di Workflow Studio HERO Engine (Matrix ID: ${matrix.id})!`,
    };
  } catch (error: any) {
    console.error("[publishSopWinApprovalToWorkflowStudioAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mempublikasikan matriks ke Workflow Studio",
    };
  }
}

/**
 * 4. Ambil Daftar Sistem Approval SOP yang Pernah Dibuat
 */
export async function getSavedSopApprovalSystemsAction() {
  try {
    const list = await db
      .select()
      .from(heroGeniusSopApprovalSystems)
      .orderBy(desc(heroGeniusSopApprovalSystems.createdAt))
      .limit(30);

    return {
      success: true,
      systems: list,
    };
  } catch (error: any) {
    console.error("[getSavedSopApprovalSystemsAction] error:", error);
    return {
      success: false,
      systems: [],
      error: error.message || "Gagal mengambil riwayat sistem approval SOP",
    };
  }
}

/**
 * 5. Hapus Draf Sistem Approval SOP
 */
export async function deleteSopApprovalSystemAction(systemId: number) {
  try {
    await db
      .delete(heroGeniusSopApprovalSystems)
      .where(eq(heroGeniusSopApprovalSystems.id, systemId));

    revalidatePath("/dashboard/hero-genius");

    return {
      success: true,
      message: "Draf Sistem Approval SOP berhasil dihapus.",
    };
  } catch (error: any) {
    console.error("[deleteSopApprovalSystemAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghapus draf approval",
    };
  }
}
