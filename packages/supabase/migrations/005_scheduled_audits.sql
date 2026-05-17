CREATE TABLE IF NOT EXISTS scheduled_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_provider text NOT NULL,
  cron_expression text NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their schedules" ON scheduled_audits
  FOR ALL USING (auth.uid() = user_id);
