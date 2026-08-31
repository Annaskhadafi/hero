import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { SystemBackupWorkspace } from "@/components/system-backup-workspace";
import {
  getDatabaseBackupEnvStatus,
  listDatabaseBackups,
} from "@/lib/database-backup";
import { getCurrentMenuPermission } from "@/lib/hero-access";

export const dynamic = "force-dynamic";

const RESOURCE = "settings_system_backup";

export default async function SystemBackupPage() {
  const permission = await getCurrentMenuPermission(RESOURCE);
  if (!permission.canView) redirect("/dashboard");

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
        canBackup={permission.canEdit}
        canRestore={permission.canDelete}
      />
    </AdminPageShell>
  );
}
