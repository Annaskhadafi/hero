-- MCU Wellness Advance Tools: annual employee MCU + AI extraction
-- Separate from hero_hc_candidate_mcu (pre-hire). This tracks post-hire annual
-- MCU for active employees with AI-extracted metrics for trend analysis.

CREATE TABLE IF NOT EXISTS hero_employee_mcu (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
  clinic_id INTEGER REFERENCES hero_hc_mcu_clinics(id) ON DELETE SET NULL,
  clinic_name TEXT NOT NULL DEFAULT '',
  clinic_email TEXT NOT NULL DEFAULT '',
  paket_mcu TEXT NOT NULL DEFAULT '',
  scheduled_date DATE,
  mcu_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  result_file_url TEXT NOT NULL DEFAULT '',
  result_file_name TEXT NOT NULL DEFAULT '',
  result_date DATE,
  examined_by TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMP,
  ai_kesimpulan TEXT NOT NULL DEFAULT '',
  ai_saran TEXT NOT NULL DEFAULT '',
  ai_kategori TEXT NOT NULL DEFAULT '',
  ai_raw_json JSONB,
  ai_model TEXT NOT NULL DEFAULT '',
  ai_run_at TIMESTAMP,
  next_mcu_due DATE,
  reminder_sent_at TIMESTAMP,
  reminder_threshold_days INTEGER NOT NULL DEFAULT 30,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hero_employee_mcu_metrics (
  id SERIAL PRIMARY KEY,
  mcu_id INTEGER NOT NULL REFERENCES hero_employee_mcu(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value TEXT NOT NULL DEFAULT '',
  metric_unit TEXT NOT NULL DEFAULT '',
  flag TEXT NOT NULL DEFAULT 'normal',
  notes TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_mcu_employee_date ON hero_employee_mcu (employee_id, mcu_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_mcu_next_due ON hero_employee_mcu (next_mcu_due);
CREATE INDEX IF NOT EXISTS idx_employee_mcu_metrics_mcu_cat_key ON hero_employee_mcu_metrics (mcu_id, category, metric_key);
CREATE INDEX IF NOT EXISTS idx_employee_mcu_metrics_category_key ON hero_employee_mcu_metrics (category, metric_key);
