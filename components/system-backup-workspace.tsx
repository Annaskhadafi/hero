"use client";

import { useActionState, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Cloud,
  DatabaseBackup,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  runSystemDatabaseBackupAction,
  restoreSystemDatabaseBackupAction,
  saveBackupRetentionAction,
  cleanOldDatabaseBackupsAction,
  type SystemBackupActionState,
} from "@/app/dashboard/settings/system-backup/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const INITIAL_SYSTEM_BACKUP_ACTION_STATE: SystemBackupActionState = {
  status: "idle",
  message: "",
};

const PRESET_MONTHS = [1, 2, 3, 6, 12, 0];

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
    retentionMonths?: number;
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
  const [retentionState, retentionAction, retentionPending] = useActionState(
    saveBackupRetentionAction,
    INITIAL_SYSTEM_BACKUP_ACTION_STATE,
  );
  const [cleanState, cleanAction, cleanPending] = useActionState(
    cleanOldDatabaseBackupsAction,
    INITIAL_SYSTEM_BACKUP_ACTION_STATE,
  );

  const initialMonths = envStatus.retentionMonths ?? 3;
  const [customMonths, setCustomMonths] = useState<number>(initialMonths);

  const envReady =
    envStatus.s3BucketConfigured &&
    envStatus.s3RegionConfigured &&
    envStatus.s3CredentialsConfigured &&
    envStatus.databaseUrlConfigured &&
    envStatus.pgDumpConfigured;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatusCard label="Database" ok={envStatus.databaseUrlConfigured} value={envStatus.databaseUrlConfigured ? "Connected" : "Missing"} />
        <StatusCard label="S3 Storage" ok={envStatus.s3BucketConfigured && envStatus.s3RegionConfigured && envStatus.s3CredentialsConfigured} value={envStatus.s3EndpointConfigured ? "Custom endpoint" : "AWS endpoint"} />
        <StatusCard label="Backup Tool" ok={envStatus.pgDumpConfigured} value={envStatus.pgDumpConfigured ? "pg_dump ready" : "Set PG_DUMP_BIN"} />
        <StatusCard label="Restore Tool" ok={envStatus.psqlConfigured} value={envStatus.psqlConfigured ? "psql ready" : "Set PSQL_BIN"} />
        <StatusCard
          label="Retensi Otomatis"
          ok={true}
          value={initialMonths > 0 ? `Maks. ${initialMonths} Bulan` : "Simpan Selamanya"}
        />
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

      {/* Retention Policy & Auto-Clean Card */}
      <Card className="rounded-lg p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-amber-600" />
              <div>
                <h2 className="font-display text-lg font-semibold">Kebijakan Retensi & Pembersihan Otomatis (Auto-Clean)</h2>
                <p className="text-xs text-muted-foreground">
                  Hapus otomatis file backup lama di S3 dan penyimpanan lokal untuk menghemat kuota ruang server.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit gap-1 px-2.5 py-1 text-xs">
              <Clock className="size-3.5 text-primary" />
              Aktif: {initialMonths > 0 ? `${initialMonths} Bulan` : "Tanpa Batas"}
            </Badge>
          </div>

          <div className="rounded-md border bg-slate-50/60 p-3.5 text-sm dark:bg-slate-900/40">
            <form action={retentionAction} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="retentionMonths" className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Batas Maksimal Usia Backup (Bulan)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="retentionMonths"
                      name="retentionMonths"
                      type="number"
                      min={0}
                      max={120}
                      value={customMonths}
                      onChange={(e) => setCustomMonths(parseInt(e.target.value, 10) || 0)}
                      disabled={!canBackup || retentionPending}
                      className="h-9 w-32 bg-white font-mono text-sm dark:bg-slate-950"
                    />
                    <span className="text-xs text-muted-foreground">
                      {customMonths === 0 ? "Bulan (0 = Simpan Selamanya)" : "Bulan"}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!canBackup || retentionPending}
                  className="h-9 gap-1.5"
                >
                  {retentionPending ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Simpan Kebijakan
                </Button>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1">Preset cepat:</span>
                {PRESET_MONTHS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setCustomMonths(months)}
                    className={`rounded-md border px-2.5 py-0.5 text-xs font-medium transition ${
                      customMonths === months
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    }`}
                  >
                    {months === 0 ? "Semua (0 bln)" : `${months} Bulan`}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Setiap kali daily cron berjalan di Dokploy, backup yang melebihi batas bulan di atas akan otomatis dibersihkan.
                (Sistem selalu menyisakan minimal 1 backup terbaru sebagai cadangan darurat).
              </p>

              <form action={cleanAction}>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={!canBackup || cleanPending || initialMonths === 0}
                  className="h-8 gap-1.5 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  {cleanPending ? <RefreshCw className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Bersihkan Backup Lama Sekarang
                </Button>
              </form>
            </div>
          </div>

          {retentionState.message ? (
            <ActionMessage status={retentionState.status} message={retentionState.message} />
          ) : null}
          {cleanState.message ? (
            <ActionMessage status={cleanState.status} message={cleanState.message} />
          ) : null}
        </div>
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
