-- Base Upgrades Table Schema for Supabase
-- This table stores persistent base upgrade data for players

CREATE TABLE IF NOT EXISTS base_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  base_level INTEGER DEFAULT 1 NOT NULL CHECK (base_level >= 1 AND base_level <= 10),
  total_upgrades INTEGER DEFAULT 0 NOT NULL,
  last_upgrade_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE base_upgrades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own base upgrades
CREATE POLICY "Users can manage their own base upgrades"
ON base_upgrades
FOR ALL
USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_base_upgrades_user_id ON base_upgrades(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_base_upgrades_updated_at 
BEFORE UPDATE ON base_upgrades 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

