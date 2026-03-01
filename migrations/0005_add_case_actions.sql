-- Migration: Add case_actions table for Action Queue v1
-- This table stores actions that need to be taken on cases (e.g., chase certificate)

CREATE TABLE IF NOT EXISTS case_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR NOT NULL REFERENCES worker_cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- chase_certificate, review_case, follow_up
  status TEXT NOT NULL DEFAULT 'pending', -- pending, done, cancelled
  due_date TIMESTAMP,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_case_actions_case_id ON case_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_actions_status ON case_actions(status);
CREATE INDEX IF NOT EXISTS idx_case_actions_due_date ON case_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_case_actions_type_status ON case_actions(type, status);

-- Composite index for fetching pending/overdue actions sorted by due date
CREATE INDEX IF NOT EXISTS idx_case_actions_pending_due ON case_actions(status, due_date)
  WHERE status = 'pending';
