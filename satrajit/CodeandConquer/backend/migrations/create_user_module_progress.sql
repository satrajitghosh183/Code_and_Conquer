-- Migration: Create user_module_progress table
-- Tracks user progress through learning modules

CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module_id ON user_module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_completed ON user_module_progress(completed);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_module_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_module_progress_updated_at
BEFORE UPDATE ON user_module_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_module_progress_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_module_progress TO authenticated;

-- Comment
COMMENT ON TABLE user_module_progress IS 'Tracks user progress through learning modules';

