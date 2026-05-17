-- Experiments table updates: versioning, public sharing, and forking
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS fork_of uuid REFERENCES experiments(id);
