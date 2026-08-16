import { AdminPageShell } from "@/components/admin-page-shell";
import { IzinKerjaPtwWorkspace, type HiradcPtwSource } from "@/components/izin-kerja-ptw-workspace";
import { getSecurityUsersData } from "@/lib/hero-admin";
import { getHiradcData } from "@/lib/hiradc/queries";
import { getCurrentMenuPermission } from "@/lib/hero-access";

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactLines(values: string[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(/\r?\n/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).join("\n");
}

function getHighestRisk(values: string[]) {
  const order = ["LOW", "MODERATE", "MEDIUM", "HIGH", "EXTREME"];
  return values.reduce((highest, value) => {
    const normalized = value.trim().toUpperCase();
    return order.indexOf(normalized) > order.indexOf(highest) ? normalized : highest;
  }, "LOW");
}

export default async function IzinKerjaPtwPage() {
  const [users, hiradcData, permission] = await Promise.all([
    getSecurityUsersData(),
    getHiradcData(),
    getCurrentMenuPermission("hse_izin_kerja_ptw"),
  ]);

  const groupedSources = new Map<string, typeof hiradcData.entries>();
  for (const entry of hiradcData.entries) {
    const displayLabel = `${cleanLabel(entry.activityName || "HIRADC Activity")} • ${cleanLabel(entry.department || entry.location || "Workshop")}`;
    const key = displayLabel.toLowerCase();
    groupedSources.set(key, [...(groupedSources.get(key) ?? []), entry]);
  }

  const hiradcSources: HiradcPtwSource[] = Array.from(groupedSources.values()).map((entries) => {
    const first = entries[0];
    const riskBefore = getHighestRisk(entries.map((entry) => entry.riskLevelBefore));
    const riskAfter = getHighestRisk(entries.map((entry) => entry.riskLevelAfter));

    return {
      id: first.id,
      label: `${cleanLabel(first.activityName || "HIRADC Activity")} • ${cleanLabel(first.department || first.location || "Workshop")}`,
      activityName: first.activityName,
      department: first.department,
      location: first.location,
      equipment: compactLines(entries.map((entry) => entry.equipment)),
      hazardCategory: compactLines(entries.map((entry) => entry.hazardCategory)),
      hazardDetails: compactLines(entries.map((entry) => entry.hazardDetails)),
      riskConsequence: compactLines(entries.map((entry) => entry.riskConsequence)),
      existingControl: compactLines(entries.map((entry) => entry.existingControl)),
      additionalControl: compactLines(entries.map((entry) => entry.additionalControl)),
      riskLevelBefore: riskBefore,
      riskLevelAfter: riskAfter,
    };
  });

  return (
    <AdminPageShell
      eyebrow="HSE • Permit Control"
      title="Izin Kerja PTW"
      description="Kontrol Permit to Work untuk pekerjaan berisiko, approval lapangan, verifikasi HSE, dan dokumen siap cetak PDF."
      badge="Permit to Work"
    >
      <IzinKerjaPtwWorkspace
        users={users}
        hiradcSources={hiradcSources}
        canEdit={permission.canEdit}
        canDelete={permission.canDelete}
      />
    </AdminPageShell>
  );
}