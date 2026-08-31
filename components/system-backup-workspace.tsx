"use client";

import { useActionState } from "react";
import { AlertTriangle, Cloud, DatabaseBackup, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { runSystemDatabaseBackupAction, restoreSystemDatabaseBackupAction, INITIAL_SYSTEM_BACKUP_ACTION_STATE } from "@/app/dashboard/settings/system-backup/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SystemBackupWorkspace({
  backups,
  envStatus,
  listError,
  canBackup,
  canRestore,
}: {
  backups: Array<{ key: string; lastModified: string | null; sizeBytes: number }>;
  envStatus: {
    s3BucketConfigured: boolean;
    s3RegionConfigured: boolean;
    s3EndpointConfigured: boolean;
    s3CredentialsConfigured: boolean;
    databaseUrlConfigured: boolean;
    pgDumpConfigured: boolean;
    psqlConfigured: boolean;
    prefix: string;
    cronPath: string;
  };
  listError: string;
  canBackup: boolean;
  canRestore: boolean;
}) {
  const [backupState, backupAction, backupPending] = useActionState(
    runSystemDatabaseBackupAction,
    INITIAL_SYSTEM_BACKUP_ACTION_STATE,
  );
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreSystemDatabaseBackupAction,
    INITIAL_SYSTEM_BACKUP_ACTION_STATE,
  );
  const envReady = envStatus.s3BucketConfigured && envStatus.s3RegionConfigured && envStatus.s3CredentialsConfigured && envStatus.databaseUrlConfigured && envStatus.pgDumpConfigured;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatusCard label="Database" ok={envStatus.databaseUrlConfigured} value={envStatus.databaseUrlConfigured ? "Connected" : "Missing"} />
        <StatusCard label="S3 Storage" ok={envStatus.s3BucketConfigured && envStatus.s3RegionConfigured && envStatus.s3CredentialsConfigured} value={envStatus.s3EndpointConfigured ? "Custom endpoint" : "AWS endpoint"} />
        <StatusCard label="Backup Tool" ok={envStatus.pgDumpConfigured} value={envStatus.pgDumpConfigured ? "pg_dump ready" : "Set PG_DUMP_BIN"} />
        <StatusCard label="Restore Tool" ok={envStatus.psqlConfigured} value={envStatus.psqlConfigured ? "psql ready" : "Set PSQL_BIN"} />
      </div>

      <Card className="rounded-lg p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DatabaseBackup className="size-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Daily Database Backup</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">S3 prefix: {envStatus.prefix} | Cron: {envStatus.cronPath}</p>
          </div>
          <form action={backupAction}>
            <Button type="submit" disabled={!canBackup || !envReady || backupPending}>
              {backupPending ? <RefreshCw className="size-4 animate-spin" /> : <Cloud className="size-4" />}
              Backup Now
            </Button>
          </form>
        </div>
        {backupState.message ? <ActionMessage status={backupState.status} message={backupState.message} /> : null}
        {!canBackup ? <ActionMessage status="error" message="RBAC: akun ini belum punya izin Edit untuk membuat backup manual." /> : null}
        {listError ? <ActionMessage status="error" message={listError} /> : null}
      </Card>

      <Card className="rounded-lg p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Restore Points</h2>
            <p className="mt-1 text-sm text-muted-foreground">Restore hanya aktif untuk role dengan izin Delete pada resource ini.</p>
          </div>
          <Badge variant="outline">{backups.length} backup</Badge>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="w-[320px]">Restore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Belum ada backup terbaca dari S3.</TableCell></TableRow>
              ) : backups.map((backup) => (
                <TableRow key={backup.key}>
                  <TableCell className="max-w-[520px] truncate font-mono text-xs">{backup.key}</TableCell>
                  <TableCell className="text-sm">{backup.lastModified ? new Date(backup.lastModified).toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-sm">{(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                  <TableCell>
                    <form action={restoreAction} className="flex items-end gap-2">
                      <input type="hidden" name="backupKey" value={backup.key} />
                      <div className="min-w-0 flex-1">
                        <Label className="sr-only" htmlFor={`confirm-${backup.key}`}>Konfirmasi restore</Label>
                        <Input id={`confirm-${backup.key}`} name="confirmation" placeholder="RESTORE HERO" disabled={!canRestore || restorePending} className="h-9" />
                      </div>
                      <Button type="submit" variant="destructive" size="sm" disabled={!canRestore || restorePending}>
                        <RotateCcw className="size-4" />
                        Restore
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {restoreState.message ? <ActionMessage status={restoreState.status} message={restoreState.message} /> : null}
        {!canRestore ? <ActionMessage status="error" message="RBAC: restore disembunyikan/ditolak tanpa izin Delete." /> : null}
      </Card>
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <Card className="rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-display text-lg font-semibold">{value}</p>
        </div>
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? <ShieldCheck className="size-5" /> : <AlertTriangle className="size-5" />}</span>
      </div>
    </Card>
  );
}

function ActionMessage({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) return null;
  return <p className={status === "success" ? "mt-3 text-sm font-medium text-emerald-700" : "mt-3 text-sm font-medium text-amber-700"}>{message}</p>;
}
