-- User Stats Table Schema
-- This table stores game statistics for each user

-- Create user_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER DEFAULT 0 NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  problems_solved INTEGER DEFAULT 0 NOT NULL,
  games_played INTEGER DEFAULT 0 NOT NULL,
  wins INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_id ON user_stats(id);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own stats
CREATE POLICY "Users can view own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own stats
CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: System can insert stats (for new users)
CREATE POLICY "System can insert user stats"
  ON user_stats
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically create user_stats when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (id, coins, xp, level, problems_solved, games_played, wins)
  VALUES (
    NEW.id,
    0,  -- Initial coins
    0,  -- Initial XP
    1,  -- Initial level
    0,  -- Initial problems solved
    0,  -- Initial games played
    0   -- Initial wins
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_stats when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

