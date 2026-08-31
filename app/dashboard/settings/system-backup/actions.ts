"use server";

import { revalidatePath } from "next/cache";
import { createDatabaseBackup, restoreDatabaseBackup } from "@/lib/database-backup";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { logAuditEvent } from "@/lib/audit-logger";

const RESOURCE = "settings_system_backup";
const PATH = "/dashboard/settings/system-backup";

export type SystemBackupActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_SYSTEM_BACKUP_ACTION_STATE: SystemBackupActionState = {
  status: "idle",
  message: "",
};

async function assertSystemBackupPermission(action: "view" | "backup" | "restore") {
  const permission = await getCurrentMenuPermission(RESOURCE);
  if (action === "view" && !permission.canView) throw new Error("Akses ditolak.");
  if (action === "backup" && !permission.canEdit) throw new Error("Akses backup ditolak oleh RBAC.");
  if (action === "restore" && !permission.canDelete) throw new Error("Akses restore ditolak oleh RBAC.");
  return permission;
}

export async function runSystemDatabaseBackupAction(
  _state: SystemBackupActionState = INITIAL_SYSTEM_BACKUP_ACTION_STATE,
): Promise<SystemBackupActionState> {
  try {
    await assertSystemBackupPermission("backup");
    const session = await getServerSession();
    const result = await createDatabaseBackup("manual-ui");

    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: "database.backup_created",
      entityType: "database_backup",
      entityLabel: result.key,
      description: `Manual database backup uploaded to S3 (${result.sizeMb} MB).`,
      severity: "info",
    });

    revalidatePath(PATH);
    return { status: "success", message: `Backup berhasil: ${result.key}` };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Backup database gagal.",
    };
  }
}

export async function restoreSystemDatabaseBackupAction(
  _state: SystemBackupActionState = INITIAL_SYSTEM_BACKUP_ACTION_STATE,
  formData: FormData,
): Promise<SystemBackupActionState> {
  try {
    await assertSystemBackupPermission("restore");
    const session = await getServerSession();
    const backupKey = String(formData.get("backupKey") ?? "").trim();
    const confirmation = String(formData.get("confirmation") ?? "").trim();

    if (!backupKey) return { status: "error", message: "Backup key wajib dipilih." };
    if (confirmation !== "RESTORE HERO") {
      return { status: "error", message: "Ketik RESTORE HERO untuk konfirmasi restore." };
    }

    const result = await restoreDatabaseBackup(backupKey, { confirmed: true });

    await logAuditEvent({
      actorEmail: session?.user?.email ?? undefined,
      action: "database.backup_restored",
      entityType: "database_backup",
      entityLabel: backupKey,
      description: `Database restored from ${result.restoredFrom}. A pre-restore backup was created first.`,
      severity: "critical",
    });

    revalidatePath(PATH);
    return { status: "success", message: `Restore berhasil dari ${backupKey}` };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Restore database gagal.",
    };
  }
}
