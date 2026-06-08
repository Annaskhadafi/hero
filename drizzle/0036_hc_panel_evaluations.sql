CREATE TABLE IF NOT EXISTS "hero_hc_candidate_panel_evaluations" (
  "id" serial PRIMARY KEY,
  "candidate_id" integer NOT NULL REFERENCES "hero_hc_candidates"("id") ON DELETE cascade,
  "interview_id" integer REFERENCES "hero_hc_candidate_interviews"("id") ON DELETE set null,
  "panelist_name" text NOT NULL,
  "panelist_role" text NOT NULL DEFAULT '',
  "technical_score" integer NOT NULL DEFAULT 0,
  "communication_score" integer NOT NULL DEFAULT 0,
  "culture_score" integer NOT NULL DEFAULT 0,
  "problem_solving_score" integer NOT NULL DEFAULT 0,
  "attitude_score" integer NOT NULL DEFAULT 0,
  "overall_recommendation" text NOT NULL DEFAULT 'Review',
  "strengths" text NOT NULL DEFAULT '',
  "concerns" text NOT NULL DEFAULT '',
  "notes" text NOT NULL DEFAULT '',
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hc_panel_eval_candidate_id"
ON "hero_hc_candidate_panel_evaluations" ("candidate_id");
