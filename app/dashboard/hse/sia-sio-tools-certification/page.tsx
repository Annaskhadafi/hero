import { AdminPageShell } from "@/components/admin-page-shell";
import { getSecurityUsersData } from "@/lib/hero-admin";
import { SiaSioToolsCertificationWorkspace } from "@/components/sia-sio-tools-certification-workspace";

export default async function SiaSioToolsCertificationPage() {
  const users = await getSecurityUsersData();
  return (
    <AdminPageShell
      eyebrow="HSE • Tire Workshop"
      title="SIA/SIO & Tools Certification"
      description="Kontrol validitas sertifikasi peralatan, izin operator, attachment dokumen, dan reminder expiry untuk Tire Service dan Tire Repair."
      badge="Workshop Tire Mining"
    >
      <SiaSioToolsCertificationWorkspace users={users} />
    </AdminPageShell>
  );
}

