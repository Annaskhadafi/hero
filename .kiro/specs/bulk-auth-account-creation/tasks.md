# Implementation Plan: Bulk Auth Account Creation

## Overview

Implement the `bulkProvisionAuthAccountsAction` server action in `app/dashboard/admin-actions.ts` that bulk-creates Better Auth credential accounts for employees imported from DATA HERO Excel. The action identifies eligible employees (have email, no auth account), determines passwords, creates auth user + credential records, and links them back to the employee record.

## Tasks

- [x] 1. Implement helper functions and types
  - [x] 1.1 Add `BulkProvisionResult` type and helper functions `determinePassword` and `isValidEmailFormat`
    - Add the `BulkProvisionResult` interface with fields: `success`, `total`, `created`, `skipped`, `failed`, `failures`, `interrupted`
    - Add `determinePassword(employee)` — uses `emailPasswordMigration` if non-empty after trim, otherwise falls back to `"Chitra#" + employeeId`
    - Add `isValidEmailFormat(email)` — validates `local@domain` where domain has at least one dot
    - Place these near the existing `normalizeAuthEmail` and `upsertCredentialAccount` helpers
    - _Requirements: 2.1, 2.2, 7.4_

  - [ ]\* 1.2 Write property tests for `determinePassword` and `isValidEmailFormat`
    - **Property 2: Password determination**
    - **Property 10: Email format validation**
    - **Validates: Requirements 2.1, 2.2, 7.4**

- [x] 2. Implement the `bulkProvisionAuthAccountsAction` server action
  - [x] 2.1 Implement admin authorization check and eligible employee query
    - Verify admin session using existing `getCurrentActorEmail()` and session pattern
    - Query `hero_hr_employees` where email is not null, not empty (trimmed), and `authUserId` is null, ordered by id ASC, limit 500
    - Return early with `{ success: false }` if not authorized
    - Return summary with `total: 0` if no eligible employees found
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 8.1, 8.2, 8.4_

  - [x] 2.2 Implement the sequential processing loop with error isolation and circuit breaker
    - For each eligible employee: validate email format, determine password, hash password, create/find auth user (handle unique constraint conflict), call `upsertCredentialAccount`, update employee `authUserId`
    - Track `created`, `skipped`, `failed` counts and `failures` array
    - Implement circuit breaker: halt after 10 consecutive failures, reset counter on success
    - Set `interrupted: true` if circuit breaker triggers or connection error occurs
    - Ensure summary invariant: `total === created + skipped + failed`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.3 Add audit logging on successful trigger
    - Log admin user identifier and timestamp using existing `logAuditEvent` utility
    - _Requirements: 8.3_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]\* 4. Write property tests for the bulk provisioning logic
  - [ ]\* 4.1 Write property test for eligibility filter correctness
    - **Property 1: Eligibility filter correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]\* 4.2 Write property test for password hashing guarantee
    - **Property 3: Password is always hashed**
    - **Validates: Requirements 2.3, 4.4**

  - [ ]\* 4.3 Write property test for summary count invariant
    - **Property 8: Summary count invariant**
    - **Validates: Requirements 6.5**

  - [ ]\* 4.4 Write property test for error isolation
    - **Property 9: Error isolation**
    - **Validates: Requirements 7.1**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation reuses existing helpers: `normalizeAuthEmail`, `upsertCredentialAccount`, `hashPassword`, `getCurrentActorEmail`
- No new database migrations needed — all writes target existing `user`, `account`, and `hero_hr_employees` tables
- No UI component in this scope — action can be triggered via admin panel later
- Property tests use `fast-check` library
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4"] }
  ]
}
```
