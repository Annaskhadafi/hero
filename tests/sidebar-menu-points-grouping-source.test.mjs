import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("points menu is grouped under Human Capital performance", () => {
  const source = read("lib/hero-admin.ts");

  assert.match(source, /section: 'Human Capital',[\s\S]*groupLabel: 'Point System',[\s\S]*title: 'Point Dashboard',[\s\S]*url: '\/dashboard\/leaderboard'/);
  assert.doesNotMatch(source, /section: 'Laporan',[\s\S]{0,220}title: 'Points Overview'/);
});

test("activity and approval menus expose operational group labels", () => {
  const source = read("lib/hero-admin.ts");

  assert.match(source, /groupLabel: 'Section Head - Input Pekerjaan'/);
  assert.match(source, /groupLabel: 'Setup Pekerjaan & Poin'/);
  assert.match(source, /groupLabel: 'PJO \/ Atasan Review'/);
  assert.match(source, /groupLabel: 'Setup Approval'/);
});
