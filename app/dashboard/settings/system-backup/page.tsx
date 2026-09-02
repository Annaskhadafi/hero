import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { SystemBackupWorkspace } from "@/components/system-backup-workspace";
import {
  getDatabaseBackupEnvStatus,
  listDatabaseBackups,
} from "@/lib/database-backup";
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission } from "@/lib/hero-access";
import { getServerSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const RESOURCE = "settings_system_backup";

export default async function SystemBackupPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  const roleName = await getCurrentEmployeeAccessRole();
  const isAdminOrSuper = ["super_admin", "developer", "admin", "superadmin"].includes(roleName.toLowerCase());
  const permission = await getCurrentMenuPermission(RESOURCE);

  const canView = permission.canView || isAdminOrSuper;
  const canBackup = permission.canEdit || isAdminOrSuper;
  const canRestore = permission.canDelete || isAdminOrSuper;

  if (!canView) {
    return (
      <AdminPageShell title="System Backup">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <p className="font-semibold">Akses Terbatas</p>
          <p className="text-sm">Halaman Backup & Restore hanya dapat diakses oleh Administrator.</p>
        </div>
      </AdminPageShell>
    );
  }

  const envStatus = await getDatabaseBackupEnvStatus();
  let backups: Awaited<ReturnType<typeof listDatabaseBackups>> = [];
  let listError = "";

  try {
    backups = await listDatabaseBackups(50);
  } catch (error) {
    listError = error instanceof Error ? error.message : "Gagal membaca daftar backup S3.";
  }

  return (
    <AdminPageShell title="System Backup">
      <SystemBackupWorkspace
        backups={backups}
        envStatus={envStatus}
        listError={listError}
        canBackup={canBackup}
        canRestore={canRestore}
      />
    </AdminPageShell>
  );
}
