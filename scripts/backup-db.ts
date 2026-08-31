import { createDatabaseBackup, listDatabaseBackups } from "@/lib/database-backup";

async function main() {
  if (process.argv.includes("--list")) {
    const backups = await listDatabaseBackups();
    console.table(backups);
    return;
  }

  const result = await createDatabaseBackup("manual");
  console.log("Backup selesai.");
  console.log(`S3 key: ${result.key}`);
  console.log(`Local file: ${result.localFile}`);
  console.log(`Size: ${result.sizeMb} MB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
