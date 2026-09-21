import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, asc } from "drizzle-orm";

const PRESET_DEPARTMENT_WORKFLOWS: Record<string, Array<{ stepOrder: number; stepLabel: string; approverRole: string; approverName: string; approverEmail: string }>> = {
  HSE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HSE Coordinator", approverName: "Andi Safari", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "Management Representative HSE", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  TECHNICAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  TECH: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  HR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HR-GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  GA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan HC & GA Manager", approverRole: "HC Manager", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  CPI: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "CPI & IA Reps. Manager", approverName: "Bardinia Susi E", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "General Manager", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  LEGAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal Supervisor", approverName: "Septi Dian Rahmawati", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Head of Legal & ERM", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  ERM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  "SC LOG": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Supply Chain Management Manager", approverName: "Bekti Widyasmoro", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan PIC", approverRole: "PIC Supply Chain", approverName: "Ali Rahman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  SERVICE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Service Operation SPV", approverName: "Apriyanto", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Central Services Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
  ],
  REPAIR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
  ],
  RETREAD: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
  ],
  "REPAIR & RETREAD": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "raihanaraya36@gmail.com" },
  ],
  CWS: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Wellness Corporate Specialist SPV", approverName: "Tirta Risdianto", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  OSM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Office Strategic Management SPV", approverName: "Asep Firdaus", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  FAM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Support Facility Management Manager", approverName: "Susanto", approverEmail: "raihanaraya36@gmail.com" },
  ],
  BIMA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Business Innovation & Marketing SPV", approverName: "Arif Maulana Gahfar", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Finance & Business Partner Manager", approverName: "Febrian Dani", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  "SC EXIM": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
  TC: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Training Centre Coordinator", approverName: "Ridho Akmal Sholeh", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "raihanaraya36@gmail.com" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "raihanaraya36@gmail.com" },
  ],
};

async function resyncAllMatrices() {
  const reqs = await db.select().from(sopWinRequests);
  console.log(`Resyncing ${reqs.length} SOP/WIN requests in DB against canonical matrix...`);

  let updatedCount = 0;

  for (const r of reqs) {
    const deptCode = (r.requesterDepartment || "").trim().toUpperCase();
    const matrix = PRESET_DEPARTMENT_WORKFLOWS[deptCode];
    if (!matrix) continue;

    const steps = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, r.id))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    for (const stepConfig of matrix) {
      const existingStep = steps.find((s) => s.stepOrder === stepConfig.stepOrder);
      if (existingStep) {
        if (
          existingStep.approverEmail !== stepConfig.approverEmail ||
          existingStep.approverName !== stepConfig.approverName ||
          existingStep.stepLabel !== stepConfig.stepLabel
        ) {
          console.log(`[RESYNC] REQ #${r.id} (${r.requestNumber}) Dept: ${deptCode} Step ${stepConfig.stepOrder} updated -> Name: ${stepConfig.approverName}, Email: ${stepConfig.approverEmail}`);
          await db
            .update(sopWinRequestApprovals)
            .set({
              approverName: stepConfig.approverName,
              approverEmail: stepConfig.approverEmail,
              stepLabel: stepConfig.stepLabel,
            })
            .where(eq(sopWinRequestApprovals.id, existingStep.id));
          updatedCount++;
        }
      }
    }
  }

  console.log(`Resync completed. ${updatedCount} approval step records corrected to exact canonical emails.`);
}

resyncAllMatrices().catch(console.error);
