CREATE TABLE IF NOT EXISTS hero_email_release_approvals (
  id text PRIMARY KEY,
  ticket_number text NOT NULL,
  repository text NOT NULL,
  ref text NOT NULL,
  base text NOT NULL,
  tree text NOT NULL,
  approver_id integer NOT NULL REFERENCES hero_employees(id),
  recipient text NOT NULL,
  message_id text NOT NULL UNIQUE,
  correlation text NOT NULL UNIQUE,
  state text NOT NULL CHECK (state IN ('sending','pending','delivery_failed','approved','rejected')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_message_id text UNIQUE,
  UNIQUE (ticket_number, repository, ref, base, tree)
);
