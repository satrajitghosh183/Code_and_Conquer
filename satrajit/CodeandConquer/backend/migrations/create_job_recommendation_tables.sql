-- Migration: Create Job Recommendation Tables
-- This migration creates tables for jobs, companies, and job-problem mappings
-- to support job recommendations based on user's solved problems and learning progress

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  size TEXT, -- e.g., 'startup', 'small', 'medium', 'large', 'enterprise'
  industry TEXT, -- e.g., 'technology', 'finance', 'healthcare'
  location TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  remote_allowed BOOLEAN DEFAULT false,
  experience_level TEXT, -- e.g., 'entry', 'mid', 'senior', 'lead'
  employment_type TEXT DEFAULT 'full-time', -- 'full-time', 'part-time', 'contract', 'internship'
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  linkedin_job_id TEXT, -- For tracking LinkedIn job postings
  interview_frequency_score NUMERIC DEFAULT 0, -- Frequency of this job type in interviews
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_problem_mappings table
-- Maps problems to jobs based on interview frequency data from LinkedIn
CREATE TABLE IF NOT EXISTS job_problem_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  frequency_score NUMERIC NOT NULL DEFAULT 0, -- How often this problem appears in interviews for this job
  difficulty_weight NUMERIC DEFAULT 1.0, -- Weight based on problem difficulty
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, problem_id)
);

-- Create user_job_recommendations table
-- Stores personalized job recommendations for users
CREATE TABLE IF NOT EXISTS user_job_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL, -- Overall match score (0-100)
  problems_matched INTEGER DEFAULT 0, -- Number of problems user solved that match this job
  progression_score NUMERIC DEFAULT 0, -- Score based on user's learning progression
  recommendation_reason TEXT, -- Explanation of why this job was recommended
  viewed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create job_skills table
-- Stores skills required for each job
CREATE TABLE IF NOT EXISTS job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  importance_level TEXT DEFAULT 'required', -- 'required', 'preferred', 'nice-to-have'
  years_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, skill_name)
);

-- Create indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);

-- Create indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_interview_frequency ON jobs(interview_frequency_score DESC);

-- Create indexes for job_problem_mappings
CREATE INDEX IF NOT EXISTS idx_job_problem_mappings_job_id ON job_problem_mappings(job_id);
CREATE INDEX IF NOT EXISTS idx_job_problem_mappings_problem_id ON job_problem_mappings(problem_id);
CREATE INDEX IF NOT EXISTS idx_job_problem_mappings_frequency ON job_problem_mappings(frequency_score DESC);

-- Create indexes for user_job_recommendations
CREATE INDEX IF NOT EXISTS idx_user_job_recommendations_user_id ON user_job_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_recommendations_job_id ON user_job_recommendations(job_id);
CREATE INDEX IF NOT EXISTS idx_user_job_recommendations_match_score ON user_job_recommendations(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_recommendations_created_at ON user_job_recommendations(created_at DESC);

-- Create indexes for job_skills
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_name ON job_skills(skill_name);

-- Create trigger to update updated_at for companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_companies_updated_at();

-- Create trigger to update updated_at for jobs
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();

-- Create trigger to update updated_at for user_job_recommendations
CREATE OR REPLACE FUNCTION update_user_job_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_job_recommendations_updated_at
BEFORE UPDATE ON user_job_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_user_job_recommendations_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT ON companies TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO authenticated;
GRANT SELECT ON jobs TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON job_problem_mappings TO authenticated;
GRANT SELECT ON job_problem_mappings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_job_recommendations TO authenticated;
GRANT SELECT ON user_job_recommendations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON job_skills TO authenticated;
GRANT SELECT ON job_skills TO anon;

-- Comments
COMMENT ON TABLE companies IS 'Company information for job postings';
COMMENT ON TABLE jobs IS 'Job listings with interview frequency data';
COMMENT ON TABLE job_problem_mappings IS 'Maps problems to jobs based on interview frequency from LinkedIn';
COMMENT ON TABLE user_job_recommendations IS 'Personalized job recommendations for users based on solved problems and progression';
COMMENT ON TABLE job_skills IS 'Skills required for each job posting';

