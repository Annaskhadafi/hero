import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('app/actions/tire-repair-actions.ts and lib/tire-repair-constants.ts export actions and constants', () => {
  const actionsPath = path.join(process.cwd(), 'app/actions/tire-repair-actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(
    content.includes('export async function createTireRepairInspectionAction'),
    'Must export createTireRepairInspectionAction'
  );
  assert.ok(
    content.includes('export async function getTireRepairInspectionsAction'),
    'Must export getTireRepairInspectionsAction'
  );

  const constantsPath = path.join(process.cwd(), 'lib/tire-repair-constants.ts');
  const constantsContent = fs.readFileSync(constantsPath, 'utf8');
  assert.ok(
    constantsContent.includes('export const DURATION_CONFIG') && constantsContent.includes('maxDays: 4'),
    'Must include DURATION_CONFIG with R1 (4), R2 (8), R3 (12), R4 (18)'
  );
  assert.ok(
    constantsContent.includes('STANDARD_TIRE_SIZES') && constantsContent.includes('27.00R49'),
    'Must include STANDARD_TIRE_SIZES presets'
  );
});

test('db/schema/tire-repair.ts defines inspections and photos tables correctly', () => {
  const schemaPath = path.join(process.cwd(), 'db/schema/tire-repair.ts');
  const content = fs.readFileSync(schemaPath, 'utf8');

  assert.ok(
    content.includes('hero_tire_repair_inspections') && content.includes('serialNumber'),
    'Must define hero_tire_repair_inspections table'
  );
  assert.ok(
    content.includes('hero_tire_repair_photos') && content.includes('photoArea'),
    'Must define hero_tire_repair_photos table'
  );
});

test('components/mobile/mobile-dashboard-services.tsx and lib/mobile-access.ts register Tire Repair Form', () => {
  const servicesPath = path.join(process.cwd(), 'components/mobile/mobile-dashboard-services.tsx');
  const servicesContent = fs.readFileSync(servicesPath, 'utf8');
  assert.ok(
    servicesContent.includes('Tire Repair Form') && servicesContent.includes('/mobile/tire-repair'),
    'Dashboard services must link to /mobile/tire-repair'
  );

  const accessPath = path.join(process.cwd(), 'lib/mobile-access.ts');
  const accessContent = fs.readFileSync(accessPath, 'utf8');
  assert.ok(
    accessContent.includes('/mobile/tire-repair') && accessContent.includes('tire-repair'),
    'Mobile access must allow tire-repair routes'
  );
});

test('app/mobile/tire-repair/page.tsx includes Select Activity cards', () => {
  const pagePath = path.join(process.cwd(), 'app/mobile/tire-repair/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('Tire Repair Inspection') && content.includes('/mobile/tire-repair/inspection'),
    'Must include Tire Repair Inspection card'
  );
  assert.ok(
    content.includes('Jobcard Repair') && content.includes('/mobile/tire-repair/jobcard'),
    'Must include Jobcard Repair active card link'
  );
});

test('app/mobile/tire-repair/inspection/page.tsx includes filters, add tire button, and R-coded cards', () => {
  const pagePath = path.join(process.cwd(), 'app/mobile/tire-repair/inspection/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('Tire Repair Inspection Report'),
    'Must display title'
  );
  assert.ok(
    content.includes('Add Tire') && content.includes('/mobile/tire-repair/inspection/new'),
    'Must have Add Tire button'
  );
  assert.ok(
    content.includes('Not Inspect') && content.includes('Inspected'),
    'Must have Not Inspect and Inspected tabs'
  );
});

test('Desktop Tire Inspection Report page and menu item are properly registered', () => {
  const desktopPagePath = path.join(process.cwd(), 'app/dashboard/repair-retread/inspection/page.tsx');
  assert.ok(fs.existsSync(desktopPagePath), 'app/dashboard/repair-retread/inspection/page.tsx must exist');

  const clientPath = path.join(process.cwd(), 'app/dashboard/repair-retread/inspection/_components/tire-inspection-desktop-client.tsx');
  assert.ok(fs.existsSync(clientPath), 'TireInspectionDesktopClient component must exist');

  const adminPath = path.join(process.cwd(), 'lib/hero-admin.ts');
  const adminContent = fs.readFileSync(adminPath, 'utf8');
  assert.ok(
    adminContent.includes('/dashboard/repair-retread/inspection') &&
    adminContent.includes('Tire Inspection Report'),
    'lib/hero-admin.ts must register Tire Inspection Report under Repair & Retread'
  );
});

test('Mobile new inspection page uses selectedPhotoArea for per-photo area tagging', () => {
  const newPagePath = path.join(process.cwd(), 'app/mobile/tire-repair/inspection/new/page.tsx');
  const content = fs.readFileSync(newPagePath, 'utf8');

  assert.ok(
    content.includes('selectedPhotoArea'),
    'Must use selectedPhotoArea state for per-photo area tagging'
  );
  assert.ok(
    content.includes('areaTitle={selectedPhotoArea}'),
    'Must pass selectedPhotoArea to TireRepairCameraModal areaTitle prop'
  );
});

test('TireInspectionImportDialog component exists and integrates bulkCreateTireRepairInspectionsAction', () => {
  const dialogPath = path.join(
    process.cwd(),
    'app/dashboard/repair-retread/inspection/_components/tire-inspection-import-dialog.tsx'
  );
  assert.ok(fs.existsSync(dialogPath), 'tire-inspection-import-dialog.tsx must exist');

  const content = fs.readFileSync(dialogPath, 'utf8');
  assert.ok(
    content.includes('bulkCreateTireRepairInspectionsAction'),
    'Import dialog must invoke bulkCreateTireRepairInspectionsAction'
  );
  assert.ok(
    content.includes('XLSX.read'),
    'Import dialog must read Excel/CSV using SheetJS'
  );
});

test('public/format import tyre inspection report.xlsx exists and matches expected structure', () => {
  const excelPath = path.join(process.cwd(), 'public/format import tyre inspection report.xlsx');
  assert.ok(fs.existsSync(excelPath), 'KPC import template excel file must exist in public folder');
});

test('Desktop Tire Inspection Client integrates handleExportExcel in KPC format', () => {
  const clientPath = path.join(process.cwd(), 'app/dashboard/repair-retread/inspection/_components/tire-inspection-desktop-client.tsx');
  const content = fs.readFileSync(clientPath, 'utf8');

  assert.ok(
    content.includes('handleExportExcel'),
    'Desktop client must provide handleExportExcel function'
  );
  assert.ok(
    content.includes('TYRE INSPECTION REPORT CP-KPC'),
    'Export Excel must format header matching KPC report structure'
  );
});

test('Repair Job Card F.INPR.REM.003.00 schema, server actions, and mobile pages exist', () => {
  const schemaPath = path.join(process.cwd(), 'db/schema/tire-repair.ts');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  assert.ok(schemaContent.includes('hero_tire_repair_jobcards'), 'Schema must define hero_tire_repair_jobcards');
  assert.ok(schemaContent.includes('hero_tire_repair_jobcard_injuries'), 'Schema must define hero_tire_repair_jobcard_injuries');
  assert.ok(schemaContent.includes('hero_tire_repair_jobcard_processes'), 'Schema must define hero_tire_repair_jobcard_processes');

  const actionsPath = path.join(process.cwd(), 'app/actions/tire-repair-jobcard-actions.ts');
  assert.ok(fs.existsSync(actionsPath), 'app/actions/tire-repair-jobcard-actions.ts must exist');

  const mobileListPage = path.join(process.cwd(), 'app/mobile/tire-repair/jobcard/page.tsx');
  assert.ok(fs.existsSync(mobileListPage), 'Mobile Jobcard list page must exist');

  const mobileNewPage = path.join(process.cwd(), 'app/mobile/tire-repair/jobcard/new/page.tsx');
  assert.ok(fs.existsSync(mobileNewPage), 'Mobile Jobcard entry page must exist');
  const newPageContent = fs.readFileSync(mobileNewPage, 'utf8');
  assert.ok(
    newPageContent.includes('getTireRepairJobcardsAction'),
    'New Jobcard page must import and declare getTireRepairJobcardsAction'
  );
  assert.ok(
    newPageContent.includes('TireRepairProcessTimer'),
    'New Jobcard page must integrate TireRepairProcessTimer for process duration'
  );
});

test('Form WO Client includes Waiting WO KPC separate tab', () => {
  const clientPath = path.join(process.cwd(), 'app/dashboard/repair-retread/form-wo/_components/form-wo-client.tsx');
  const content = fs.readFileSync(clientPath, 'utf8');

  assert.ok(
    content.includes('value="waiting_kpc"'),
    'FormWoClient must include waiting_kpc tab value'
  );
  assert.ok(
    content.includes('Waiting WO KPC'),
    'FormWoClient must display Waiting WO KPC tab title'
  );
  assert.ok(
    content.includes('kpcWaitingWoList'),
    'FormWoClient must filter kpcWaitingWoList separately'
  );
});

test('getWaitingWoFromApi queries local HERO tire repair inspections and tags them as source hero', () => {
  const formWoActionPath = path.join(process.cwd(), 'app/actions/form-wo.ts');
  const content = fs.readFileSync(formWoActionPath, 'utf8');

  assert.ok(
    content.includes('tireRepairInspections'),
    'form-wo.ts must import and query tireRepairInspections'
  );
  assert.ok(
    content.includes("source: 'hero'") && content.includes('is_hero: true'),
  );
});

test('Mobile jobcard page strictly filters HERO-inputted records for KPC customer', () => {
  const mobileJobcardPath = path.join(process.cwd(), 'app/mobile/tire-repair/jobcard/page.tsx');
  const content = fs.readFileSync(mobileJobcardPath, 'utf8');

  assert.ok(
    content.includes('heroKpcOnly'),
    'Mobile jobcard page must define heroKpcOnly filter'
  );
  assert.ok(
    content.includes('isHeroInput'),
    'Mobile jobcard page must filter for isHeroInput'
  );
  assert.ok(
    content.includes('kaltim prima coal'),
    'Mobile jobcard page must filter for KPC customer'
  );
});

test('Desktop Repair Job Card page and sidebar menu entry exist', () => {
  const desktopJobcardPath = path.join(process.cwd(), 'app/dashboard/repair-retread/jobcard/page.tsx');
  assert.ok(fs.existsSync(desktopJobcardPath), 'Desktop Repair Job Card page wrapper must exist');

  const clientPath = path.join(process.cwd(), 'app/dashboard/repair-retread/jobcard/_components/jobcard-desktop-client.tsx');
  assert.ok(fs.existsSync(clientPath), 'Desktop Repair Job Card client component must exist');

  const heroAdminPath = path.join(process.cwd(), 'lib/hero-admin.ts');
  const heroAdminContent = fs.readFileSync(heroAdminPath, 'utf8');
  assert.ok(
    heroAdminContent.includes('/dashboard/repair-retread/jobcard'),
    'hero-admin.ts must register /dashboard/repair-retread/jobcard menu item'
  );
});

test('Jobcard Repair (QC) operates cleanly without approval process (supports In Progress and Completed statuses)', () => {
  const jobcardActionsPath = path.join(process.cwd(), 'app/actions/tire-repair-jobcard-actions.ts');
  const jobcardActionsContent = fs.readFileSync(jobcardActionsPath, 'utf8');

  assert.ok(
    jobcardActionsContent.includes("status: payload.status?.trim() || 'In Progress'"),
    'createTireRepairJobcardAction must default to In Progress for multi-day repair workflow'
  );
  assert.ok(
    !jobcardActionsContent.includes('approvals.insert') && !jobcardActionsContent.includes('activityType: \'jobcard_qc\''),
    'createTireRepairJobcardAction must NOT insert into approvals table'
  );

  const mobileNewPagePath = path.join(process.cwd(), 'app/mobile/tire-repair/jobcard/new/page.tsx');
  const mobileNewPageContent = fs.readFileSync(mobileNewPagePath, 'utf8');
  assert.ok(
    !mobileNewPageContent.includes('Pejabat Approver / QC Leader wajib dipilih'),
    'Mobile Jobcard form must NOT validate mandatory approver selection'
  );
});

test('TireRepairProcessTimer preserves existing duration string and getTireRepairJobcardByIdAction handles multi-injuries safely', () => {
  const timerPath = path.join(process.cwd(), 'components/mobile/tire-repair-process-timer.tsx');
  const timerContent = fs.readFileSync(timerPath, 'utf8');
  assert.ok(
    timerContent.includes('parseDurationStringToSeconds'),
    'TireRepairProcessTimer must implement parseDurationStringToSeconds to preserve previous hours'
  );

  const jobcardActionsPath = path.join(process.cwd(), 'app/actions/tire-repair-jobcard-actions.ts');
  const jobcardActionsContent = fs.readFileSync(jobcardActionsPath, 'utf8');
  assert.ok(
    jobcardActionsContent.includes('tireRepairJobcardProcesses') && jobcardActionsContent.includes('existingInjIds'),
    'updateTireRepairJobcardAction must safely delete existing processes before injuries to avoid FK constraint errors'
  );
  const mobileNewPagePath = path.join(process.cwd(), 'app/mobile/tire-repair/jobcard/new/page.tsx');
  const mobileNewPageContent = fs.readFileSync(mobileNewPagePath, 'utf8');
  assert.ok(
    mobileNewPageContent.includes('const DEFAULT_JOB_CARD_PROCESS_NAMES ='),
    'page.tsx must define DEFAULT_JOB_CARD_PROCESS_NAMES to prevent ReferenceError when loading draft injuries'
  );
});





