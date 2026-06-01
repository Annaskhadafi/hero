import { AdminPageShell } from "@/components/admin-page-shell";
import { getSecurityUsersData } from "@/lib/hero-admin";
import { IzinKerjaPtwWorkspace } from "@/components/izin-kerja-ptw-workspace";

export default async function IzinKerjaPtwPage() {
  const users = await getSecurityUsersData();

  return (
    <AdminPageShell
      eyebrow="HSE • Permit Control"
      title="Izin Kerja PTW"
      description="Kontrol Permit to Work untuk pekerjaan berisiko, approval lapangan, verifikasi HSE, dan dokumen siap cetak PDF."
      badge="Permit to Work"
    >
      <IzinKerjaPtwWorkspace users={users} />
    </AdminPageShell>
  );
}
