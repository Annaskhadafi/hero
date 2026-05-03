-- Add unique constraints for email fields
-- Migration: add_user_constraints
-- Date: 2026-05-03

-- First, clean up any duplicate emails in hero_employees
WITH duplicates AS (
  SELECT id, email, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at) as rn
  FROM hero_employees
  WHERE email IS NOT NULL AND email != ''''
)
UPDATE hero_employees
SET email = email || ''.dup'' || duplicates.rn
FROM duplicates
WHERE hero_employees.id = duplicates.id AND duplicates.rn > 1;

-- Add unique index on hero_employees.email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS hero_employees_email_unique_idx 
  ON hero_employees (LOWER(TRIM(email)));

-- Add unique index on auth_user.email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_unique_idx 
  ON auth_user (LOWER(TRIM(email)));

-- Add deletedAt column for soft delete
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add email verification columns
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP;

-- Add password reset tracking
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMP;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS password_reset_by INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL;

-- Add last login tracking
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Add account lockout fields
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Add invitation fields
ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS invitation_token TEXT;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP;

ALTER TABLE hero_employees 
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP;

-- Create user import history table
CREATE TABLE IF NOT EXISTS hero_user_import_history (
  id SERIAL PRIMARY KEY,
  imported_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  mapping JSONB,
  status TEXT NOT NULL DEFAULT ''pending'',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user activity log table
CREATE TABLE IF NOT EXISTS hero_user_activity_log (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hero_user_activity_log_employee_idx 
  ON hero_user_activity_log(employee_id, created_at DESC);

-- Create user groups table
CREATE TABLE IF NOT EXISTS hero_user_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '''',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user group memberships table
CREATE TABLE IF NOT EXISTS hero_user_group_memberships (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES hero_user_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, group_id)
);

CREATE INDEX IF NOT EXISTS hero_user_group_memberships_employee_idx 
  ON hero_user_group_memberships(employee_id);

CREATE INDEX IF NOT EXISTS hero_user_group_memberships_group_idx 
  ON hero_user_group_memberships(group_id);
