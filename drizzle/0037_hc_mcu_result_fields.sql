-- Add MCU result tracking fields
ALTER TABLE hero_hc_candidate_mcu
  ADD COLUMN IF NOT EXISTS result_date DATE,
  ADD COLUMN IF NOT EXISTS result_by TEXT NOT NULL DEFAULT '';
