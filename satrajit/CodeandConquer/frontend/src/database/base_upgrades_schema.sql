-- Base Upgrades Table Schema
-- This table stores base upgrade levels for each user

-- Create base_upgrades table if it doesn't exist
CREATE TABLE IF NOT EXISTS base_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_level INTEGER DEFAULT 1 NOT NULL CHECK (base_level >= 1 AND base_level <= 10),
  total_upgrades INTEGER DEFAULT 0 NOT NULL,
  last_upgrade_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_base_upgrades_user_id ON base_upgrades(user_id);

-- Enable Row Level Security
ALTER TABLE base_upgrades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can insert own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can update own base upgrades" ON base_upgrades;

-- RLS Policy: Users can read their own base upgrades
CREATE POLICY "Users can view own base upgrades"
  ON base_upgrades
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own base upgrades
CREATE POLICY "Users can insert own base upgrades"
  ON base_upgrades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own base upgrades
CREATE POLICY "Users can update own base upgrades"
  ON base_upgrades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_base_upgrades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_base_upgrades_updated_at ON base_upgrades;
CREATE TRIGGER update_base_upgrades_updated_at
  BEFORE UPDATE ON base_upgrades
  FOR EACH ROW
  EXECUTE FUNCTION update_base_upgrades_updated_at();

