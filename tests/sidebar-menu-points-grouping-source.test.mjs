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

test("chitralearning lms menu is additive and leaves old lms menus in place", () => {
  const heroAdmin = read("lib/hero-admin.ts");
  const appSidebar = read("components/app-sidebar.tsx");
  const newPage = read("app/dashboard/chitralearning-lms/page.tsx");

  assert.match(heroAdmin, /section: 'Human Capital',[\s\S]{0,120}groupLabel: 'Training Center',[\s\S]{0,120}title: 'Training Records',[\s\S]{0,120}url: '\/dashboard\/training-records'/);
  assert.match(heroAdmin, /section: 'Human Capital',[\s\S]{0,120}groupLabel: 'Training Center',[\s\S]{0,120}title: 'LMS Chitra Learning',[\s\S]{0,120}url: '\/dashboard\/lms'/);
  assert.match(heroAdmin, /section: 'ChitraLearning LMS',[\s\S]{0,140}title: 'Learning Workspace',[\s\S]{0,120}url: '\/dashboard\/chitralearning-lms'/);
  assert.match(appSidebar, /"ChitraLearning LMS"/);
  assert.match(newPage, /Internal LMS/);
  assert.match(newPage, /buildInternalLmsLearnerCourses/);
  assert.match(newPage, /ChitraLearningVideoPlayer/);
  assert.match(newPage, /LmsGroupedTable/);
  assert.match(newPage, /createInternalLmsCourseAction/);
  assert.match(newPage, /createInternalLmsLessonAction/);
  assert.match(newPage, /createInternalLmsQuizQuestionAction/);
  assert.match(newPage, /createInternalLmsAccessRuleAction/);
  assert.match(newPage, /issueInternalLmsCertificateAction/);
  assert.match(newPage, /startInternalLmsCourseAction/);
  assert.match(newPage, /submitInternalLmsQuizAction/);
  assert.match(newPage, /cloneInternalLmsCourseAction/);
  assert.match(newPage, /duplicateInternalLmsQuestionAction/);
  assert.match(newPage, /updateInternalLmsCourseGovernanceAction/);
  assert.match(newPage, /runInternalLmsReminderAction/);
  assert.match(newPage, /createInternalLmsCampaignAction/);
  assert.match(newPage, /publishInternalLmsCampaignAction/);
  assert.match(newPage, /submitInternalLmsAssignmentResponseAction/);
  assert.match(newPage, /Download Certificate/);
  assert.match(newPage, /Quiz dadakan \/ refreshment/);
  assert.match(newPage, /Tugas refreshment saya/);
  assert.match(newPage, /previewCourseId/);
  assert.match(newPage, /Dashboard compliance/);
  assert.match(newPage, /Matrix training wajib per role/);
  assert.match(newPage, /Export Excel/);
  assert.match(newPage, /Audit log/);
  assert.match(newPage, /feature: "My Learning"/);
  assert.match(newPage, /feature: "Curriculum lesson\/resource\/video"/);
  assert.match(newPage, /feature: "Quiz start\/answer\/summary\/report"/);
  assert.match(newPage, /feature: "Cart, payment, wallet, refund, coupons"[\s\S]{0,180}status: "Skip aman"/);
});

test("chitralearning internal lms schema covers non-commercial learning flow", () => {
  const heroSchema = read("db/schema/hero.ts");
  const helper = read("lib/chitralearning-lms.ts");

  assert.match(heroSchema, /hero_chitralearning_courses/);
  assert.match(heroSchema, /dueDays: integer\('due_days'\)/);
  assert.match(heroSchema, /hero_chitralearning_lessons/);
  assert.match(heroSchema, /hero_chitralearning_quiz_questions/);
  assert.match(heroSchema, /testPhase: text\('test_phase'\)/);
  assert.match(heroSchema, /questionImageUrl: text\('question_image_url'\)/);
  assert.match(heroSchema, /optionAImageUrl: text\('option_a_image_url'\)/);
  assert.match(heroSchema, /hero_chitralearning_course_access/);
  assert.match(heroSchema, /pretestScore: integer\('pretest_score'\)/);
  assert.match(heroSchema, /posttestScore: integer\('posttest_score'\)/);
  assert.match(heroSchema, /lastPositionSeconds: integer\('last_position_seconds'\)/);
  assert.match(heroSchema, /hero_chitralearning_certificates/);
  assert.match(heroSchema, /hero_chitralearning_campaigns/);
  assert.match(heroSchema, /hero_chitralearning_campaign_participants/);
  assert.match(heroSchema, /hero_chitralearning_assignment_responses/);
  assert.match(heroSchema, /hero_chitralearning_audit_logs/);
  assert.match(helper, /feature: "Video \/ materi"/);
  assert.match(helper, /feature: "Quiz"/);
  assert.match(helper, /INTERNAL_LMS_TEST_PHASES/);
  assert.match(helper, /INTERNAL_LMS_CAMPAIGN_TYPES/);
  assert.match(helper, /INTERNAL_LMS_CAMPAIGN_TARGET_TYPES/);
  assert.match(helper, /buildInternalLmsComplianceRows/);
  assert.match(helper, /buildInternalLmsRefreshmentRows/);
  assert.match(helper, /summarizeInternalLmsRefreshments/);
  assert.match(helper, /optionalRelationRows/);
  assert.match(helper, /does not exist/);
  assert.match(helper, /buildInternalLmsRoleMatrix/);
  assert.match(helper, /runInternalLmsReminderTick/);
  assert.match(helper, /feature: "Certificate"/);
  assert.match(helper, /feature: "Access control"/);
  assert.match(helper, /feature: "Commercial flow"[\s\S]{0,180}status: "Tidak dipakai"/);

  const page = read("app/dashboard/chitralearning-lms/page.tsx");
  const actions = read("app/dashboard/chitralearning-lms/actions.ts");
  const videoPlayer = read("components/chitralearning-video-player.tsx");
  const certificateRoute = read("app/api/chitralearning-lms/certificates/[certificateId]/route.ts");
  const exportRoute = read("app/api/chitralearning-lms/export/route.ts");
  const reminderRoute = read("app/api/cron/chitralearning-lms-reminders/route.ts");

  assert.match(page, /name="testPhase"/);
  assert.match(page, /name="questionImageUrl"/);
  assert.match(page, /name="optionAImageUrl"/);
  assert.match(page, /Question bank/);
  assert.match(page, /Score \{score == null \? "-" : `\$\{score\}%`\}/);
  assert.match(page, /Minimal lolos \{course\.passingScore\}%/);
  assert.match(actions, /testPhase: textValue\(formData, "testPhase"/);
  assert.match(actions, /questionImageUrl: textValue\(formData, "questionImageUrl"\)/);
  assert.match(actions, /saveInternalLmsVideoProgressAction/);
  assert.match(actions, /posttestStatus: passed \? "passed" : "failed"/);
  assert.match(actions, /issueCertificateForEmployee/);
  assert.match(actions, /createInternalLmsCampaignAction/);
  assert.match(actions, /publishInternalLmsCampaignAction/);
  assert.match(actions, /submitInternalLmsAssignmentResponseAction/);
  assert.match(actions, /action: "campaign_published"/);
  assert.match(actions, /action: "course_published"/);
  assert.match(actions, /action: "passing_score_changed"/);
  assert.match(actions, /action: "certificate_issued"/);
  assert.match(videoPlayer, /onLoadedMetadata/);
  assert.match(videoPlayer, /saveInternalLmsVideoProgressAction/);
  assert.match(certificateRoute, /Content-Disposition/);
  assert.match(certificateRoute, /CERTIFICATE OF COMPLETION/);
  assert.match(exportRoute, /book_append_sheet/);
  assert.match(exportRoute, /Matrix Role/);
  assert.match(reminderRoute, /CRON_SECRET/);
  assert.match(reminderRoute, /runInternalLmsReminderTick/);
});
