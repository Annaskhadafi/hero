import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not defined in .env or .env.local");
  process.exit(1);
}

function findPgDump(): string | null {
  try {
    execSync("pg_dump --version", { stdio: "ignore" });
    return "pg_dump";
  } catch {
    const knownPaths = [
      "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\16\\pgAdmin 4\\runtime\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\17\\pgAdmin 4\\runtime\\pg_dump.exe",
    ];

    for (const p of knownPaths) {
      if (fs.existsSync(p)) {
        return `"${p}"`;
      }
    }
  }
  return null;
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupsDir = path.join(process.cwd(), "backups");
  
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const sqlFilename = `backup_hero_${timestamp}.sql`;
  const sqlPath = path.join(backupsDir, sqlFilename);

  console.log("🚀 Starting database backup process...");
  console.log(`📂 Output directory: ${backupsDir}`);
  console.log(`📄 Target file: ${sqlFilename}`);

  const pgDumpExe = findPgDump();

  if (pgDumpExe) {
    console.log(`ℹ️  Found pg_dump utility: ${pgDumpExe}`);
    try {
      const cmd = `${pgDumpExe} --dbname="${DATABASE_URL}" --clean --if-exists --inserts --file="${sqlPath}"`;
      execSync(cmd, { stdio: "inherit", env: process.env });
      
      const stats = fs.statSync(sqlPath);
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log("\n✅ BACKUP COMPLETED SUCCESSFULLY!");
      console.log(`📌 Backup File: ${sqlPath}`);
      console.log(`📦 File Size: ${sizeMb} MB`);
      return sqlPath;
    } catch (err) {
      console.warn("⚠️ pg_dump CLI encountered an issue, falling back to node-pg exporter...", err);
    }
  }

  // Fallback: Node-pg manual SQL export with session_replication_role = 'replica'
  console.log("ℹ️ Running Node.js database fallback exporter...");
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false,
  });

  try {
    const client = await pool.connect();
    
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`📊 Found ${tables.length} tables to dump.`);

    const writeStream = fs.createWriteStream(sqlPath, { encoding: "utf8" });
    
    // Disable triggers and foreign keys during restore
    writeStream.write(`-- HERO Database Backup\n-- Generated at: ${new Date().toISOString()}\n\nSET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\nSET session_replication_role = 'replica';\n\n`);

    for (const table of tables) {
      console.log(`  └─ Exporting table data: ${table}...`);
      writeStream.write(`-- Table: ${table}\n`);
      
      const rowsRes = await client.query(`SELECT * FROM "${table}"`);
      if (rowsRes.rows.length === 0) continue;

      const cols = Object.keys(rowsRes.rows[0]).map(c => `"${c}"`).join(", ");
      
      for (const row of rowsRes.rows) {
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number" || typeof val === "boolean") return String(val);
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(", ");

        writeStream.write(`INSERT INTO "${table}" (${cols}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
      }
      writeStream.write("\n");
    }

    // Re-enable triggers and foreign keys
    writeStream.write(`SET session_replication_role = 'origin';\n`);
    writeStream.end();
    
    client.release();
    await pool.end();

    const stats = fs.statSync(sqlPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log("\n✅ BACKUP COMPLETED SUCCESSFULLY (Fallback exporter)!");
    console.log(`📌 Backup File: ${sqlPath}`);
    console.log(`📦 File Size: ${sizeMb} MB`);
    return sqlPath;
  } catch (err) {
    console.error("❌ Backup failed:", err);
    await pool.end();
    process.exit(1);
  }
}

backupDatabase().catch(console.error);
