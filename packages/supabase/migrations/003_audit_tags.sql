-- Audit tagging system
CREATE TABLE IF NOT EXISTS audit_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  tag text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(audit_id, tag, user_id)
);

CREATE INDEX idx_audit_tags_tag ON audit_tags(tag);
CREATE INDEX idx_audit_tags_audit ON audit_tags(audit_id);
CREATE INDEX idx_audit_tags_user ON audit_tags(user_id);

-- RLS
ALTER TABLE audit_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tags" ON audit_tags
  FOR ALL USING (auth.uid() = user_id);
