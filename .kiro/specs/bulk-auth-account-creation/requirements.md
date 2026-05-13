# Requirements Document

## Introduction

This feature enables administrators to bulk-create authentication accounts for employees who were imported from the DATA HERO Excel file but do not yet have linked auth accounts. The system uses the `email_password_migration` field (containing default passwords in "Chitra#[EmployeeID]" format) to provision credential-based accounts in the Better Auth `user` and `account` tables, then links them back to the employee record via `authUserId`.

## Glossary

- **Bulk_Provisioner**: The server-side action responsible for iterating over eligible employees and creating auth accounts in batch
- **Admin**: An authenticated user with administrative privileges who triggers the bulk account creation
- **Eligible_Employee**: An employee record in `hero_hr_employees` that has a non-null `email` field and a null `authUserId` field
- **Auth_User**: A record in the `user` table representing an authenticated identity
- **Credential_Account**: A record in the `account` table with `providerId = 'credential'` linking a hashed password to an Auth_User
- **Default_Password**: The value stored in `email_password_migration` field, typically in "Chitra#[EmployeeID]" format
- **Provisioning_Summary**: A report object containing counts of created, skipped, and failed account operations

## Requirements

### Requirement 1: Identify Eligible Employees

**User Story:** As an Admin, I want the system to identify all employees who have an email but no linked auth account, so that I can provision accounts only for those who need them.

#### Acceptance Criteria

1. WHEN the Admin triggers bulk account creation, THE Bulk_Provisioner SHALL query all employee records where `email` is not null and not empty and `authUserId` is null
2. WHEN an employee has a null `email` field or an `email` field containing only whitespace characters, THE Bulk_Provisioner SHALL exclude that employee from the eligible set
3. WHEN an employee already has a non-null `authUserId`, THE Bulk_Provisioner SHALL exclude that employee from the eligible set
4. WHEN the eligible employee query completes, THE Bulk_Provisioner SHALL display the count of Eligible_Employees to the Admin before processing begins
5. IF the eligible employee query fails or returns an error, THEN THE Bulk_Provisioner SHALL display an error message indicating the query failure and SHALL NOT proceed with account creation
6. WHEN the eligible employee set is determined, THE Bulk_Provisioner SHALL process a maximum of 500 employee records per bulk operation

### Requirement 2: Determine Password for Each Employee

**User Story:** As an Admin, I want the system to use the stored default password from the Excel import, so that employees can log in with their known credentials.

#### Acceptance Criteria

1. WHEN an Eligible_Employee has an `email_password_migration` value that contains at least one non-whitespace character, THE Bulk_Provisioner SHALL use that trimmed value as the plaintext password for account creation
2. WHEN an Eligible_Employee has a null, empty, or whitespace-only `email_password_migration` value, THE Bulk_Provisioner SHALL generate a default password by concatenating the literal string "Chitra#" with the employee's `employee_id` field value (e.g., for employee_id "1045", the password is "Chitra#1045")
3. WHEN the plaintext password has been determined for an Eligible_Employee, THE Bulk_Provisioner SHALL hash it using the `hashPassword` function from `better-auth/crypto` before passing it to the Credential_Account creation step
4. IF the `hashPassword` function throws an error for a given employee, THEN THE Bulk_Provisioner SHALL skip that employee and record the failure reason in the Provisioning_Summary

### Requirement 3: Create Auth User Record

**User Story:** As an Admin, I want the system to create a user record in the auth system for each eligible employee, so that they have an identity to authenticate against.

#### Acceptance Criteria

1. WHEN processing an Eligible_Employee, THE Bulk_Provisioner SHALL create a record in the `user` table with the employee's `fullName` as `name` and the normalized email (trimmed and lowercased) as `email`
2. THE Bulk_Provisioner SHALL set `emailVerified` to true, `createdAt` to the current timestamp, and `updatedAt` to the current timestamp for each created Auth_User
3. THE Bulk_Provisioner SHALL generate a unique v4 UUID as the `id` for each Auth_User
4. WHEN a user record with the same email (compared case-insensitively) already exists in the `user` table, THE Bulk_Provisioner SHALL reuse that existing Auth_User's `id` without modifying the existing record's fields
5. IF inserting an Auth_User record fails due to a unique constraint violation on email, THEN THE Bulk_Provisioner SHALL treat the conflict as a duplicate, retrieve the existing Auth_User, and continue processing

### Requirement 4: Create Credential Account Record

**User Story:** As an Admin, I want the system to create a credential account linked to the auth user, so that employees can sign in with email and password.

#### Acceptance Criteria

1. WHEN an Auth_User is created or found for an Eligible_Employee, THE Bulk_Provisioner SHALL create a Credential_Account record in the `account` table with a unique UUID as the `id` and the `userId` set to the Auth_User's `id`
2. THE Bulk_Provisioner SHALL set the `accountId` to the normalized (trimmed, lowercased) email address
3. THE Bulk_Provisioner SHALL set `providerId` to "credential" for each created account
4. THE Bulk_Provisioner SHALL store the hashed password in the `password` field of the Credential_Account
5. WHEN a Credential_Account already exists matching the Auth_User's `userId` or the normalized email as `accountId` with `providerId` equal to "credential", THE Bulk_Provisioner SHALL update the existing record's `accountId`, `password`, and `updatedAt` fields rather than creating a duplicate
6. THE Bulk_Provisioner SHALL set `createdAt` to the current timestamp when inserting a new Credential_Account and `updatedAt` to the current timestamp on both insert and update

### Requirement 5: Link Auth User to Employee Record

**User Story:** As an Admin, I want the created auth user to be linked back to the employee record, so that the system can associate login sessions with employee data.

#### Acceptance Criteria

1. WHEN an Auth_User is successfully created or found for an Eligible_Employee, THE Bulk_Provisioner SHALL update the employee's `authUserId` field in the `hero_hr_employees` table row identified by the employee's primary key
2. IF updating the `authUserId` field fails due to a database error or constraint violation, THEN THE Bulk_Provisioner SHALL record the employee identifier, the Auth_User id that was attempted, and the error description in the Provisioning_Summary, and continue processing remaining employees
3. IF the link update fails after Auth_User and Credential_Account creation, THE Bulk_Provisioner SHALL NOT roll back the auth records, since subsequent re-runs will reuse the existing Auth_User per Requirement 3 criterion 4

### Requirement 6: Provide Provisioning Summary

**User Story:** As an Admin, I want to see a summary of the bulk operation results, so that I can verify the process completed correctly and identify any issues.

#### Acceptance Criteria

1. WHEN the Bulk_Provisioner has attempted provisioning for all Eligible_Employees in the input set, THE Bulk_Provisioner SHALL return a Provisioning_Summary to the Admin interface containing the total number of Eligible_Employees processed
2. THE Provisioning_Summary SHALL include the count of accounts successfully created
3. THE Provisioning_Summary SHALL include the count of employees skipped due to pre-existing auth accounts found during processing
4. THE Provisioning_Summary SHALL include the count of employees that failed, and for each failure, the employee identifier and a single error message describing the reason for failure
5. THE Provisioning_Summary SHALL satisfy the invariant that total processed equals the sum of successfully created, skipped, and failed counts
6. IF the bulk provisioning operation is interrupted before all Eligible_Employees are attempted, THEN THE Bulk_Provisioner SHALL return a partial Provisioning_Summary containing the counts accumulated up to the point of interruption and an indication that the operation did not complete

### Requirement 7: Error Handling and Resilience

**User Story:** As an Admin, I want the bulk process to continue even if individual accounts fail, so that one bad record does not block the entire operation.

#### Acceptance Criteria

1. IF creating an Auth_User or Credential_Account fails for a single employee, THEN THE Bulk_Provisioner SHALL record the employee identifier, the step that failed, and the error description in the Provisioning_Summary, and continue processing the next employee
2. IF a database connection error occurs during processing, THEN THE Bulk_Provisioner SHALL halt processing, preserve all previously committed accounts, and return a partial Provisioning_Summary that includes the count of successfully processed employees, the count of failed employees, and the connection error description
3. THE Bulk_Provisioner SHALL process employees sequentially, one at a time, in the order they appear in the input list
4. IF the email for an Eligible_Employee does not conform to the format local-part@domain where local-part and domain each contain at least one character and domain contains at least one dot, THEN THE Bulk_Provisioner SHALL skip that employee and record the employee identifier and the reason for rejection in the Provisioning_Summary
5. IF the number of consecutive individual employee failures reaches 10, THEN THE Bulk_Provisioner SHALL halt processing and return a partial Provisioning_Summary indicating the failure threshold was exceeded

### Requirement 8: Admin Authorization

**User Story:** As a system owner, I want only authorized administrators to trigger bulk account creation, so that unauthorized users cannot provision accounts.

#### Acceptance Criteria

1. IF a request to trigger bulk account creation is received from a user without the admin role, THEN THE Bulk_Provisioner SHALL reject the request without processing any accounts and SHALL return a response indicating authorization failure
2. THE Bulk_Provisioner SHALL verify the requesting user's admin role before beginning any processing of the bulk account creation request
3. WHEN an admin user successfully triggers bulk provisioning, THE Bulk_Provisioner SHALL log the admin user's unique identifier and a timestamp to the audit record
4. IF a request to trigger bulk account creation is received without valid authentication credentials, THEN THE Bulk_Provisioner SHALL reject the request and SHALL return a response indicating authentication failure
