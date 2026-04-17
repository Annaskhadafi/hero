import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { getDatabaseUrl, getDatabaseUrlErrorMessage } from "./database-url.mjs";

const migrationRoot = process.cwd();
const journalPath = path.join(migrationRoot, "drizzle", "meta", "_journal.json");
const migrationsSchemaName = "drizzle";
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
    const tables = Array.from(
      sql.matchAll(/CREATE TABLE\s+"([^"]+)"/g),
      (match) => match[1],
    );
    const addedColumns = Array.from(
      sql.matchAll(
        /ALTER TABLE\s+"([^"]+)"\s+ADD COLUMN\s+"([^"]+)"/g,
      ),
      (match) => ({
        tableName: match[1],
        columnName: match[2],
      }),
    );

    return {
      ...entry,
      hash,
      tables,
      addedColumns,
      filePath,
    };
  });
}

function isRecoverableMigrationFailure(output) {
  return (
    output.includes("already exists") ||
    output.includes("code: '42P07'") ||
    output.includes("severity: 'ERROR'")
  );
}

function getExistingRelationName(output) {
  const relationMatch = output.match(/relation "([^"]+)" already exists/);
  return relationMatch?.[1] ?? "";
}

function getExistingColumnConflict(output) {
  const columnMatch = output.match(
    /column "([^"]+)" of relation "([^"]+)" already exists/,
  );

  if (!columnMatch) {
    return null;
  }

  return {
    columnName: columnMatch[1],
    tableName: columnMatch[2],
  };
}

async function ensureMigrationsTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${migrationsSchemaName}"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${migrationsSchemaName}"."${migrationsTableName}" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function getAppliedMigrationTimes(client) {
  const existing = await client.query(
    `select created_at from "${migrationsSchemaName}"."${migrationsTableName}"`,
  );

  return new Set(existing.rows.map((row) => Number(row.created_at)));
}

async function tableExists(client, tableName) {
  const result = await client.query(
    "select to_regclass($1) as table_name",
    [`public."${tableName}"`],
  );

  return Boolean(result.rows[0]?.table_name);
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName],
  );

  return result.rowCount > 0;
}

async function entryAlreadyMaterialized(client, entry) {
  for (const tableName of entry.tables) {
    const exists = await tableExists(client, tableName);

    if (!exists) {
      return false;
    }
  }

  for (const { tableName, columnName } of entry.addedColumns) {
    const exists = await columnExists(client, tableName, columnName);

    if (!exists) {
      return false;
    }
  }

  return entry.tables.length > 0 || entry.addedColumns.length > 0;
}

async function registerMigration(client, entry) {
  await client.query(
    `insert into "${migrationsSchemaName}"."${migrationsTableName}" ("hash", "created_at") values ($1, $2)`,
    [entry.hash, entry.when],
  );
}

async function bootstrapConflictingMigration(output, entries) {
  const conflictingRelation = getExistingRelationName(output);
  const conflictingColumn = getExistingColumnConflict(output);

  if (!conflictingRelation && !conflictingColumn) {
    return null;
  }

  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedMigrationTimes = await getAppliedMigrationTimes(client);

    const targetEntry = conflictingRelation
      ? entries.find(
          (entry) =>
            !appliedMigrationTimes.has(entry.when) &&
            entry.tables.includes(conflictingRelation),
        )
      : entries.find((entry) => {
          if (appliedMigrationTimes.has(entry.when)) {
            return false;
          }

          return entry.addedColumns.some(
            ({ tableName, columnName }) =>
              tableName === conflictingColumn?.tableName &&
              columnName === conflictingColumn?.columnName,
          );
        });

    if (!targetEntry) {
      return null;
    }

    const relationExists = conflictingRelation
      ? await tableExists(client, conflictingRelation)
      : await entryAlreadyMaterialized(client, targetEntry);

    if (!relationExists) {
      return null;
    }

    await registerMigration(client, targetEntry);

    return targetEntry;
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(getDatabaseUrlErrorMessage("run Drizzle migrations"));
  }

  const entries = getMigrationEntries();
  const maxAttempts = entries.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runDrizzleMigrate();

    if (result.status === 0) {
      return;
    }

    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    if (!isRecoverableMigrationFailure(combinedOutput)) {
      process.exit(result.status ?? 1);
    }

    const bootstrappedEntry = await bootstrapConflictingMigration(
      combinedOutput,
      entries,
    );

    if (!bootstrappedEntry) {
      console.error(
        "Unable to reconcile existing schema with Drizzle migration history automatically.",
      );
      process.exit(result.status ?? 1);
    }

    console.log(
      `Detected pre-existing table from migration ${bootstrappedEntry.tag}. Registered it in ${migrationsSchemaName}.${migrationsTableName} and retrying...`,
    );
  }

  console.error("Exceeded automatic migration recovery attempts.");
  process.exit(1);
}

main().catch((error) => {
  console.error("Docker migration helper failed.", error);
  process.exit(1);
});
