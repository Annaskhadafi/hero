# Tasks

## 1. Reproduce and fix quick search clipping

- [x] 1.1 Add a browser regression alongside `tests/mobile-dashboard-redesign.e2e.ts`. At a small viewport and with reduced visible height, assert that sheet controls are within bounds and the `Ban` result is hit-testable inside the dialog, not just visible in the DOM. Record the pre-fix failure and confirm whether clipping is geometry or layering.
- [x] 1.2 Update the local mobile search sheet layout based on the reproduction, preserving filtering, focus, close, and navigation. Run the focused E2E test with a query and category selection, verify a result opens the expected menu, and capture screenshots with standard and reduced viewport heights.

## 2. Integration verification

- [x] 2.1 Run the existing mobile dashboard redesign E2E for regressions. If an Android HERO WebView is available, verify typing and keyboard dismissal on-device; otherwise report that native keyboard behavior was not verified. Use passing evidence for the monthly report per repository policy.
