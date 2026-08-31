import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals } from "../db/schema/hero";
import { eq, asc } from "drizzle-orm";

const PRESET_DEPARTMENT_WORKFLOWS: Record<string, Array<{ stepOrder: number; stepLabel: string; approverRole: string; approverName: string; approverEmail: string }>> = {
  HSE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HSE Coordinator", approverName: "Andi Safari", approverEmail: "andi.safari@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "Management Representative HSE", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  TECHNICAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "abian.husain@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  TECH: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "abian.husain@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  HR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HR-GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "muhammad.iqbal@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  GA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "muhammad.iqbal@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan HC & GA Manager", approverRole: "HC Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  CPI: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "CPI & IA Reps. Manager", approverName: "Bardinia Susi E", approverEmail: "bardynia.susi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "General Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  LEGAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal Supervisor", approverName: "Septi Dian Rahmawati", approverEmail: "dian.rahmawati@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Head of Legal & ERM", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "stupa.gumilang@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  ERM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "stupa.gumilang@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  "SC LOG": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Supply Chain Management Manager", approverName: "Bekti Widyasmoro", approverEmail: "bekti.widyasmoro@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan PIC", approverRole: "PIC Supply Chain", approverName: "Ali Rahman", approverEmail: "ali.rahman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  SERVICE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Service Operation SPV", approverName: "Apriyanto", approverEmail: "apriyanto.lastam@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Central Services Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  REPAIR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "ary.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  RETREAD: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "ary.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  "REPAIR & RETREAD": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "ary.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  CWS: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Wellness Corporate Specialist SPV", approverName: "Tirta Risdianto", approverEmail: "tirta.risdianto@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  OSM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Office Strategic Management SPV", approverName: "Asep Firdaus", approverEmail: "asep.firdaus@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  FAM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "didik.wahyudi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Support Facility Management Manager", approverName: "Susanto", approverEmail: "santo.susanto@chitraparatama.co.id" },
  ],
  BIMA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Business Innovation & Marketing SPV", approverName: "Arif Maulana Gahfar", approverEmail: "arif.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Finance & Business Partner Manager", approverName: "Febrian Dani", approverEmail: "febrian.dani@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  "SC EXIM": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "didik.wahyudi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  TC: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Training Centre Coordinator", approverName: "Ridho Akmal Sholeh", approverEmail: "ridho.akmalsaleh@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
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
