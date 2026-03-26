-- Audit events table for real-time progress tracking
-- Each probe completion generates an event that clients can poll

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('probe_started', 'probe_completed', 'probe_failed', 'scoring_started', 'scoring_completed', 'audit_completed', 'audit_failed')),
  probe_name TEXT,
  indicator_id TEXT,
  theory TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_events_audit ON audit_events(audit_id, created_at);

-- RLS: users can view events for their own audits
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit events" ON audit_events FOR SELECT
  USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

-- Service role can insert events (from API routes)
CREATE POLICY "Service can insert audit events" ON audit_events FOR INSERT
  WITH CHECK (true);

-- Add statistics column to audits table
ALTER TABLE audits ADD COLUMN IF NOT EXISTS statistics JSONB;

-- Add error_message column if it doesn't exist
ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Function: increment audit count (called after audit completion)
CREATE OR REPLACE FUNCTION increment_audit_count(uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET audits_this_month = audits_this_month + 1,
      updated_at = now()
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
