import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../db/index'
import {
  employees,
  hcEmployeeContractReviews,
  hcContractReviewApprovals,
  hcContractReviewTestConfigs,
  hcContractReviewTestQuestions,
  hcContractReviewTestAttempts,
} from '../db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import {
  getContractReviewById,
  approveContractReviewStep,
  updateContractReviewByApproverToken,
  addContractReviewApproverRow,
  ensureContractReviewWorkflowTables,
} from '../app/actions/contract-review'
import {
  generateContractReviewTestAttempt,
  startContractReviewTestAttempt,
  submitContractReviewTestAttempt,
} from '../app/actions/contract-review-tests'

test('Live End-to-End Contract Review Workflow & Online Test Integration', async (t) => {
  await ensureContractReviewWorkflowTables()

  let testConfigId: number | null = null
  let createdReviewId: number | null = null
  let createdEmployeeId: number | null = null
  let q1Id: number | null = null
  let q2Id: number | null = null
  let step1Token = randomUUID().replace(/-/g, '')
  let step2Token = randomUUID().replace(/-/g, '')
  let step3Token = randomUUID().replace(/-/g, '')
  let newlyInsertedStepToken = ''

  // 0. Setup: Find an active employee
  const [emp] = await db.select().from(employees).limit(1)
  assert.ok(emp, 'Must have at least 1 employee in hero_employees for live test')
  createdEmployeeId = emp.id

  await t.test('1. Setup Test Config & Questions in Training Center', async () => {
    const [cfg] = await db
      .insert(hcContractReviewTestConfigs)
      .values({
        title: 'UAT Live Test - Evaluasi Kontrak Mekanik',
        reviewType: 'contract',
        hasPassingGrade: true,
        passingGrade: 70,
        durationMinutes: 30,
        maxRemedialAttempts: 2,
        isActive: true,
      })
      .returning()

    assert.ok(cfg?.id, 'Test config must be created')
    testConfigId = cfg.id

    // Insert 2 questions (Total 100 points: 50 each)
    const insertedQuestions = await db
      .insert(hcContractReviewTestQuestions)
      .values([
        {
          configId: cfg.id,
          questionText: 'Apa tindakan pertama saat terjadi kebocoran oli hidrolik?',
          optionA: 'Matikan engine dan pasang lock out / tag out',
          optionB: 'Terus operasikan sampai shift selesai',
          optionC: 'Siram dengan air bertekanan tinggi',
          optionD: 'Abaikan jika tetesan kecil',
          correctOption: 'A',
          points: 50,
          sortOrder: 1,
        },
        {
          configId: cfg.id,
          questionText: 'Berapa standar torsi baut roda HD785?',
          optionA: '150 Nm',
          optionB: '850 Nm sesuai Shop Manual',
          optionC: 'Secukupnya dengan pipa sambungan',
          optionD: 'Tidak perlu diukur',
          correctOption: 'B',
          points: 50,
          sortOrder: 2,
        },
      ])
      .returning()

    assert.equal(insertedQuestions.length, 2)
    q1Id = insertedQuestions[0].id
    q2Id = insertedQuestions[1].id
  })

  await t.test('2. Create Contract Review Record with Online Test Requirement', async () => {
    const [review] = await db
      .insert(hcEmployeeContractReviews)
      .values({
        employeeId: createdEmployeeId,
        employeeNameStr: emp.name || 'Test Employee',
        reviewType: 'contract',
        contractLength: '12 Bulan',
        todayDate: new Date().toISOString().slice(0, 10),
        hireDate: new Date().toISOString().slice(0, 10),
        leaderName: 'PJO UAT Tester',
        leaderTitle: 'Project Manager',
        superiorName: 'Section Head UAT',
        superiorTitle: 'Section Head',
        hrName: 'Kesuma Bagaskara',
        hrTitle: 'HR-GA',
        nextSuperiorName: 'Romy Hidayat',
        nextSuperiorTitle: 'Dept Head',
        recommendation: 'contract_extended',
        contractExtendedMonths: 12,
        status: 'in_progress',
        testRequired: true,
        testConfigId: testConfigId,
        testStatus: 'pending',
        testAttemptCount: 0,
        allowApproverCustomization: true,
      })
      .returning()

    assert.ok(review?.id, 'Contract review record must be created')
    createdReviewId = review.id

    // Insert approval steps (Step 1: PJO, Step 2: Employee, Step 3: Section Head)
    await db.insert(hcContractReviewApprovals).values([
      {
        reviewId: review.id,
        stepOrder: 1,
        approvalToken: step1Token,
        approverName: 'PJO UAT Tester',
        approverRole: 'pjo_or_te_initial',
        status: 'pending',
      },
      {
        reviewId: review.id,
        stepOrder: 2,
        approvalToken: step2Token,
        approverName: emp.name || 'Test Employee',
        approverRole: 'employee',
        status: 'waiting',
      },
      {
        reviewId: review.id,
        stepOrder: 3,
        approvalToken: step3Token,
        approverName: 'Section Head UAT',
        approverRole: 'section_head_confirmation',
        status: 'waiting',
      },
    ])

    // Verify getContractReviewById joins testConfig
    const fetched = await getContractReviewById(review.id)
    assert.equal(fetched.success, true, `getContractReviewById failed: ${fetched.error}`)
    assert.ok(fetched.data, 'Must return data')
    assert.equal(fetched.data.testRequired, true)
    assert.equal(fetched.data.testStatus, 'pending')
    assert.equal(fetched.data.testConfig?.id, testConfigId)
  })

  await t.test('3. Verify Step 1 Blocker: PJO cannot approve before Test is Completed & Passed', async () => {
    const attemptSign = await approveContractReviewStep(step1Token, {
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      remarks: 'Persetujuan PJO saat test masih pending',
    })

    assert.equal(attemptSign.success, false, 'Approval must FAIL when online test is not passed')
    assert.ok(
      attemptSign.error?.includes('Ujian Online') || attemptSign.error?.includes('belum menyelesaikan'),
      `Error message must indicate test blocking: ${attemptSign.error}`
    )
  })

  let attemptToken = ''
  await t.test('4. Employee Takes Online Test & Submits Passing Answers', async () => {
    // Generate attempt
    const attempt = await generateContractReviewTestAttempt({
      employeeId: createdEmployeeId!,
      configId: testConfigId!,
      reviewId: createdReviewId!,
    })

    assert.ok(attempt?.accessToken, 'Must generate attempt with accessToken')
    attemptToken = attempt.accessToken

    // Start attempt
    const started = await startContractReviewTestAttempt(attemptToken)
    assert.equal(started.status, 'in_progress')

    // Submit answers: both correct (A & B) -> 100%
    const answers: Record<string, string> = {}
    answers[String(q1Id!)] = 'A'
    answers[String(q2Id!)] = 'B'

    const submitRes = await submitContractReviewTestAttempt(attemptToken, answers)

    assert.equal(submitRes.success, true, 'Submit attempt must succeed')
    assert.equal(submitRes.score, 100)
    assert.equal(submitRes.status, 'passed')

    // Check review record was updated with test completion
    const updatedReview = await getContractReviewById(createdReviewId!)
    assert.equal(updatedReview.data?.testStatus, 'passed')
    assert.equal(updatedReview.data?.testFinalScore, 100)
    assert.equal(updatedReview.data?.testAttemptCount, 1)
  })

  await t.test('5. Step 1 Approval Now Succeeds and Unlocks Step 2', async () => {
    const pjoSign = await approveContractReviewStep(step1Token, {
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      remarks: 'Nilai ujian bagus 100%, saya rekomendasikan perpanjangan.',
    })

    assert.equal(pjoSign.success, true, `PJO approval failed: ${pjoSign.error}`)

    // Check Step 1 is approved and Step 2 is pending
    const steps = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, createdReviewId!))
      .orderBy(asc(hcContractReviewApprovals.stepOrder))

    assert.equal(steps[0].status, 'approved')
    assert.equal(steps[1].status, 'pending')
  })

  await t.test('6. Approver Can Edit Review & Recommendation, and Add Approver Row', async () => {
    // Non-employee approver (Step 1 token) edits evaluation
    const editRes = await updateContractReviewByApproverToken(step1Token, {
      recommendation: 'confirm_permanent',
      compDisciplineAch: 'Exceed',
      compDisciplineRemark: 'Sangat disiplin dan tepat waktu',
    })
    assert.equal(editRes.success, true, `Approver edit failed: ${editRes.error}`)

    const reviewAfterEdit = await getContractReviewById(createdReviewId!)
    assert.equal(reviewAfterEdit.data?.recommendation, 'confirm_permanent')
    assert.equal(reviewAfterEdit.data?.compDisciplineAch, 'Exceed')

    // Add new approver row after Step 1
    const addRes = await addContractReviewApproverRow(step1Token, {
      approverName: 'Deputy Project Manager UAT',
      approverEmail: 'deputy.pjo@example.com',
      approverRole: 'Deputy PJO',
    })
    assert.equal(addRes.success, true, `Add approver row failed: ${addRes.error}`)
    assert.ok(addRes.createdStep?.approvalToken)
    newlyInsertedStepToken = addRes.createdStep!.approvalToken

    // Verify step orders shifted:
    // Step 1: PJO (approved)
    // Step 2: Deputy PJO (newly added, pending)
    // Step 3: Employee (shifted from 2)
    // Step 4: Section Head (shifted from 3)
    const updatedSteps = await db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, createdReviewId!))
      .orderBy(asc(hcContractReviewApprovals.stepOrder))

    assert.equal(updatedSteps.length, 4, 'Must have 4 steps now')
    assert.equal(updatedSteps[1].approverName, 'Deputy Project Manager UAT')
    assert.equal(updatedSteps[2].approverRole, 'employee')
  })

  await t.test('7. Employee Security: Employee cannot edit evaluation or add approver', async () => {
    // Employee tries to edit evaluation
    const hackEdit = await updateContractReviewByApproverToken(step2Token, {
      recommendation: 'confirm_permanent',
    })
    assert.equal(hackEdit.success, false, 'Employee MUST NOT be able to edit evaluation')

    // Employee tries to add approver
    const hackAdd = await addContractReviewApproverRow(step2Token, {
      approverName: 'Teman Karyawan',
      approverEmail: 'teman@example.com',
      approverRole: 'Witness',
    })
    assert.equal(hackAdd.success, false, 'Employee MUST NOT be able to add approver')
  })

  await t.test('8. Sequential Signing: Deputy PJO Signs then Employee Signs Document Successfully', async () => {
    // 8a. Deputy PJO signs Step 2 (using unique signature)
    const deputySign = await approveContractReviewStep(newlyInsertedStepToken, {
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      remarks: 'Disetujui oleh Deputy PJO.',
    })
    assert.equal(deputySign.success, true, `Deputy PJO sign failed: ${deputySign.error}`)

    // 8b. Now Employee Step (Order 3) is active/pending, Employee signs (using another unique signature)
    const empSign = await approveContractReviewStep(step2Token, {
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwGA/Qd9rwAAAABJRU5ErkJggg==',
      remarks: 'Saya menyetujui hasil evaluasi kontrak.',
    })
    assert.equal(empSign.success, true, `Employee sign failed: ${empSign.error}`)
  })

  // Cleanup after live tests
  await t.test('9. Cleanup Test Records', async () => {
    if (createdReviewId) {
      await db.delete(hcContractReviewApprovals).where(eq(hcContractReviewApprovals.reviewId, createdReviewId))
      await db.delete(hcContractReviewTestAttempts).where(eq(hcContractReviewTestAttempts.reviewId, createdReviewId))
      await db.delete(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, createdReviewId))
    }
    if (testConfigId) {
      await db.delete(hcContractReviewTestQuestions).where(eq(hcContractReviewTestQuestions.configId, testConfigId))
      await db.delete(hcContractReviewTestConfigs).where(eq(hcContractReviewTestConfigs.id, testConfigId))
    }
  })
})
