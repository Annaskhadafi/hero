-- Add onboarding document fields
ALTER TABLE hero_hc_candidates
  ADD COLUMN IF NOT EXISTS kk_url TEXT,
  ADD COLUMN IF NOT EXISTS ktp_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_book_url TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
