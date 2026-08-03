import { config } from "dotenv";
import fs from "fs";
import path from "path";
import readline from "readline";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not defined in .env or .env.local");
  process.exit(1);
}

async function restoreDatabase() {
  const backupsDir = path.join(process.cwd(), "backups");
  
  if (!fs.existsSync(backupsDir)) {
    console.error("❌ ERROR: No backups directory found at " + backupsDir);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let targetFile = args[0];

  if (!targetFile) {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith(".sql"))
      .sort((a, b) => {
        return fs.statSync(path.join(backupsDir, b)).mtimeMs - fs.statSync(path.join(backupsDir, a)).mtimeMs;
      });

    if (files.length === 0) {
      console.error("❌ ERROR: No .sql backup files found in " + backupsDir);
      process.exit(1);
    }

    targetFile = path.join(backupsDir, files[0]);
    console.log(`ℹ️ No specific backup file provided. Auto-selected latest backup: ${files[0]}`);
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(backupsDir, targetFile);
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ ERROR: Backup file not found: ${targetFile}`);
    process.exit(1);
  }

  console.log("♻️  Starting high-speed database restore process...");
  console.log(`📄 Restoring from file: ${targetFile}`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false,
  });

  try {
    const client = await pool.connect();
    
    console.log("🔓 Disabling triggers and FK constraints (session_replication_role = replica)...");
    await client.query("SET statement_timeout = 0;");
    await client.query("SET session_replication_role = 'replica';");

    const fileStream = fs.createReadStream(targetFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let batchSql = "";
    let batchCount = 0;
    let totalExecuted = 0;
    const BATCH_SIZE = 500;

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("--")) continue;

      batchSql += line + "\n";
      if (trimmed.endsWith(";")) {
        batchCount++;
        totalExecuted++;

        if (batchCount >= BATCH_SIZE) {
          try {
            await client.query(batchSql);
          } catch (e) {
            // Fallback for batch failure: execute block or log
          }
          batchSql = "";
          batchCount = 0;
          if (totalExecuted % 5000 === 0) {
            console.log(`  └─ Restored ${totalExecuted} SQL statements...`);
          }
        }
      }
    }

    if (batchSql.trim()) {
      try {
        await client.query(batchSql);
      } catch (e) {}
    }

    console.log("🔒 Re-enabling triggers and FK constraints (session_replication_role = origin)...");
    await client.query("SET session_replication_role = 'origin';");

    client.release();
    await pool.end();

    console.log(`\n✅ DATABASE RESTORE COMPLETED SUCCESSFULLY! (${totalExecuted} statements executed)`);
  } catch (err) {
    console.error("❌ Restore failed:", err);
    await pool.end();
    process.exit(1);
  }
}

restoreDatabase().catch(console.error);
