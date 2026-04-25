import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("root layout keeps hydration cleanup inline in head without next/script", () => {
  const layout = read("app/layout.tsx");

  assert.doesNotMatch(layout, /from "next\/script"/);
  assert.match(layout, /dangerouslySetInnerHTML/);
});

test("globals keep intentional tracking and radius rules intact", () => {
  const globals = read("app/globals.css");

  assert.doesNotMatch(globals, /:where\(\[class\*="tracking-"\]\)\s*\{/);
  assert.doesNotMatch(globals, /\[class\*="rounded-2xl"\]/);
});

test("shared button primitive uses specific transitions and tactile press scale", () => {
  const button = read("components/ui/button.tsx");

  assert.doesNotMatch(button, /transition-all/);
  assert.match(button, /active:scale-\[0\.96\]/);
});

test("shared UI surfaces expose tabular numerals for dynamic counts", () => {
  const globals = read("app/globals.css");
  const metricGrid = read("components/admin-metric-grid.tsx");
  const tableShell = read("components/ui/minimal-table-shell.tsx");

  assert.match(globals, /\.tabular-nums\b|font-variant-numeric:\s*tabular-nums/);
  assert.match(metricGrid, /tabular-nums/);
  assert.match(tableShell, /tabular-nums/);
});

test("mobile shell separates chrome with tonal layers instead of hard borders", () => {
  const mobileShell = read("components/mobile/mobile-app-shell.tsx");

  assert.doesNotMatch(mobileShell, /border-b border\[/);
  assert.doesNotMatch(mobileShell, /border-t border\[/);
});

test("desktop dashboard shell stays compact", () => {
  const dashboardLayout = read("app/dashboard/layout.tsx");
  const siteHeader = read("components/site-header.tsx");

  assert.match(dashboardLayout, /"--sidebar-width": "15\.5rem"/);
  assert.match(siteHeader, /min-h-\[(48|52|56)px\]|min-h-12|min-h-14/);
  assert.doesNotMatch(siteHeader, /sm:min-h-\(--header-height\)/);
});

test("admin table shell exposes daily admin controls", () => {
  const tableShell = read("components/ui/minimal-table-shell.tsx");

  assert.match(tableShell, /Import/);
  assert.match(tableShell, /Excel/);
  assert.match(tableShell, /pageSize/);
  assert.match(tableShell, /sort/);
  assert.match(tableShell, /data-table-filter-key/);
});

test("approval workbench no longer expands long details inline", () => {
  const approvalWorkbench = read("components/approval-workbench.tsx");

  assert.doesNotMatch(approvalWorkbench, /<details/);
  assert.match(approvalWorkbench, /AdminDetailDrawer/);
});
