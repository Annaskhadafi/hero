import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const migrationRoot = process.cwd();
const journalPath = path.join(migrationRoot, "drizzle", "meta", "_journal.json");
const migrationsTableName = "__drizzle_migrations";

function logOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function runDrizzleMigrate() {
  const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
    cwd: migrationRoot,
    encoding: "utf8",
    env: process.env,
  });

  logOutput(result);
  return result;
}

function getMigrationEntries() {
  if (!existsSync(journalPath)) {
    throw new Error(`Migration journal not found at ${journalPath}`);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8"));

  return journal.entries.map((entry) => {
    const filename = `${entry.tag}.sql`;
    const filePath = path.join(migrationRoot, "drizzle", filename);

    if (!existsSync(filePath)) {
      throw new Error(`Migration SQL file not found: ${filename}`);
    }

    const sql = readFileSync(filePath, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    const tables = Array.from(sql.matchAll(/CREATE TABLE\s+"([^"]+)"/g), (match) => match[1]);

    return {
      ...entry,
      hash,
      tables,
    };
  });
}

function isRecoverableMigrationFailure(output) {
  return (
    output.includes('relation "account" already exists') ||
    output.includes("already exists") ||
    output.includes('column "id" is in a primary key') ||
    output.includes("code: '42P07'") ||
    output.includes("code: '42P16'")
  );
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${migrationsTableName}" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function tableExists(client, tableName) {
  const result = await client.query(
    "select to_regclass($1) as table_name",
    [`public."${tableName}"`],
  );

  return Boolean(result.rows[0]?.table_name);
}

async function bootstrapMigrationHistory() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const existing = await client.query(
      `select created_at from "${migrationsTableName}"`,
    );
    const appliedMigrationTimes = new Set(
      existing.rows.map((row) => Number(row.created_at)),
    );

    const entries = getMigrationEntries();
    let insertedCount = 0;

    for (const entry of entries) {
      if (appliedMigrationTimes.has(entry.when)) {
        continue;
      }

      let migrationAlreadyApplied = true;

      for (const tableName of entry.tables) {
        if (!(await tableExists(client, tableName))) {
          migrationAlreadyApplied = false;
          break;
        }
      }

      if (!migrationAlreadyApplied) {
        continue;
      }

      await client.query(
        `insert into "${migrationsTableName}" ("hash", "created_at") values ($1, $2)`,
        [entry.hash, entry.when],
      );
      insertedCount += 1;
    }

    return insertedCount;
  } finally {
    await client.end();
  }
}

async function main() {
  const firstAttempt = runDrizzleMigrate();

  if (firstAttempt.status === 0) {
    return;
  }

  const combinedOutput = `${firstAttempt.stdout ?? ""}\n${firstAttempt.stderr ?? ""}`;

  if (!isRecoverableMigrationFailure(combinedOutput)) {
    process.exit(firstAttempt.status ?? 1);
  }

  console.log("Detected existing schema. Bootstrapping Drizzle migration history...");
  const bootstrappedCount = await bootstrapMigrationHistory();

  if (bootstrappedCount > 0) {
    console.log(`Registered ${bootstrappedCount} existing migration(s) in ${migrationsTableName}.`);
  } else {
    console.log("No existing migrations needed registration.");
  }

  const secondAttempt = runDrizzleMigrate();

  if (secondAttempt.status !== 0) {
    process.exit(secondAttempt.status ?? 1);
  }
}

main().catch((error) => {
  console.error("Docker migration helper failed.", error);
  process.exit(1);
});
