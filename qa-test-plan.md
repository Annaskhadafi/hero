# QA Test Plan: User Management Password Reset Fix

**Date:** 2026-05-09
**Tester:** Claude
**Feature:** Admin password reset and manual user creation

## Test Environment
- Dev server: http://localhost:3000
- Database: PostgreSQL (local)

## Test Cases

### 1. Admin Password Reset Flow
**Objective:** Verify admin can reset user password and user can login with new password

**Steps:**
1. Login as admin
2. Navigate to User Management (/dashboard/security/users)
3. Select a test user
4. Click "Reset Password" action
5. Enter new password (min 8 characters)
6. Submit form
7. Verify success message
8. Logout
9. Login as the test user with new password
10. Verify successful login

**Expected Results:**
- Password reset succeeds
- User can login with new password
- Old sessions are revoked
- Database `account` table has correct structure:
  - `provider_id = 'credential'`
  - `account_id = lowercase(email)`
  - `user_id = authUserId`
  - `password` is hashed

---

### 2. Manual User Creation
**Objective:** Verify manually created users can login immediately

**Steps:**
1. Login as admin
2. Navigate to User Management
3. Click "Create User"
4. Fill in required fields:
   - Full name
   - Email (test with mixed case: Test@Example.COM)
   - Password (min 8 characters)
   - Role
5. Submit form
6. Verify success message
7. Logout
8. Login with the new user credentials (use lowercase email)
9. Verify successful login

**Expected Results:**
- User creation succeeds
- Email is normalized to lowercase in database
- User can login immediately
- Credential account has correct structure

---

### 3. Database Verification
**Objective:** Verify credential account structure in database

**SQL Queries:**
```sql
-- Check credential account structure for a test user
SELECT
  a.id,
  a.account_id,
  a.provider_id,
  a.user_id,
  u.email,
  LENGTH(a.password) as password_length
FROM account a
JOIN "user" u ON a.user_id = u.id
WHERE u.email = 'test@example.com'
  AND a.provider_id = 'credential';

-- Verify account_id matches normalized email
SELECT
  u.email,
  a.account_id,
  CASE
    WHEN a.account_id = LOWER(TRIM(u.email)) THEN 'CORRECT'
    ELSE 'INCORRECT'
  END as account_id_status
FROM account a
JOIN "user" u ON a.user_id = u.id
WHERE a.provider_id = 'credential';
```

**Expected Results:**
- `account_id` equals `LOWER(email)`
- `provider_id` equals `'credential'`
- `user_id` equals auth user UUID
- `password` is not null and hashed

---

### 4. Session Revocation
**Objective:** Verify old sessions are revoked after password reset

**Steps:**
1. Login as test user (create session)
2. Note session token/cookie
3. Admin resets password for test user
4. Try to access protected page with old session
5. Verify user is logged out
6. Login with new password
7. Verify new session created

**Expected Results:**
- Old session is deleted from database
- User is forced to re-login
- New session works correctly

---

### 5. Edge Cases

#### 5.1 Email Normalization
**Test:** Create/reset password with mixed case email
- Input: `Test.User@Example.COM`
- Expected: `account_id = 'test.user@example.com'`

#### 5.2 Existing User Update
**Test:** Reset password for user with existing credential account
- Should update existing row, not create duplicate

#### 5.3 Legacy Data Migration
**Test:** User with old `account_id = authUserId` format
- `upsertCredentialAccount` should find and update to new format

#### 5.4 Password Validation
**Test:** Try password < 8 characters
- Expected: Error message "Password baru minimal 8 karakter"

---

## Manual Testing Checklist

Since this is a server-side fix requiring database access and UI interaction, manual testing is required:

- [ ] Start dev server
- [ ] Login as admin
- [ ] Create test user with mixed case email
- [ ] Verify user can login
- [ ] Reset password for existing user
- [ ] Verify old session revoked
- [ ] Verify user can login with new password
- [ ] Check database credential structure
- [ ] Test password validation (< 8 chars)
- [ ] Test with special characters in password

---

## Automated Test Coverage

✅ **Unit Tests** (tests/user-management-password-reset.test.ts):
- Credential accountId is normalized email
- Both create-user and change-password use upsertCredentialAccount
- Credential lookup includes userId, normalized email, legacy authUserId
- Reset form has correct field names
- No duplicated credential logic

---

## Notes for Manual Tester

1. **Database Access Required:** You'll need to query the database to verify credential structure
2. **Admin Access Required:** Tests require admin role to access User Management
3. **Test User:** Create a dedicated test user for password reset testing
4. **Browser DevTools:** Use Network tab to verify API responses
5. **Session Storage:** Clear browser storage between tests

---

## Success Criteria

✅ All automated tests pass
⏳ Manual test cases pass
⏳ Database structure verified
⏳ No regression in existing functionality
⏳ User can login after admin password reset
⏳ Manually created users can login immediately
