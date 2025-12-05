-- Migration: Create ad-related tables
-- Creates video_ads, ad_impressions, and ad_interactions tables

-- Create video_ads table
CREATE TABLE IF NOT EXISTS video_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  sponsor TEXT NOT NULL DEFAULT 'Code & Conquer',
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on active ads for faster queries
CREATE INDEX IF NOT EXISTS idx_video_ads_active ON video_ads(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_video_ads_priority ON video_ads(priority DESC);

-- Create ad_impressions table for tracking ad views
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES video_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for ad_impressions
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_timestamp ON ad_impressions(timestamp DESC);

-- Create ad_interactions table for tracking ad interactions (skip, complete, click)
CREATE TABLE IF NOT EXISTS ad_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES video_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('skip', 'completed', 'click')),
  watch_time_seconds INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for ad_interactions
CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad_id ON ad_interactions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user_id ON ad_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_type ON ad_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_timestamp ON ad_interactions(timestamp DESC);

-- Create trigger to update updated_at on video_ads
CREATE OR REPLACE FUNCTION update_video_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_video_ads_updated_at
BEFORE UPDATE ON video_ads
FOR EACH ROW
EXECUTE FUNCTION update_video_ads_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON video_ads TO authenticated;
GRANT SELECT ON video_ads TO anon;
GRANT INSERT ON ad_impressions TO authenticated;
GRANT INSERT ON ad_impressions TO anon;
GRANT INSERT ON ad_interactions TO authenticated;
GRANT INSERT ON ad_interactions TO anon;

-- Comments
COMMENT ON TABLE video_ads IS 'Video advertisements for ad breaks in the game';
COMMENT ON TABLE ad_impressions IS 'Tracks when ads are shown to users';
COMMENT ON TABLE ad_interactions IS 'Tracks user interactions with ads (skip, complete, click)';

