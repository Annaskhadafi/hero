import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getRequestedForLabel } from "../lib/apd-data";

describe("HSE APD Requested For Feature", () => {
  test("getRequestedForLabel helper converts values correctly", () => {
    assert.equal(getRequestedForLabel("self"), "Diri sendiri");
    assert.equal(getRequestedForLabel("service"), "Service");
    assert.equal(getRequestedForLabel("repair"), "Repair");
    assert.equal(getRequestedForLabel(null), "Diri sendiri");
    assert.equal(getRequestedForLabel(undefined), "Diri sendiri");
  });

  test("Schema definitions include requestedFor column", () => {
    const apdSchemaContent = fs.readFileSync(path.resolve("db/schema/apd.ts"), "utf8");
    assert.ok(
      apdSchemaContent.includes("requestedFor: text('requested_for').notNull().default('self')"),
      "db/schema/apd.ts must contain requestedFor column definition"
    );

    const heroSchemaContent = fs.readFileSync(path.resolve("db/schema/hero.ts"), "utf8");
    assert.ok(
      heroSchemaContent.includes("requestedFor: text('requested_for').notNull().default('self')"),
      "db/schema/hero.ts must contain requestedFor column definition"
    );
  });

  test("SQL migration helper is configured in ensureApdRequestSchema", () => {
    const apdDataContent = fs.readFileSync(path.resolve("lib/apd-data.ts"), "utf8");
    assert.ok(
      apdDataContent.includes("ADD COLUMN IF NOT EXISTS requested_for text NOT NULL DEFAULT 'self'"),
      "ensureApdRequestSchema must execute SQL migration for requested_for"
    );
  });

  test("Actions mapping targetSectionId for Service and Repair", () => {
    const actionsContent = fs.readFileSync(path.resolve("app/dashboard/apd/actions.ts"), "utf8");
    assert.ok(
      actionsContent.includes("requestedFor === 'service'"),
      "actions.ts must check for requestedFor === 'service'"
    );
    assert.ok(
      actionsContent.includes("targetSectionId = 33"),
      "actions.ts must route Service requests to section 33"
    );
    assert.ok(
      actionsContent.includes("targetSectionId = 29"),
      "actions.ts must route Repair requests to section 29"
    );
  });

  test("Summary engine routing uses targetSectionId", () => {
    const summaryEngineContent = fs.readFileSync(path.resolve("lib/summary-engine.ts"), "utf8");
    assert.ok(
      summaryEngineContent.includes("targetSectionId: apdRequests.targetSectionId"),
      "summary-engine.ts must select targetSectionId from apdRequests"
    );
    assert.ok(
      summaryEngineContent.includes("effectiveSecId = req.targetSectionId || req.sectionId"),
      "summary-engine.ts must use targetSectionId for summary routing"
    );
  });

  test("Web and Mobile APD forms render Diajukan Untuk options", () => {
    const formContent = fs.readFileSync(path.resolve("app/dashboard/apd/new/apd-form.tsx"), "utf8");
    assert.ok(formContent.includes("isHseUser"), "apd-form.tsx must support isHseUser prop");
    assert.ok(formContent.includes("Diajukan Untuk"), "apd-form.tsx must render Diajukan Untuk label");
    assert.ok(formContent.includes('onClick={() => setRequestedFor("service")}'), "apd-form.tsx must support Service selection");
    assert.ok(formContent.includes('onClick={() => setRequestedFor("repair")}'), "apd-form.tsx must support Repair selection");
  });

  test("Print PDF renders Diajukan Untuk row", () => {
    const printContent = fs.readFileSync(path.resolve("app/print/apd/[id]/page.tsx"), "utf8");
    assert.ok(printContent.includes("getRequestedForLabel"), "Print page must import getRequestedForLabel");
    assert.ok(printContent.includes("Diajukan Untuk"), "Print page must render Diajukan Untuk row");
  });
});
