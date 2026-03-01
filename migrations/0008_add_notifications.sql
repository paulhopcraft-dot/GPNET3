-- Email Notifications Engine v1
-- Tracks automated email notifications for certificate expiry, overdue actions, etc.

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',

  case_id VARCHAR REFERENCES worker_cases(id) ON DELETE CASCADE,

  recipient_id VARCHAR,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  failure_reason TEXT,

  dedupe_key TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_case_id ON notifications(case_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Prevent duplicate pending notifications for same dedupe key
CREATE UNIQUE INDEX idx_notifications_dedupe_pending
  ON notifications(dedupe_key)
  WHERE status = 'pending';

-- Composite index for finding notifications to send
CREATE INDEX idx_notifications_pending_priority
  ON notifications(status, priority, created_at)
  WHERE status = 'pending';
