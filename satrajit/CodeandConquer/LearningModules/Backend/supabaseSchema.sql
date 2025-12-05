-- =====================================================
-- Supabase Schema for Ad Breaks & Learning Modules
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- CONTENT MODULES TABLE
-- Stores learning module content and metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS content_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- HTML or Markdown content
  text TEXT, -- Plain text content (alternative)
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_minutes INTEGER,
  thumbnail_url TEXT,
  audio_file_path TEXT, -- Path to mp3 in storage bucket
  code_examples JSONB DEFAULT '[]'::jsonb, -- Array of code examples
  key_points JSONB DEFAULT '[]'::jsonb, -- Array of key takeaways
  prerequisites JSONB DEFAULT '[]'::jsonb, -- Array of prerequisite module IDs
  objectives JSONB DEFAULT '[]'::jsonb, -- Learning objectives
  order_index INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_modules_category ON content_modules(category);
CREATE INDEX IF NOT EXISTS idx_content_modules_difficulty ON content_modules(difficulty);
CREATE INDEX IF NOT EXISTS idx_content_modules_order ON content_modules(order_index);

-- =====================================================
-- USER MODULE PROGRESS TABLE
-- Tracks user progress on learning modules
-- =====================================================
CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES content_modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position INTEGER DEFAULT 0, -- Last audio position in seconds
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Index for user progress queries
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module ON user_module_progress(module_id);

-- =====================================================
-- VIDEO ADS TABLE
-- Stores video advertisements
-- =====================================================
CREATE TABLE IF NOT EXISTS video_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  sponsor TEXT,
  title TEXT,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1, -- Higher = shown more often
  start_date TIMESTAMPTZ, -- Optional: when to start showing
  end_date TIMESTAMPTZ, -- Optional: when to stop showing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active ads
CREATE INDEX IF NOT EXISTS idx_video_ads_active ON video_ads(active);

-- =====================================================
-- AD IMPRESSIONS TABLE
-- Tracks ad views for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES video_ads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_timestamp ON ad_impressions(timestamp);

-- =====================================================
-- AD INTERACTIONS TABLE
-- Tracks skips, completions, clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES video_ads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('skip', 'completed', 'click')),
  watch_time_seconds INTEGER, -- Only for skip events
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad ON ad_interactions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_type ON ad_interactions(interaction_type);

-- =====================================================
-- SAMPLE DATA (Optional - uncomment to insert)
-- =====================================================

-- Sample learning modules
/*
INSERT INTO content_modules (title, description, category, difficulty, duration_minutes, content, key_points) VALUES
(
  'Introduction to Variables',
  'Learn the fundamentals of variables in programming',
  'Basics',
  'easy',
  15,
  '<h2>What are Variables?</h2><p>Variables are containers for storing data values. Think of them as labeled boxes where you can put things.</p><h3>Declaring Variables</h3><p>In JavaScript, you can declare variables using <code>let</code>, <code>const</code>, or <code>var</code>.</p>',
  '["Variables store data values", "Use let for values that change", "Use const for values that don''t change", "Variable names should be descriptive"]'
),
(
  'Understanding Loops',
  'Master the concept of loops and iteration',
  'Control Flow',
  'easy',
  20,
  '<h2>Introduction to Loops</h2><p>Loops allow you to execute a block of code multiple times. They are essential for processing collections of data.</p>',
  '["for loops iterate a specific number of times", "while loops continue until a condition is false", "forEach is great for arrays", "Avoid infinite loops"]'
),
(
  'Functions and Scope',
  'Deep dive into functions and variable scope',
  'Functions',
  'medium',
  25,
  '<h2>Understanding Functions</h2><p>Functions are reusable blocks of code that perform a specific task.</p>',
  '["Functions promote code reuse", "Parameters pass data into functions", "Return statements send data back", "Scope determines variable accessibility"]'
);
*/

-- Sample video ads
/*
INSERT INTO video_ads (youtube_url, sponsor, title, active) VALUES
('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Sponsor Name', 'Learn to Code Today', true),
('https://www.youtube.com/watch?v=example2', 'Tech Academy', 'Master Programming', true);
*/

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE content_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_interactions ENABLE ROW LEVEL SECURITY;

-- Content modules: readable by all authenticated users
CREATE POLICY "Content modules are viewable by authenticated users" ON content_modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- User progress: users can only access their own progress
CREATE POLICY "Users can view their own progress" ON user_module_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_module_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_module_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Video ads: readable by all (for ad display)
CREATE POLICY "Video ads are viewable by everyone" ON video_ads
  FOR SELECT USING (true);

-- Ad impressions: anyone can insert (for tracking)
CREATE POLICY "Anyone can log ad impressions" ON ad_impressions
  FOR INSERT WITH CHECK (true);

-- Ad interactions: anyone can insert (for tracking)
CREATE POLICY "Anyone can log ad interactions" ON ad_interactions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET SETUP
-- Run these in the Supabase Dashboard Storage section
-- or via the API
-- =====================================================

-- Create the audio-modules bucket (do this in Supabase Dashboard)
-- Bucket name: audio-modules
-- Public: false (use signed URLs)
-- Allowed MIME types: audio/mpeg, audio/mp3, audio/wav

-- Storage policy example (run in SQL editor after creating bucket):
/*
CREATE POLICY "Authenticated users can read audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-modules' AND auth.role() = 'authenticated');
*/

