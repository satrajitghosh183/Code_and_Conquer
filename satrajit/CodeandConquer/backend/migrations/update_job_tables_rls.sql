-- Update RLS policies for job tables to allow service role access
-- Run this in Supabase SQL Editor to enable the seed functionality

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for companies table
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON companies;
DROP POLICY IF EXISTS "Service role full access" ON companies;

CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON companies FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON companies FOR DELETE USING (true);

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for jobs table
DROP POLICY IF EXISTS "Enable read access for all users" ON jobs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON jobs;

CREATE POLICY "Enable read access for all users" ON jobs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON jobs FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON jobs FOR DELETE USING (true);

-- Create permissive policies for job_problem_mappings table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_problem_mappings') THEN
    ALTER TABLE job_problem_mappings ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Enable read access for all users" ON job_problem_mappings;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON job_problem_mappings;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON job_problem_mappings;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON job_problem_mappings;

    CREATE POLICY "Enable read access for all users" ON job_problem_mappings FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users" ON job_problem_mappings FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for authenticated users" ON job_problem_mappings FOR UPDATE USING (true);
    CREATE POLICY "Enable delete for authenticated users" ON job_problem_mappings FOR DELETE USING (true);
  END IF;
END $$;

-- Create permissive policies for user_job_recommendations table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_job_recommendations') THEN
    ALTER TABLE user_job_recommendations ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Enable read access for own recommendations" ON user_job_recommendations;
    DROP POLICY IF EXISTS "Enable insert for own recommendations" ON user_job_recommendations;
    DROP POLICY IF EXISTS "Enable update for own recommendations" ON user_job_recommendations;
    DROP POLICY IF EXISTS "Enable delete for own recommendations" ON user_job_recommendations;

    CREATE POLICY "Enable read access for own recommendations" ON user_job_recommendations FOR SELECT USING (true);
    CREATE POLICY "Enable insert for own recommendations" ON user_job_recommendations FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for own recommendations" ON user_job_recommendations FOR UPDATE USING (true);
    CREATE POLICY "Enable delete for own recommendations" ON user_job_recommendations FOR DELETE USING (true);
  END IF;
END $$;

-- Create job_skills table if not exists
CREATE TABLE IF NOT EXISTS job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  importance_level TEXT DEFAULT 'required',
  years_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, skill_name)
);

-- Enable RLS on job_skills table
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for job_skills table
DROP POLICY IF EXISTS "Enable read access for all users" ON job_skills;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON job_skills;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON job_skills;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON job_skills;

CREATE POLICY "Enable read access for all users" ON job_skills FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON job_skills FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON job_skills FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON job_skills FOR DELETE USING (true);

-- Add linkedin_url column to companies if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'linkedin_url') THEN
    ALTER TABLE companies ADD COLUMN linkedin_url TEXT;
  END IF;
END $$;

-- Add unique constraint on companies.name if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_name_key') THEN
    ALTER TABLE companies ADD CONSTRAINT companies_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Insert sample data directly
INSERT INTO companies (name, description, logo_url, website, size, industry, location) VALUES
('Google', 'Google LLC is an American multinational technology company', 'https://logo.clearbit.com/google.com', 'https://google.com', 'enterprise', 'technology', 'Mountain View, CA'),
('Meta', 'Meta Platforms, Inc., doing business as Meta', 'https://logo.clearbit.com/meta.com', 'https://meta.com', 'enterprise', 'technology', 'Menlo Park, CA'),
('Amazon', 'Amazon.com, Inc. is an American multinational technology company', 'https://logo.clearbit.com/amazon.com', 'https://amazon.com', 'enterprise', 'technology', 'Seattle, WA'),
('Microsoft', 'Microsoft Corporation is an American multinational technology corporation', 'https://logo.clearbit.com/microsoft.com', 'https://microsoft.com', 'enterprise', 'technology', 'Redmond, WA'),
('Apple', 'Apple Inc. is an American multinational technology company', 'https://logo.clearbit.com/apple.com', 'https://apple.com', 'enterprise', 'technology', 'Cupertino, CA'),
('Netflix', 'Netflix, Inc. is an American subscription video on-demand streaming service', 'https://logo.clearbit.com/netflix.com', 'https://netflix.com', 'large', 'entertainment', 'Los Gatos, CA'),
('Stripe', 'Stripe, Inc. is an Irish-American financial services company', 'https://logo.clearbit.com/stripe.com', 'https://stripe.com', 'medium', 'fintech', 'San Francisco, CA'),
('Airbnb', 'Airbnb, Inc. operates an online marketplace for lodging and experiences', 'https://logo.clearbit.com/airbnb.com', 'https://airbnb.com', 'large', 'travel', 'San Francisco, CA'),
('Uber', 'Uber Technologies, Inc. is a multinational transportation company', 'https://logo.clearbit.com/uber.com', 'https://uber.com', 'large', 'transportation', 'San Francisco, CA'),
('Discord', 'Discord Inc. is an American instant messaging and VoIP social platform', 'https://logo.clearbit.com/discord.com', 'https://discord.com', 'medium', 'technology', 'San Francisco, CA'),
('Coinbase', 'Coinbase Global, Inc. operates a cryptocurrency exchange platform', 'https://logo.clearbit.com/coinbase.com', 'https://coinbase.com', 'medium', 'fintech', 'San Francisco, CA'),
('Spotify', 'Spotify Technology S.A. is a Swedish audio streaming service', 'https://logo.clearbit.com/spotify.com', 'https://spotify.com', 'large', 'entertainment', 'Stockholm, Sweden')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  website = EXCLUDED.website,
  size = EXCLUDED.size,
  industry = EXCLUDED.industry,
  location = EXCLUDED.location;

-- Add missing columns to jobs table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'salary_currency') THEN
    ALTER TABLE jobs ADD COLUMN salary_currency TEXT DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'interview_frequency_score') THEN
    ALTER TABLE jobs ADD COLUMN interview_frequency_score NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'experience_level') THEN
    ALTER TABLE jobs ADD COLUMN experience_level TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'employment_type') THEN
    ALTER TABLE jobs ADD COLUMN employment_type TEXT DEFAULT 'full-time';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'remote_allowed') THEN
    ALTER TABLE jobs ADD COLUMN remote_allowed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'jobs' AND column_name = 'is_active') THEN
    ALTER TABLE jobs ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add unique constraint on jobs (company_id, title) to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_company_id_title_key') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_company_id_title_key UNIQUE (company_id, title);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Insert sample jobs
INSERT INTO jobs (company_id, title, description, salary_min, salary_max, salary_currency, location, remote_allowed, experience_level, employment_type, is_active, interview_frequency_score)
SELECT 
  c.id,
  j.title,
  j.description,
  j.salary_min,
  j.salary_max,
  'USD',
  j.location,
  j.remote_allowed,
  j.experience_level,
  j.employment_type,
  true,
  j.interview_frequency_score
FROM (
  VALUES
    ('Google', 'Software Engineer, Frontend', 'Join Google to build amazing user experiences with React and TypeScript. Design and develop user-facing features, optimize applications for performance, and collaborate with cross-functional teams.', 150000, 250000, 'Mountain View, CA', true, 'mid', 'full-time', 0.92),
    ('Google', 'Software Engineer, Backend', 'Work on scalable backend services powering Google products used by billions. Design distributed systems, work with big data, and ensure reliability.', 155000, 260000, 'Mountain View, CA', true, 'mid', 'full-time', 0.90),
    ('Meta', 'Software Engineer, Infrastructure', 'Build and scale Meta infrastructure. Work on systems handling billions of requests per day across our family of apps.', 160000, 280000, 'Menlo Park, CA', true, 'mid', 'full-time', 0.88),
    ('Meta', 'Senior Software Engineer, AI/ML', 'Lead ML initiatives at Meta. Design and implement machine learning models that power our recommendations and AI features.', 200000, 350000, 'Menlo Park, CA', true, 'senior', 'full-time', 0.85),
    ('Amazon', 'Software Development Engineer II', 'Build and maintain AWS services that help millions of customers. Own the full software development lifecycle.', 140000, 240000, 'Seattle, WA', false, 'mid', 'full-time', 0.86),
    ('Amazon', 'Senior Software Development Engineer', 'Lead technical initiatives for Amazon retail systems. Drive architectural decisions and mentor team members.', 180000, 310000, 'Seattle, WA', true, 'senior', 'full-time', 0.82),
    ('Microsoft', 'Software Engineer - Azure', 'Build cloud infrastructure for Azure. Work on highly available services at massive scale.', 145000, 235000, 'Redmond, WA', true, 'mid', 'full-time', 0.84),
    ('Microsoft', 'Principal Software Engineer', 'Drive technical vision for Microsoft products. Lead cross-team initiatives and shape engineering culture.', 220000, 380000, 'Redmond, WA', true, 'lead', 'full-time', 0.75),
    ('Apple', 'Software Engineer - iOS', 'Work on iOS frameworks and features used by millions. Build beautiful, performant mobile experiences.', 155000, 265000, 'Cupertino, CA', false, 'mid', 'full-time', 0.80),
    ('Netflix', 'Senior Software Engineer - Streaming', 'Optimize Netflix streaming infrastructure. Deliver seamless entertainment to over 200 million members.', 180000, 320000, 'Los Gatos, CA', false, 'senior', 'full-time', 0.78),
    ('Stripe', 'Software Engineer - Payments', 'Build financial infrastructure for the internet. Design secure payment processing systems.', 155000, 270000, 'San Francisco, CA', true, 'mid', 'full-time', 0.82),
    ('Airbnb', 'Software Engineer - Search', 'Build search and recommendation systems that help travelers find perfect places to stay.', 150000, 260000, 'San Francisco, CA', true, 'mid', 'full-time', 0.79),
    ('Uber', 'Software Engineer - Maps', 'Work on mapping and routing systems powering millions of daily trips.', 145000, 250000, 'San Francisco, CA', false, 'mid', 'full-time', 0.81),
    ('Discord', 'Software Engineer - Real-time', 'Build real-time communication systems for millions of concurrent users.', 140000, 240000, 'San Francisco, CA', true, 'mid', 'full-time', 0.77),
    ('Coinbase', 'Software Engineer - Blockchain', 'Build cryptocurrency exchange systems and blockchain infrastructure.', 160000, 280000, 'Remote, US', true, 'mid', 'full-time', 0.76),
    ('Spotify', 'Software Engineer - Backend', 'Build streaming backend services. Work on content delivery and personalization.', 130000, 220000, 'New York, NY', true, 'mid', 'full-time', 0.74),
    ('Google', 'Software Engineering Intern', 'Summer internship to learn and grow. Work on real projects with mentorship.', 8000, 10000, 'Mountain View, CA', false, 'entry', 'internship', 0.60),
    ('Meta', 'Software Engineering Intern', 'Build features that impact billions. Great learning opportunity with top engineers.', 8500, 11000, 'Menlo Park, CA', false, 'entry', 'internship', 0.58)
) AS j(company_name, title, description, salary_min, salary_max, location, remote_allowed, experience_level, employment_type, interview_frequency_score)
JOIN companies c ON c.name = j.company_name
ON CONFLICT (company_id, title) DO UPDATE SET
  description = EXCLUDED.description,
  salary_min = EXCLUDED.salary_min,
  salary_max = EXCLUDED.salary_max,
  salary_currency = EXCLUDED.salary_currency,
  location = EXCLUDED.location,
  remote_allowed = EXCLUDED.remote_allowed,
  experience_level = EXCLUDED.experience_level,
  employment_type = EXCLUDED.employment_type,
  is_active = EXCLUDED.is_active,
  interview_frequency_score = EXCLUDED.interview_frequency_score;

-- Verify the results
SELECT 'Companies: ' || COUNT(*) as result FROM companies
UNION ALL
SELECT 'Jobs: ' || COUNT(*) FROM jobs WHERE is_active = true;

