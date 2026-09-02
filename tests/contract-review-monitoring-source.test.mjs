import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("contract review monitoring queries expiring and overdue contracts from single source of truth hero_employees", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /getExpiringContractEmployees/);
  assert.match(source, /contractDurationEnd/);
  assert.match(source, /isNotNull\(employees\.contractDurationEnd\)/);
  assert.match(source, /sendSingleContractReminder/);
  assert.match(source, /sendBatchContractReminders/);
  assert.match(source, /sendDueContractReviewReminders/);
  assert.match(source, /resolveApproverForEmployee/);
});

test("contract review reminder resolves superior hierarchy: PJO/Lokasi Head from Master Sites, Direct Manager from Org Structure, and Section Head from Master Sections", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /sites\.headEmployeeId/);
  assert.match(source, /directManagerId/);
  assert.match(source, /masterSections\.headEmployeeId/);
  assert.match(source, /masterDepartments\.headEmployeeId/);
  assert.match(source, /PJO \/ Lokasi Head/);
  assert.match(source, /Atasan Langsung/);
});

test("cron reminders route calls sendDueContractReviewReminders", () => {
  const cronSource = read("app/api/cron/reminders/route.ts");

  assert.match(cronSource, /sendDueContractReviewReminders/);
  assert.match(cronSource, /contractReview:\s*contractReviewResult/);
});

test("contract review page passes expiring contract employees to client page", () => {
  const pageSource = read("app/dashboard/hc/contract-review/page.tsx");

  assert.match(pageSource, /getExpiringContractEmployees/);
  assert.match(pageSource, /expiringEmployees=\{expiringEmployees/);
});

test("contract review client page provides Tabs and Monitoring Kontrak table with filters, multi-select, and actions", () => {
  const clientPageSource = read("app/dashboard/hc/contract-review/client-page.tsx");

  assert.match(clientPageSource, /Tabs/);
  assert.match(clientPageSource, /TabsList/);
  assert.match(clientPageSource, /TabsTrigger value="reviews"/);
  assert.match(clientPageSource, /TabsTrigger value="monitoring"/);
  assert.match(clientPageSource, /Monitoring Kontrak \(H-90 & Overdue\)/);
  assert.match(clientPageSource, /sendSingleContractReminder/);
  assert.match(clientPageSource, /sendBatchContractReminders/);
  assert.match(clientPageSource, /handleSendSingleReminder/);
  assert.match(clientPageSource, /handleSendBatchSelectedReminders/);
  assert.match(clientPageSource, /handleSendReminders/);
  assert.match(clientPageSource, /selectedEmployeeIds/);
  assert.match(clientPageSource, /toggleSelectEmployee/);
  assert.match(clientPageSource, /toggleSelectAll/);
  assert.match(clientPageSource, /urgencyFilter/);
  assert.match(clientPageSource, /reviewStatusFilter/);
  assert.match(clientPageSource, /Overdue/);
  assert.match(clientPageSource, /Buat Review/);
  assert.match(clientPageSource, /Lihat Review/);
});

test("contract review client form handles employeeId and employeeSn prefill from monitoring navigation", () => {
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(formSource, /employeeSnParam/);
  assert.match(formSource, /employeeIdParam/);
  assert.match(formSource, /autoPopulateSignatories/);
});
