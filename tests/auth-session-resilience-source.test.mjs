import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("database pool is reused in production instead of being created per query", () => {
  const source = read("db/index.ts");

  assert.match(source, /globalThis\.heroDbPool = pool/);
  assert.match(source, /globalThis\.heroDbConnectionString = connectionString/);
  assert.doesNotMatch(
    source,
    /if \(process\.env\.NODE_ENV !== ["']production["']\) \{\s*globalThis\.heroDbPool/,
  );
});

test("better-auth keeps a short signed session cache", () => {
  const source = read("lib/auth.ts");

  assert.match(source, /cookieCache:\s*\{[\s\S]*enabled:\s*true/);
  assert.match(source, /maxAge:\s*5 \* 60/);
});
