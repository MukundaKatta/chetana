-- Chetana: AI Consciousness Research Platform
-- Initial database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audits table
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_provider TEXT NOT NULL CHECK (model_provider IN ('anthropic', 'openai', 'google', 'ollama')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  overall_score NUMERIC(4,3),
  theory_scores JSONB,
  indicator_scores JSONB,
  raw_evidence JSONB,
  report_markdown TEXT,
  tokens_used BIGINT,
  cost_cents INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Probe results table
CREATE TABLE probe_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  probe_name TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  theory TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  score NUMERIC(3,2),
  evidence_type TEXT CHECK (evidence_type IN ('behavioral', 'structural', 'self-report')),
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  model_name TEXT NOT NULL,
  custom_probes JSONB NOT NULL,
  results JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Research notes table
CREATE TABLE research_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'explorer' CHECK (tier IN ('explorer', 'researcher', 'enterprise')),
  stripe_customer_id TEXT,
  audits_this_month INTEGER DEFAULT 0,
  audits_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audits_user ON audits(user_id, created_at DESC);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_model ON audits(model_name, model_provider);
CREATE INDEX idx_probes_audit ON probe_results(audit_id, theory);
CREATE INDEX idx_probes_indicator ON probe_results(indicator_id);
CREATE INDEX idx_experiments_user ON experiments(user_id, created_at DESC);
CREATE INDEX idx_notes_user ON research_notes(user_id, created_at DESC);
CREATE INDEX idx_notes_audit ON research_notes(audit_id);

-- Row Level Security
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE probe_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own audits" ON audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own audits" ON audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audits" ON audits FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own probe results" ON probe_results FOR SELECT
  USING (audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own experiments" ON experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own experiments" ON experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own experiments" ON experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own experiments" ON experiments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notes" ON research_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON research_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON research_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON research_notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Leaderboard: anyone can view aggregated audit scores (model-level, not user-level)
CREATE VIEW leaderboard AS
  SELECT
    model_name,
    model_provider,
    COUNT(*) as audit_count,
    AVG(overall_score) as avg_score,
    MAX(overall_score) as max_score,
    AVG((theory_scores->>'gwt')::numeric) as avg_gwt,
    AVG((theory_scores->>'iit')::numeric) as avg_iit,
    AVG((theory_scores->>'hot')::numeric) as avg_hot,
    AVG((theory_scores->>'rpt')::numeric) as avg_rpt,
    AVG((theory_scores->>'pp')::numeric) as avg_pp,
    AVG((theory_scores->>'ast')::numeric) as avg_ast,
    MAX(completed_at) as last_audit
  FROM audits
  WHERE status = 'completed' AND overall_score IS NOT NULL
  GROUP BY model_name, model_provider
  ORDER BY avg_score DESC;

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
