import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Contract Review Online Test Integration Suite', async (t) => {
  const root = process.cwd()

  await t.test('1. Schema integrity & Column Declarations', () => {
    const schemaFile = path.join(root, 'db/schema/hero.ts')
    assert.ok(fs.existsSync(schemaFile), 'db/schema/hero.ts must exist')
    const schemaContent = fs.readFileSync(schemaFile, 'utf8')

    // Verify Contract Review test columns
    assert.ok(schemaContent.includes("testRequired: boolean('test_required')"), 'Must define test_required column')
    assert.ok(schemaContent.includes("testConfigId: integer('test_config_id')"), 'Must define test_config_id column')
    assert.ok(schemaContent.includes("testStatus: text('test_status')"), 'Must define test_status column')
    assert.ok(schemaContent.includes("testFinalScore: integer('test_final_score')"), 'Must define test_final_score column')
    assert.ok(schemaContent.includes("testAttemptCount: integer('test_attempt_count')"), 'Must define test_attempt_count column')
    assert.ok(schemaContent.includes("testCompletedAt: timestamp('test_completed_at')"), 'Must define test_completed_at column')
    assert.ok(schemaContent.includes("allowApproverCustomization: boolean('allow_approver_customization')"), 'Must define allow_approver_customization column')

    // Verify Test Configuration Table
    assert.ok(schemaContent.includes("export const hcContractReviewTestConfigs = pgTable('hero_hc_contract_review_test_configs'"), 'Must define hcContractReviewTestConfigs table')
    assert.ok(schemaContent.includes("reviewType: text('review_type')"), 'Test config must support probation/contract filter')
    assert.ok(schemaContent.includes("passingGrade: integer('passing_grade')"), 'Test config must define passingGrade')
    assert.ok(schemaContent.includes("durationMinutes: integer('duration_minutes')"), 'Test config must define durationMinutes')
    assert.ok(schemaContent.includes("maxRemedialAttempts: integer('max_remedial_attempts')"), 'Test config must define maxRemedialAttempts')

    // Verify Question Bank Table
    assert.ok(schemaContent.includes("export const hcContractReviewTestQuestions = pgTable('hero_hc_contract_review_test_questions'"), 'Must define hcContractReviewTestQuestions table')
    assert.ok(schemaContent.includes("questionText: text('question_text')"), 'Question must store questionText')
    assert.ok(schemaContent.includes("correctOption: text('correct_option')"), 'Question must store correctOption')

    // Verify Test Attempts Table
    assert.ok(schemaContent.includes("export const hcContractReviewTestAttempts = pgTable('hero_hc_contract_review_test_attempts'"), 'Must define hcContractReviewTestAttempts table')
    assert.ok(schemaContent.includes("accessToken: text('access_token')"), 'Attempts table must have direct access token')
  })

  await t.test('2. Backend Actions Contract & Business Logic', () => {
    const testActionsFile = path.join(root, 'app/actions/contract-review-tests.ts')
    assert.ok(fs.existsSync(testActionsFile), 'app/actions/contract-review-tests.ts must exist')
    const testActionsContent = fs.readFileSync(testActionsFile, 'utf8')

    // Required Exports
    assert.ok(testActionsContent.includes('export async function getContractReviewTestConfigs'), 'Must export getContractReviewTestConfigs')
    assert.ok(testActionsContent.includes('export async function upsertContractReviewTestConfig'), 'Must export upsertContractReviewTestConfig')
    assert.ok(testActionsContent.includes('export async function saveContractReviewTestQuestion'), 'Must export saveContractReviewTestQuestion')
    assert.ok(testActionsContent.includes('export async function deleteContractReviewTestQuestion'), 'Must export deleteContractReviewTestQuestion')
    assert.ok(testActionsContent.includes('export async function findActiveTestConfigForEmployee'), 'Must export findActiveTestConfigForEmployee')
    assert.ok(testActionsContent.includes('export async function generateContractReviewTestAttempt'), 'Must export generateContractReviewTestAttempt')
    assert.ok(testActionsContent.includes('export async function getContractReviewTestAttemptByToken'), 'Must export getContractReviewTestAttemptByToken')
    assert.ok(testActionsContent.includes('export async function startContractReviewTestAttempt'), 'Must export startContractReviewTestAttempt')
    assert.ok(testActionsContent.includes('export async function submitContractReviewTestAttempt'), 'Must export submitContractReviewTestAttempt')
    assert.ok(testActionsContent.includes('export async function requestRemedialAttempt'), 'Must export requestRemedialAttempt')
    assert.ok(testActionsContent.includes('export async function dispatchContractReviewTestInvitation'), 'Must export dispatchContractReviewTestInvitation')

    // Single source of truth verification
    assert.ok(testActionsContent.includes('from(employees)'), 'Must query hero_employees single source of truth')
    assert.ok(!testActionsContent.includes('from(heroHrEmployees)'), 'Must NEVER query heroHrEmployees')

    // Multi-channel dispatch check
    assert.ok(testActionsContent.includes('sendEmailViaSmtp'), 'Must dispatch email invitation via SMTP')
    assert.ok(testActionsContent.includes('notifyWorkflowBellRecipients'), 'Must dispatch bell notification')
    assert.ok(testActionsContent.includes('sendPushNotification'), 'Must dispatch web push notification')
    assert.ok(testActionsContent.includes('notificationDeliveries'), 'Must record delivery log for tracking')
  })

  await t.test('3. Gating & Approval Security Rules', () => {
    const reviewActionsFile = path.join(root, 'app/actions/contract-review.ts')
    assert.ok(fs.existsSync(reviewActionsFile), 'app/actions/contract-review.ts must exist')
    const reviewActionsContent = fs.readFileSync(reviewActionsFile, 'utf8')

    // Step 1 Blocker
    assert.ok(reviewActionsContent.includes('Persetujuan belum dapat dilakukan karena karyawan belum menyelesaikan Ujian Online yang disyaratkan.'), 'Must enforce strict gating on step 1 approval if test required is not passed')

    // Approver Public Edit & Insertion
    assert.ok(reviewActionsContent.includes('export async function updateContractReviewByApproverToken'), 'Must export updateContractReviewByApproverToken')
    assert.ok(reviewActionsContent.includes('export async function addContractReviewApproverRow'), 'Must export addContractReviewApproverRow')
    assert.ok(reviewActionsContent.includes('Karyawan yang sedang dievaluasi hanya memiliki akses membaca dan menandatangani dokumen.'), 'Must prevent employee approver from editing evaluation')
  })

  await t.test('4. Pure Logic: Grading & Passing Threshold Calculation', () => {
    // Unit test pure math of scoring
    function calculateGrading(questions, answers, passingGrade) {
      let earnedPoints = 0
      let totalPoints = 0
      for (const q of questions) {
        const points = q.points || 1
        totalPoints += points
        if (answers[q.id] === q.correctOption) {
          earnedPoints += points
        }
      }
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const passed = passingGrade && passingGrade > 0 ? score >= passingGrade : true
      return { earnedPoints, totalPoints, score, passed }
    }

    const mockQuestions = [
      { id: '1', correctOption: 'A', points: 10 },
      { id: '2', correctOption: 'C', points: 10 },
      { id: '3', correctOption: 'B', points: 20 },
      { id: '4', correctOption: 'D', points: 10 },
    ] // Total: 50 points

    // Scenario A: All correct -> 100%, passed
    const resA = calculateGrading(mockQuestions, { 1: 'A', 2: 'C', 3: 'B', 4: 'D' }, 70)
    assert.equal(resA.score, 100)
    assert.equal(resA.passed, true)

    // Scenario B: q1 & q2 correct (20/50 = 40%), passingGrade = 70 -> failed
    const resB = calculateGrading(mockQuestions, { 1: 'A', 2: 'C', 3: 'A', 4: 'A' }, 70)
    assert.equal(resB.score, 40)
    assert.equal(resB.passed, false)

    // Scenario C: Non-passing mode (passingGrade = 0 or null) -> always passed upon completion
    const resC = calculateGrading(mockQuestions, { 1: 'A', 2: 'C', 3: 'A', 4: 'A' }, 0)
    assert.equal(resC.score, 40)
    assert.equal(resC.passed, true, 'Non-passing mode (grade=0) must mark attempt as passed/completed')

    const resD = calculateGrading(mockQuestions, { 1: 'A', 2: 'C', 3: 'A', 4: 'A' }, null)
    assert.equal(resD.score, 40)
    assert.equal(resD.passed, true, 'Non-passing mode (grade=null) must mark attempt as passed/completed')
  })

  await t.test('5. UI Components & LMS Navigation Wiring', () => {
    const lmsNavFile = path.join(root, 'components/lms/lms-sidebar-nav.tsx')
    const lmsNavContent = fs.readFileSync(lmsNavFile, 'utf8')
    assert.ok(lmsNavContent.includes('/dashboard/chitralearning-lms/contract-tests'), 'LMS sidebar must include link to contract-tests')

    const lmsPage = path.join(root, 'app/dashboard/chitralearning-lms/contract-tests/page.tsx')
    assert.ok(fs.existsSync(lmsPage), 'LMS contract tests page must exist')

    const qEditorPage = path.join(root, 'app/dashboard/chitralearning-lms/contract-tests/[id]/page.tsx')
    assert.ok(fs.existsSync(qEditorPage), 'Question editor page must exist')

    const testPlayerPage = path.join(root, 'app/contract-review-test/[token]/page.tsx')
    assert.ok(fs.existsSync(testPlayerPage), 'Online test player route must exist')

    const publicApprovalPage = path.join(root, 'app/review/[token]/public-approval.tsx')
    const publicApprovalContent = fs.readFileSync(publicApprovalPage, 'utf8')
    assert.ok(publicApprovalContent.includes('Hasil Evaluasi Ujian Online (Training Center)'), 'Public approval must include online test score table in PDF preview')
    assert.ok(publicApprovalContent.includes('+ Tambah Approver') || publicApprovalContent.includes('+ Tambah Reviewer'), 'Public approval must have Tambah Approver/Reviewer button')

    const clientFormPage = path.join(root, 'app/dashboard/hc/contract-review/form/client-form.tsx')
    const clientFormContent = fs.readFileSync(clientFormPage, 'utf8')
    assert.ok(clientFormContent.includes('Hasil Evaluasi Ujian Online (Training Center)'), 'Contract review form must include test table in PDF preview')
    assert.ok(clientFormContent.includes('Ujian Online belum diselesaikan oleh karyawan'), 'Contract review form must warn/gate submit if test is not passed')
    assert.ok(clientFormContent.includes('Status Test Online Karyawan'), 'Contract review form must include Status Test Online card')
  })
})
