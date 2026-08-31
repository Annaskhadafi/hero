import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../db/index.js';
import { hsePtwPermits, ptwApprovals, employees } from '../db/schema/hero.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  createPtwPermitAction,
  getPtwApprovalData,
  savePtwApprovalForm,
  submitPtwApprovalStepAction,
} from '../app/dashboard/hse/izin-kerja-ptw/actions.ts';

test.describe('PTW Approval CRUD & Workflow Engine Integration Suite', () => {
  let createdPermitId = null;

  test('1. CREATE: New PTW Permit & Initialize Approval Steps in Database', async () => {
    // Fetch a valid employee from hero_employees (Single Source of Truth)
    const [emp] = await db.select().from(employees).limit(1);
    assert.ok(emp, 'Employee data must exist in hero_employees table');

    const formData = new FormData();
    formData.append('permitNumber', `PTW-TEST-${Date.now()}`);
    formData.append('workOrderId', `WO-TEST-${Date.now()}`);
    formData.append('workDescription', 'Pekerjaan Pemeliharaan Ruang Terbatas (Automated CRUD Test)');
    formData.append('location', 'Silo Material Kering Sector Utara');
    formData.append('hiradcRef', 'CS-01');
    formData.append('selectedPermitTypes', JSON.stringify(['Confined Space Permit']));
    formData.append('applicantId', String(emp.id));
    formData.append('applicantName', emp.name || 'Test Applicant');
    formData.append('fieldPicId', String(emp.id));
    formData.append('fieldPicName', emp.name || 'Test Field PIC');
    formData.append('authorizedById', String(emp.id));
    formData.append('authorizedByName', emp.name || 'Test Safety Dept');
    formData.append('startDate', '2026-08-27');
    formData.append('startTime', '08:00');
    formData.append('endDate', '2026-08-27');
    formData.append('endTime', '17:00');
    formData.append('ppe', JSON.stringify(['Helmet', 'Safety Shoes', 'Respirator']));

    const createRes = await createPtwPermitAction(formData);
    assert.equal(createRes.success, true, `Create PTW Action failed: ${createRes.error}`);
    assert.ok(createRes.permitId, 'Returned permitId must not be null');

    createdPermitId = createRes.permitId;

    // Verify record in hsePtwPermits
    const [permitRecord] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, createdPermitId));
    assert.ok(permitRecord, 'Created PTW record must exist in hsePtwPermits DB table');
    assert.equal(permitRecord.status, 'Pending');

    // Verify 3 approval steps created in ptwApprovals
    const steps = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.ptwPermitId, createdPermitId))
      .orderBy(ptwApprovals.stepOrder);

    assert.equal(steps.length, 3, 'PTW workflow must initialize exactly 3 approval steps');
    assert.equal(steps[0].stepOrder, 1);
    assert.equal(steps[1].stepOrder, 2);
    assert.equal(steps[2].stepOrder, 3);
  });

  test('2. READ: Get PTW Approval Data & Single Source of Truth Employee Info', async () => {
    assert.ok(createdPermitId, 'Permit ID must be available from step 1');

    const approvalData = await getPtwApprovalData(createdPermitId);
    assert.equal(approvalData.success, true, 'getPtwApprovalData must return success');
    assert.ok(approvalData.permit, 'Permit detail must not be null');
    assert.ok(Array.isArray(approvalData.approvals), 'Approvals list must be an array');
    assert.equal(approvalData.approvals.length, 3, 'Must return 3 approval steps');
  });

  test('3. UPDATE: Save Form Checklist & Approve Step 1 Workflow', async () => {
    assert.ok(createdPermitId, 'Permit ID must be available');

    // Update equipment checklist & remarks via savePtwApprovalForm
    const saveRes = await savePtwApprovalForm({
      permitId: createdPermitId,
      checkedEquipment: ['Breathing Set', 'Blower / Kipas', 'Safety Harness'],
      remarks: 'Safety checklist verified for confined space entry',
    });
    assert.equal(saveRes.success, true, 'savePtwApprovalForm must return success');

    // Verify PPE updated in DB
    const [updatedPermit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, createdPermitId));
    assert.ok(Array.isArray(updatedPermit.ppe));
    assert.ok(updatedPermit.ppe.includes('Breathing Set'));

    // Approve Step 1 via submitPtwApprovalStepAction
    const [step1] = await db
      .select()
      .from(ptwApprovals)
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, createdPermitId),
          eq(ptwApprovals.stepOrder, 1)
        )
      );
    assert.ok(step1, 'Step 1 approval record must exist');

    const approveRes = await submitPtwApprovalStepAction({
      approvalId: step1.id,
      permitId: createdPermitId,
      action: 'approve',
      remarks: 'Pelaksana pekerjaan telah memenuhi kriteria K3',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    assert.equal(approveRes.success, true, 'submitPtwApprovalStepAction approve must return success');

    // Verify Step 1 status updated to 'approved' in DB
    const [approvedStep1] = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.id, step1.id));
    assert.equal(approvedStep1.status, 'approved', 'Step 1 status in DB must be approved');
    assert.ok(approvedStep1.signedAt, 'Step 1 signedAt must be recorded');
  });

  test('4. DELETE / CLEANUP: Purge Temporary E2E Test Record from Database', async () => {
    if (!createdPermitId) return;

    // Delete associated approval steps
    await db.delete(ptwApprovals).where(eq(ptwApprovals.ptwPermitId, createdPermitId));

    // Delete PTW permit record
    await db.delete(hsePtwPermits).where(eq(hsePtwPermits.id, createdPermitId));

    // Verify record purged
    const [purged] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, createdPermitId));
    assert.equal(purged, undefined, 'Test PTW record must be completely cleaned up from database');
  });
});
