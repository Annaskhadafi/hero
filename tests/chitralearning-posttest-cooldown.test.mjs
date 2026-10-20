import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("LMS Post-Test Cooldown - source verification and logic integrity", () => {
  const lmsLib = read("lib/chitralearning-lms.ts");
  const actions = read("app/dashboard/chitralearning-lms/actions.ts");
  const quizPlayer = read("components/lms/lms-quiz-player.tsx");
  const mobileLearn = read("app/mobile/chitralearning/learn/[slug]/page.tsx");
  const webLearn = read("app/dashboard/chitralearning-lms/courses/[slug]/learn/page.tsx");
  const mobileCourse = read("app/mobile/chitralearning/courses/[slug]/page.tsx");
  const mobileEnrollButton = read("components/mobile/mobile-chitralearning-enroll-button.tsx");
  const webSidebar = read("components/lms/lms-enrollment-sidebar.tsx");

  // 1. lib/chitralearning-lms.ts
  assert.match(lmsLib, /export const MAX_POSTTEST_ATTEMPTS = 3/);
  assert.match(lmsLib, /export function getNextMonthFirstDay/);
  assert.match(lmsLib, /export function formatIndonesianDate/);
  assert.match(lmsLib, /export function isEnrollmentInCooldown/);

  // 2. app/dashboard/chitralearning-lms/actions.ts
  assert.match(actions, /isEnrollmentInCooldown\(enrollment\)/);
  assert.match(actions, /effectiveMaxRetakes = phase === 'posttest' \? 2 : \(course\.maxRetakes \?\? -1\)/);
  assert.match(actions, /maxAttemptsReached: true/);
  assert.match(actions, /cooldownUntil: cooldownDate/);
  assert.doesNotMatch(actions, /throw new Error\("Anda telah mencapai batas maksimal percobaan tes\."\)/);
  assert.match(actions, /shouldLockCooldown \? getNextMonthFirstDay\(\) : null/);
  assert.match(actions, /existing\.status === 'failed'/);
  assert.match(actions, /reEnrolled: true/);

  // 3. components/lms/lms-quiz-player.tsx
  assert.match(quizPlayer, /effectiveMaxAttempts = maxRetakes >= 0 \? maxRetakes \+ 1 : \(testPhase === 'posttest' \? 3 : -1\)/);
  assert.match(quizPlayer, /isAlreadyExhausted && !submitted/);
  assert.match(quizPlayer, /Batas Percobaan Post-Test Habis/);
  assert.match(quizPlayer, /Batas Percobaan Habis — Tidak Lulus/);
  assert.match(quizPlayer, /Dialog open=\{showExhaustedModal\}/);
  assert.match(quizPlayer, /!isPretest && !isPosttestExhausted && \(effectiveMaxAttempts < 0 \|\| localAttemptCount < effectiveMaxAttempts\)/);

  // 4. Mobile & Web Learn pages
  assert.match(mobileLearn, /!isFailedCooldown/);
  assert.match(mobileLearn, /effectiveMaxRetakes = activeTestPhase === 'posttest' \? 2 : \(course\.maxRetakes \?\? -1\)/);
  assert.match(mobileLearn, /isLockedCooldown=\{isFailedCooldown\}/);
  assert.match(webLearn, /!isFailedCooldown/);
  assert.match(webLearn, /effectiveMaxRetakes = activeTestPhase === 'posttest' \? 2 : \(course\.maxRetakes \?\? -1\)/);
  assert.match(webLearn, /isLockedCooldown=\{isFailedCooldown\}/);

  // 5. Course Detail & CTA
  assert.match(mobileCourse, /isFailed && isCooldown/);
  assert.match(mobileCourse, /Tidak Lulus · Terkunci s\/d/);
  assert.match(mobileCourse, /isReEnroll=\{true\}/);
  assert.match(mobileEnrollButton, /isReEnroll \? '🔄 Daftar Ulang \(Mulai dari Awal\)' : 'Ajukan Enrollment'/);
  assert.match(webSidebar, /enrollmentStatus === 'failed'/);
  assert.match(webSidebar, /Daftar Ulang \(Mulai dari Awal\)/);
});

test("LMS Post-Test Cooldown - date calculation and format functions", () => {
  // Calculation test: 13 October 2026 -> 1 November 2026
  function getNextMonthFirstDay(fromDate = new Date()) {
    const d = new Date(fromDate);
    return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  function formatIndonesianDate(dateInput) {
    if (!dateInput) return '-';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function isEnrollmentInCooldown(enrollment) {
    if (!enrollment) return false;
    if (enrollment.status !== 'failed') return false;
    if (!enrollment.cooldownUntil) return false;
    const cooldownDate = typeof enrollment.cooldownUntil === 'string' ? new Date(enrollment.cooldownUntil) : enrollment.cooldownUntil;
    return new Date().getTime() < cooldownDate.getTime();
  }

  const d = new Date(2026, 9, 13);
  const next = getNextMonthFirstDay(d);
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 10);
  assert.equal(next.getDate(), 1);
  assert.equal(formatIndonesianDate(next), '1 November 2026');

  const future = new Date(Date.now() + 86400000);
  const past = new Date(Date.now() - 86400000);
  assert.equal(isEnrollmentInCooldown({ status: 'failed', cooldownUntil: future }), true);
  assert.equal(isEnrollmentInCooldown({ status: 'failed', cooldownUntil: past }), false);
  assert.equal(isEnrollmentInCooldown({ status: 'in_progress', cooldownUntil: future }), false);
});
