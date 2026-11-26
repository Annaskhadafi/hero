CREATE TABLE IF NOT EXISTS hero_daily_activity_supervisor_notes (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES hero_daily_activity_sessions(id) ON DELETE CASCADE,
  item_id integer NOT NULL REFERENCES hero_daily_activity_session_items(id) ON DELETE CASCADE,
  author_employee_id integer NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
  note varchar(1000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_da_supervisor_notes_note_nonblank CHECK (length(btrim(note)) > 0)
);
CREATE INDEX IF NOT EXISTS hero_da_supervisor_notes_item_created_idx
  ON hero_daily_activity_supervisor_notes (item_id, created_at);
CREATE INDEX IF NOT EXISTS hero_da_supervisor_notes_session_idx
  ON hero_daily_activity_supervisor_notes (session_id);
