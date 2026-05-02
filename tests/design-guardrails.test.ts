import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectFiles(relativeDir: string, extensions = new Set([".ts", ".tsx"])) {
  const root = path.join(projectRoot, relativeDir);
  const files: string[] = [];

  function walk(currentPath: string) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(projectRoot, absolutePath);

      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", ".kilo", "graphify-out"].includes(entry.name)) {
          continue;
        }

        walk(absolutePath);
        continue;
      }

      if (extensions.has(path.extname(entry.name))) {
        files.push(relativePath);
      }
    }
  }

  if (statSync(root).isDirectory()) {
    walk(root);
  }

  return files;
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

test("dashboard tables reuse shared shell components", () => {
  const reusableShellPatterns = [
    /AdminTableCard/,
    /AdminDataTableShell/,
    /MinimalTableShell/,
  ];
  const tablePatterns = [
    /from\s+["']@\/components\/ui\/table["']/,
    /<Table[\s>]/,
    /<TableHeader[\s>]/,
  ];
  const allowedFiles = new Set([
    "components/ui/table.tsx",
    "components/ui/minimal-table-shell.tsx",
    "components/admin-table-card.tsx",
    "components/admin/admin-data-table-shell.tsx",
  ]);
  const legacyExceptions = new Set([
    "app/dashboard/activity-hub/configuration/page.tsx",
    "app/dashboard/activity-hub/library/page.tsx",
    "app/dashboard/activity-hub/routes/page.tsx",
    "app/dashboard/activity-hub/team-board/page.tsx",
    "app/dashboard/settings/email/page.tsx",
    "app/dashboard/training-records/page.tsx",
  ]);
  const candidateFiles = [
    ...collectFiles("app/dashboard"),
  ].filter((relativePath) => !relativePath.includes("\\mobile\\"));

  for (const relativePath of candidateFiles) {
    const normalizedPath = relativePath.replaceAll("\\", "/");

    if (allowedFiles.has(normalizedPath) || legacyExceptions.has(normalizedPath)) {
      continue;
    }

    const source = read(relativePath);
    const usesTable = tablePatterns.some((pattern) => pattern.test(source));
    if (!usesTable) {
      continue;
    }

    const usesReusableShell = reusableShellPatterns.some((pattern) => pattern.test(source));
    assert.equal(
      usesReusableShell,
      true,
      `${relativePath} renders a dashboard table without MinimalTableShell/AdminTableCard/AdminDataTableShell`,
    );
  }
});

test("approval workbench no longer expands long details inline", () => {
  const approvalWorkbench = read("components/approval-workbench.tsx");

  assert.doesNotMatch(approvalWorkbench, /<details/);
  assert.match(approvalWorkbench, /AdminDetailDrawer/);
});
