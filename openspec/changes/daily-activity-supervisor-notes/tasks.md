# Tasks

## 1. Storage and authorization
- [ ] 1.1 Verify the authoritative Supervisor threshold, add append-only notes and enforce Daily Activity permissions, owner visibility, and row scope. Test denied reads/writes and ensure field remarks are untouched.

## 2. Dashboard and feedback
- [ ] 2.1 Add Catatan Atasan column and a scoped form and history dialog using HERO templates. Test rows with multiple activities and keep notes out of exports.
- [ ] 2.2 Wire the employee notification to the HERO bell and verify it opens the authorized activity detail.

## 3. Release verification
- [ ] 3.1 Run E2E with supervisor, activity owner and unauthorized employee fixtures; capture sanitized evidence, update the internal report and verify the migration before any authorized Git release.
