import { db } from "@/db";
import { heroHseOsmSessions, heroHseOsmFindings } from "@/db/schema/hse-osm";
import { eq, and, isNull } from "drizzle-orm";
import { sendWorkflowEmail } from "@/lib/workflow-email";
import { getPublicAppUrl } from "@/lib/auth-config";
import type { HseOsmRiskLevel } from "@/lib/hse-osm-constants";

// 1. PIC Area per Lokasi / Site (Slide 9)
export interface OsmPicAreaConfig {
  id: string;
  locationPattern: string[]; // Match keywords in locationArea or siteName
  picName: string;
  picEmail: string;
}

export const HSE_OSM_PIC_AREAS: OsmPicAreaConfig[] = [
  {
    id: "A-01",
    locationPattern: ["ck bib grb", "bib grb", "grb"],
    picName: "Fathurrahman Sufi",
    picEmail: "fathurrahman.sufi@chitraparatama.co.id",
  },
  {
    id: "A-02",
    locationPattern: ["ck bib kgb", "bib kgb", "kgb"],
    picName: "Irfan Rifai Remba",
    picEmail: "irfan.rifai@chitraparatama.co.id",
  },
  {
    id: "A-03",
    locationPattern: ["ck bmb", "bmb"],
    picName: "Danny Hangga Irawan",
    picEmail: "danny.hangga@chitraparatama.co.id",
  },
  {
    id: "A-04",
    locationPattern: ["ck mhu", "mhu"],
    picName: "Ade Saharu",
    picEmail: "ade.saharu@chitraparatama.co.id",
  },
  {
    id: "A-05",
    locationPattern: ["ck kim", "kim"],
    picName: "Rizky Rahmadani",
    picEmail: "rizky.r@chitraparatama.co.id",
  },
  {
    id: "A-06",
    locationPattern: ["vale", "sorowako"],
    picName: "M. Wahyu Ichsan",
    picEmail: "muhammad.w.ichsan@chitraparatama.co.id",
  },
  {
    id: "A-07",
    locationPattern: ["kpc", "sangatta", "kabo", "sangatta kpc", "sangatta kabo"],
    picName: "Saipudin",
    picEmail: "saipudin@chitraparatama.co.id",
  },
  {
    id: "A-08",
    locationPattern: ["balikpapan", "balikpapan external", "bpp"],
    picName: "Andi Safari",
    picEmail: "andi.safari@chitraparatama.co.id",
  },
  {
    id: "A-09",
    locationPattern: ["buma adaro", "adaro", "tj. adaro", "buma tanjung"],
    picName: "Ade Fazri",
    picEmail: "ade.fazri@chitraparatama.co.id",
  },
  {
    id: "A-10",
    locationPattern: ["sis adaro", "sis"],
    picName: "Ilham",
    picEmail: "ilham@chitraparatama.co.id",
  },
];

// 2. Daftar Penerima Khusus Berdasarkan Role / Departemen (Slide 10 & 11)
export const HSE_OSM_ROLE_EMAILS = {
  hseLeader: "saipudin@chitraparatama.co.id",
  hseCoor: "andi.safari@chitraparatama.co.id",
  adminHse: "hse.cp@chitraparatama.co.id",
  hcSpv: "muhammad.iqbal@chitraparatama.co.id",
  managerMr: "rendra.rachman@chitraparatama.co.id",
  managerOps: "romy.hidayat@chitraparatama.co.id",
  gm: "dedy.sutrisno@chitraparatama.co.id",
  spvOps: [
    "apriyanto.lastam@chitraparatama.co.id",
    "junaidi.syamsudin@chitraparatama.co.id",
    "rendi.asmari@chitraparatama.co.id",
    "abian.husain@chitraparatama.co.id",
    "ary.maulana@chitraparatama.co.id",
    "renaldo@chitraparatama.co.id",
  ],
  pjoList: {
    ckBib: ["abdul.ajis@chitraparatama.co.id", "ahmat.zulfi@chitraparatama.co.id"],
    ckKim: ["jaya.kusuma@chitraparatama.co.id"],
    ckBmb: ["catur.keswanto@chitraparatama.co.id"],
    kpc: ["muhammad.laisa@chitraparatama.co.id"],
    ckMhu: ["andiibrahim@chitraparatama.co.id"],
    adaro: ["tommy.indra@chitraparatama.co.id"],
    vale: ["andika.septiadi@chitraparatama.co.id"],
  },
};

// 3. Helper resolve PIC Area berdasarkan nama area / site
export function resolvePicArea(locationArea: string): { picName: string; picEmail: string; areaId: string } {
  const normalized = (locationArea || "").toLowerCase().trim();
  for (const item of HSE_OSM_PIC_AREAS) {
    if (item.locationPattern.some((pat) => normalized.includes(pat))) {
      return { picName: item.picName, picEmail: item.picEmail, areaId: item.id };
    }
  }
  // Default fallback ke HSE Leader / KPC
  return {
    picName: "Saipudin",
    picEmail: HSE_OSM_ROLE_EMAILS.hseLeader,
    areaId: "A-07",
  };
}

// 4. Helper resolve PJO berdasarkan lokasi / site
export function resolvePjoEmails(locationArea: string): string[] {
  const norm = (locationArea || "").toLowerCase();
  if (norm.includes("bib")) return HSE_OSM_ROLE_EMAILS.pjoList.ckBib;
  if (norm.includes("kim")) return HSE_OSM_ROLE_EMAILS.pjoList.ckKim;
  if (norm.includes("bmb")) return HSE_OSM_ROLE_EMAILS.pjoList.ckBmb;
  if (norm.includes("kpc") || norm.includes("kabo") || norm.includes("sangatta")) return HSE_OSM_ROLE_EMAILS.pjoList.kpc;
  if (norm.includes("mhu")) return HSE_OSM_ROLE_EMAILS.pjoList.ckMhu;
  if (norm.includes("adaro") || norm.includes("buma") || norm.includes("sis")) return HSE_OSM_ROLE_EMAILS.pjoList.adaro;
  if (norm.includes("vale") || norm.includes("sorowako")) return HSE_OSM_ROLE_EMAILS.pjoList.vale;
  return [HSE_OSM_ROLE_EMAILS.hseLeader];
}

// 5. Target SLA dan Matrix Penerima per Tingkat Risiko (Slide 8)
export interface RiskEmailMatrix {
  slaText: string;
  slaDays: number;
  to: string[];
  cc: string[];
}

export function getRiskEmailMatrix(riskLevel: HseOsmRiskLevel, locationArea: string): RiskEmailMatrix {
  const pic = resolvePicArea(locationArea);
  const pjoEmails = resolvePjoEmails(locationArea);
  const hseLeader = HSE_OSM_ROLE_EMAILS.hseLeader;
  const adminHse = HSE_OSM_ROLE_EMAILS.adminHse;
  const hcSpv = HSE_OSM_ROLE_EMAILS.hcSpv;
  const managerMr = HSE_OSM_ROLE_EMAILS.managerMr;
  const managerOps = HSE_OSM_ROLE_EMAILS.managerOps;
  const gm = HSE_OSM_ROLE_EMAILS.gm;
  const spvOps = HSE_OSM_ROLE_EMAILS.spvOps;

  switch (riskLevel) {
    case "LOW":
      return {
        slaText: "15 Hari",
        slaDays: 15,
        to: [pic.picEmail],
        cc: Array.from(new Set([pic.picEmail, ...pjoEmails, hseLeader, adminHse])).filter((e) => e !== pic.picEmail),
      };
    case "MEDIUM":
      return {
        slaText: "10 Hari",
        slaDays: 10,
        to: [pic.picEmail],
        cc: Array.from(new Set([hseLeader, ...spvOps, hcSpv, ...pjoEmails, adminHse])).filter((e) => e !== pic.picEmail),
      };
    case "HIGH":
      return {
        slaText: "3 Hari",
        slaDays: 3,
        to: Array.from(new Set([pic.picEmail, hseLeader])),
        cc: Array.from(new Set([managerMr, managerOps, ...pjoEmails, adminHse])),
      };
    case "CRITICAL":
      return {
        slaText: "Segera (Stop Kerja) dan lakukan tindakan segera",
        slaDays: 0,
        to: Array.from(new Set([pic.picEmail, hseLeader])),
        cc: Array.from(new Set([gm, managerMr, managerOps, ...pjoEmails, adminHse])),
      };
    default:
      return {
        slaText: "10 Hari",
        slaDays: 10,
        to: [pic.picEmail],
        cc: [hseLeader],
      };
  }
}

// 6. Fungsi pengirim notifikasi email temuan inspeksi (Slide 7 & 8)
export async function sendHseOsmFindingNotifications(sessionId: number): Promise<{
  success: boolean;
  sentCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sentCount = 0;

  try {
    const [session] = await db
      .select()
      .from(heroHseOsmSessions)
      .where(and(eq(heroHseOsmSessions.id, sessionId), isNull(heroHseOsmSessions.deletedAt)))
      .limit(1);

    if (!session) {
      return { success: false, sentCount: 0, errors: ["Sesi OSM tidak ditemukan."] };
    }

    const findings = await db
      .select()
      .from(heroHseOsmFindings)
      .where(and(eq(heroHseOsmFindings.sessionId, sessionId), isNull(heroHseOsmFindings.deletedAt)));

    if (findings.length === 0) {
      return { success: true, sentCount: 0, errors: [] };
    }

    const appUrl = getPublicAppUrl();
    const picInfo = resolvePicArea(session.locationArea);

    for (const finding of findings) {
      // Hanya kirim notifikasi jika temuan berstatus OPEN / Substandard
      if (finding.status !== "OPEN") continue;

      const riskMatrix = getRiskEmailMatrix(finding.riskLevel as HseOsmRiskLevel, session.locationArea);
      const viewUrl = `${appUrl}/mobile/hse/osm`;

      const subject = `[OSM INSPEKSI ${finding.riskLevel}] Temuan #${finding.findingNumber} di ${session.locationArea} (SLA: ${riskMatrix.slaText})`;

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
            <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8;">HERO • HSES Application</p>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">Notifikasi Temuan On the Spot Monitoring (OSM)</h1>
          </div>
          
          <div style="padding: 24px; color: #1e293b;">
            <div style="background: #f8fafc; border-left: 4px solid ${
              finding.riskLevel === 'CRITICAL' ? '#dc2626' : finding.riskLevel === 'HIGH' ? '#ea580c' : finding.riskLevel === 'MEDIUM' ? '#d97706' : '#2563eb'
            }; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
              <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; background: ${
                finding.riskLevel === 'CRITICAL' ? '#fee2e2; color: #991b1b' : finding.riskLevel === 'HIGH' ? '#ffedd5; color: #9a3412' : finding.riskLevel === 'MEDIUM' ? '#fef3c7; color: #92400e' : '#dbeafe; color: #1e40af'
              };">Tingkat Risiko: ${finding.riskLevel}</span>
              <p style="margin: 8px 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Target SLA Perbaikan: <span style="color: #dc2626;">${riskMatrix.slaText}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px;">No. Sesi OSM</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${session.sessionNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">No. Tiket Temuan</td>
                <td style="padding: 6px 0; font-weight: 700; color: #2563eb;">${finding.findingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Lokasi / Area</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${session.locationArea} ${session.locationDetail ? `(${session.locationDetail})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">PIC Area Terpilih</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${picInfo.picName} (${picInfo.areaId})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Leader Inspeksi</td>
                <td style="padding: 6px 0; color: #0f172a;">${session.leadEmployeeName} (${session.leadBadgeNumber})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Fokus Monitoring</td>
                <td style="padding: 6px 0; color: #0f172a;">${session.focusItemName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Klasifikasi Temuan</td>
                <td style="padding: 6px 0; color: #0f172a;">${finding.classificationName}</td>
              </tr>
            </table>

            <div style="background: #f1f5f9; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">Uraian / Deskripsi Temuan Lapangan:</p>
              <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${finding.description}</p>
              ${finding.actionRequired ? `<p style="margin: 10px 0 0; font-size: 12px; color: #0369a1; font-weight: 600;">Rekomendasi Tindakan: ${finding.actionRequired}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 28px 0 16px;">
              <a href="${viewUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                Buka & Tindak Lanjuti di HERO Mobile
              </a>
            </div>

            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              Email otomatis dari HERO HSES Mobile App (OSM Inspeksi Versi 2). Harap tindak lanjuti temuan sebelum batas waktu SLA perbaikan berakhir.
            </p>
          </div>
        </div>
      `;

      try {
        await sendWorkflowEmail({
          to: riskMatrix.to,
          cc: riskMatrix.cc,
          exactCc: true,
          fallbackSubject: subject,
          fallbackHtml: htmlContent,
          fallbackText: `Notifikasi Temuan OSM: ${finding.findingNumber}\nLokasi: ${session.locationArea}\nRisiko: ${finding.riskLevel}\nTarget SLA: ${riskMatrix.slaText}\nDeskripsi: ${finding.description}\nLink: ${viewUrl}`,
        });
        sentCount++;
      } catch (err: any) {
        console.warn(`[sendHseOsmFindingNotifications] Gagal mengirim email untuk tiket ${finding.findingNumber}:`, err);
        errors.push(err?.message || "Gagal mengirim email");
      }
    }

    return { success: true, sentCount, errors };
  } catch (err: any) {
    console.error("[sendHseOsmFindingNotifications] Exception:", err);
    return { success: false, sentCount, errors: [err?.message || "Unknown error"] };
  }
}
