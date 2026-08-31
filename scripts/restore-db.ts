import { listDatabaseBackups, restoreDatabaseBackup } from "@/lib/database-backup";

async function main() {
  if (process.argv.includes("--list")) {
    const backups = await listDatabaseBackups();
    console.table(backups);
    return;
  }

  const target = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!target) {
    console.error("Pilih backup dulu: npm run db:restore -- --list");
    console.error("Restore: $env:CONFIRM_DB_RESTORE='YES'; npm run db:restore -- <s3-key-atau-file>");
    process.exit(1);
  }

  const result = await restoreDatabaseBackup(target);
  console.log("Restore selesai.");
  console.log(`Source: ${result.restoredFrom}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
