/**
 * Job Scraper Service
 * 
 * Service for scraping/fetching jobs from various sources:
 * 1. JSearch API (RapidAPI) - For real job postings
 * 2. LinkedIn Jobs API (if available)
 * 3. Mock data for development/testing
 * 
 * This service fetches jobs and stores them in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Job categories mapped to coding problems
const JOB_SKILL_MAPPINGS = {
  'frontend': ['javascript', 'react', 'css', 'html', 'typescript', 'dom-manipulation', 'strings'],
  'backend': ['node', 'python', 'java', 'sql', 'api', 'database', 'algorithms'],
  'fullstack': ['javascript', 'node', 'react', 'sql', 'api', 'typescript'],
  'data-science': ['python', 'algorithms', 'statistics', 'machine-learning', 'sql'],
  'mobile': ['react-native', 'swift', 'kotlin', 'java', 'mobile'],
  'devops': ['docker', 'kubernetes', 'ci-cd', 'linux', 'cloud'],
  'systems': ['c++', 'algorithms', 'data-structures', 'memory', 'optimization']
};

// Problem categories to job skill mapping
const PROBLEM_TO_JOB_SKILLS = {
  'arrays': ['backend', 'fullstack', 'data-science'],
  'strings': ['frontend', 'backend', 'fullstack'],
  'linked-lists': ['backend', 'systems'],
  'trees': ['backend', 'data-science'],
  'graphs': ['backend', 'data-science', 'systems'],
  'dynamic-programming': ['backend', 'data-science', 'systems'],
  'sorting': ['backend', 'data-science'],
  'searching': ['backend', 'fullstack'],
  'recursion': ['backend', 'systems'],
  'hash-tables': ['backend', 'fullstack'],
  'math': ['data-science', 'backend'],
  'bit-manipulation': ['systems', 'backend']
};

class JobScraperService {
  constructor() {
    this.hasAccess = !!supabase;
    this.rapidApiKey = process.env.RAPIDAPI_KEY || null;
    this.linkedInApiKey = process.env.LINKEDIN_API_KEY || null;
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Fetch jobs from JSearch API (RapidAPI)
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of job postings
   */
  async fetchJobsFromJSearch(options = {}) {
    const {
      query = 'software engineer',
      location = 'United States',
      page = 1,
      numPages = 1,
      datePosted = 'week'
    } = options;

    if (!this.rapidApiKey) {
      console.log('RapidAPI key not configured, using mock data');
      return this.getMockJobs(query, location);
    }

    try {
      const response = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query + ' ' + location)}&page=${page}&num_pages=${numPages}&date_posted=${datePosted}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.rapidApiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`JSearch API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformJSearchJobs(data.data || []);
    } catch (error) {
      console.error('Error fetching from JSearch:', error);
      // Fallback to mock data
      return this.getMockJobs(query, location);
    }
  }

  /**
   * Transform JSearch API response to our job format
   */
  transformJSearchJobs(jobs) {
    return jobs.map(job => ({
      externalId: job.job_id,
      title: job.job_title,
      description: job.job_description,
      company: {
        name: job.employer_name,
        logo: job.employer_logo,
        website: job.employer_website
      },
      location: job.job_city 
        ? `${job.job_city}, ${job.job_state || ''} ${job.job_country || ''}`.trim()
        : job.job_country || 'Remote',
      remoteAllowed: job.job_is_remote || false,
      salaryMin: job.job_min_salary,
      salaryMax: job.job_max_salary,
      salaryCurrency: job.job_salary_currency || 'USD',
      experienceLevel: this.mapExperienceLevel(job.job_required_experience?.required_experience_in_months),
      employmentType: job.job_employment_type || 'full-time',
      postedAt: job.job_posted_at_datetime_utc,
      expiresAt: job.job_offer_expiration_datetime_utc,
      applyUrl: job.job_apply_link,
      skills: this.extractSkills(job.job_description, job.job_highlights?.Qualifications || []),
      source: 'jsearch'
    }));
  }

  /**
   * Map experience months to level
   */
  mapExperienceLevel(months) {
    if (!months) return 'mid';
    if (months <= 12) return 'entry';
    if (months <= 48) return 'mid';
    if (months <= 96) return 'senior';
    return 'lead';
  }

  /**
   * Extract skills from job description and qualifications
   */
  extractSkills(description, qualifications) {
    const skillKeywords = [
      'javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
      'typescript', 'react', 'angular', 'vue', 'node.js', 'nodejs', 'express',
      'django', 'flask', 'spring', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql', 'rest api',
      'git', 'ci/cd', 'agile', 'scrum', 'linux', 'algorithms', 'data structures',
      'machine learning', 'tensorflow', 'pytorch', 'html', 'css', 'sass'
    ];

    const text = (description + ' ' + qualifications.join(' ')).toLowerCase();
    const foundSkills = skillKeywords.filter(skill => text.includes(skill.toLowerCase()));
    
    return [...new Set(foundSkills)];
  }

  /**
   * Get mock job data for development/testing
   */
  getMockJobs(query = '', location = '') {
    const mockJobs = [
      {
        externalId: 'mock-google-swe-1',
        title: 'Software Engineer, Frontend',
        description: `Join Google's engineering team to build next-generation web experiences. You'll work with cutting-edge technologies like React, TypeScript, and modern web APIs to create products used by billions of users.

**Responsibilities:**
- Design and develop user-facing features using React and TypeScript
- Optimize applications for maximum speed and scalability
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and well-documented code
- Participate in code reviews and mentor junior developers

**Requirements:**
- BS/MS in Computer Science or equivalent experience
- 3+ years of experience with JavaScript/TypeScript
- Strong understanding of web technologies (HTML, CSS, DOM)
- Experience with React or similar frameworks
- Familiarity with data structures and algorithms`,
        company: {
          name: 'Google',
          logo: 'https://logo.clearbit.com/google.com',
          website: 'https://google.com',
          industry: 'technology',
          size: 'enterprise'
        },
        location: 'Mountain View, CA',
        remoteAllowed: true,
        salaryMin: 150000,
        salaryMax: 250000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://careers.google.com',
        skills: ['javascript', 'typescript', 'react', 'html', 'css', 'algorithms'],
        source: 'mock',
        interviewFrequency: 0.95,
        problemCategories: ['arrays', 'strings', 'trees', 'dynamic-programming']
      },
      {
        externalId: 'mock-meta-swe-1',
        title: 'Software Engineer, Backend',
        description: `Meta is looking for backend engineers to help build scalable infrastructure that powers our family of apps. You'll work on systems handling billions of requests per day.

**Responsibilities:**
- Design and build scalable backend services
- Work with large-scale distributed systems
- Optimize system performance and reliability
- Collaborate with product teams to implement new features

**Requirements:**
- Experience with Python, Java, or C++
- Understanding of distributed systems
- Strong algorithmic problem-solving skills
- Knowledge of SQL and NoSQL databases`,
        company: {
          name: 'Meta',
          logo: 'https://logo.clearbit.com/meta.com',
          website: 'https://meta.com',
          industry: 'technology',
          size: 'enterprise'
        },
        location: 'Menlo Park, CA',
        remoteAllowed: true,
        salaryMin: 160000,
        salaryMax: 280000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://careers.meta.com',
        skills: ['python', 'java', 'c++', 'sql', 'distributed-systems', 'algorithms'],
        source: 'mock',
        interviewFrequency: 0.92,
        problemCategories: ['graphs', 'dynamic-programming', 'arrays', 'hash-tables']
      },
      {
        externalId: 'mock-amazon-sde-1',
        title: 'Software Development Engineer II',
        description: `Amazon Web Services (AWS) is looking for Software Development Engineers to join our team. You'll build and maintain services that help millions of customers worldwide.

**Responsibilities:**
- Design and develop cloud services at massive scale
- Own the full software development lifecycle
- Drive technical excellence through best practices
- Mentor and guide junior engineers

**Requirements:**
- 4+ years of software development experience
- Strong proficiency in Java or Python
- Experience with cloud services (AWS preferred)
- Knowledge of data structures, algorithms, and system design`,
        company: {
          name: 'Amazon',
          logo: 'https://logo.clearbit.com/amazon.com',
          website: 'https://amazon.com',
          industry: 'technology',
          size: 'enterprise'
        },
        location: 'Seattle, WA',
        remoteAllowed: false,
        salaryMin: 140000,
        salaryMax: 240000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://amazon.jobs',
        skills: ['java', 'python', 'aws', 'distributed-systems', 'algorithms'],
        source: 'mock',
        interviewFrequency: 0.88,
        problemCategories: ['arrays', 'trees', 'graphs', 'dynamic-programming', 'sorting']
      },
      {
        externalId: 'mock-microsoft-swe-1',
        title: 'Software Engineer - Azure',
        description: `Join Microsoft's Azure team to build cloud infrastructure that powers businesses worldwide. Work on cutting-edge distributed systems and help shape the future of cloud computing.

**Responsibilities:**
- Build highly available and scalable cloud services
- Design and implement APIs and microservices
- Collaborate with teams across Microsoft
- Drive innovation in cloud computing

**Requirements:**
- BS/MS in Computer Science
- Experience with C#, Java, or Go
- Understanding of cloud architecture
- Strong problem-solving abilities`,
        company: {
          name: 'Microsoft',
          logo: 'https://logo.clearbit.com/microsoft.com',
          website: 'https://microsoft.com',
          industry: 'technology',
          size: 'enterprise'
        },
        location: 'Redmond, WA',
        remoteAllowed: true,
        salaryMin: 145000,
        salaryMax: 235000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://careers.microsoft.com',
        skills: ['c#', 'java', 'go', 'azure', 'distributed-systems'],
        source: 'mock',
        interviewFrequency: 0.85,
        problemCategories: ['arrays', 'strings', 'trees', 'dynamic-programming']
      },
      {
        externalId: 'mock-netflix-swe-1',
        title: 'Senior Software Engineer - Streaming Platform',
        description: `Netflix is seeking Senior Software Engineers to work on our streaming platform. Help deliver seamless entertainment experiences to over 200 million members worldwide.

**Responsibilities:**
- Build and optimize video streaming infrastructure
- Work on content delivery and encoding systems
- Improve platform reliability and performance
- Lead technical initiatives and mentor team members

**Requirements:**
- 5+ years of software engineering experience
- Strong Java or Python skills
- Experience with distributed systems at scale
- Passion for entertainment technology`,
        company: {
          name: 'Netflix',
          logo: 'https://logo.clearbit.com/netflix.com',
          website: 'https://netflix.com',
          industry: 'entertainment',
          size: 'large'
        },
        location: 'Los Gatos, CA',
        remoteAllowed: false,
        salaryMin: 180000,
        salaryMax: 320000,
        salaryCurrency: 'USD',
        experienceLevel: 'senior',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://jobs.netflix.com',
        skills: ['java', 'python', 'distributed-systems', 'streaming'],
        source: 'mock',
        interviewFrequency: 0.82,
        problemCategories: ['arrays', 'graphs', 'dynamic-programming', 'hash-tables']
      },
      {
        externalId: 'mock-stripe-swe-1',
        title: 'Software Engineer - Payments',
        description: `Stripe is hiring engineers to build the financial infrastructure of the internet. Work on systems that process billions of dollars in payments.

**Responsibilities:**
- Design and build payment processing systems
- Ensure reliability and security of financial transactions
- Optimize for performance and cost efficiency
- Work with cross-functional teams globally

**Requirements:**
- Strong coding skills in Ruby, Python, or Go
- Understanding of distributed systems
- Interest in financial technology
- Strong problem-solving abilities`,
        company: {
          name: 'Stripe',
          logo: 'https://logo.clearbit.com/stripe.com',
          website: 'https://stripe.com',
          industry: 'fintech',
          size: 'medium'
        },
        location: 'San Francisco, CA',
        remoteAllowed: true,
        salaryMin: 155000,
        salaryMax: 270000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://stripe.com/jobs',
        skills: ['ruby', 'python', 'go', 'payments', 'distributed-systems'],
        source: 'mock',
        interviewFrequency: 0.80,
        problemCategories: ['arrays', 'hash-tables', 'strings', 'math']
      },
      {
        externalId: 'mock-airbnb-swe-1',
        title: 'Software Engineer - Search & Discovery',
        description: `Join Airbnb's Search team to build systems that help millions find their perfect home away from home. Work on machine learning-powered search and recommendations.

**Responsibilities:**
- Build and improve search ranking algorithms
- Work on personalization and recommendation systems
- Optimize search infrastructure for scale
- Collaborate with data scientists and product teams

**Requirements:**
- Experience with search systems or recommendations
- Strong Python or Java skills
- Understanding of ML fundamentals
- Data structures and algorithms knowledge`,
        company: {
          name: 'Airbnb',
          logo: 'https://logo.clearbit.com/airbnb.com',
          website: 'https://airbnb.com',
          industry: 'travel',
          size: 'large'
        },
        location: 'San Francisco, CA',
        remoteAllowed: true,
        salaryMin: 150000,
        salaryMax: 260000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://careers.airbnb.com',
        skills: ['python', 'java', 'machine-learning', 'search', 'algorithms'],
        source: 'mock',
        interviewFrequency: 0.78,
        problemCategories: ['arrays', 'graphs', 'dynamic-programming', 'searching']
      },
      {
        externalId: 'mock-uber-swe-1',
        title: 'Software Engineer - Maps & Routing',
        description: `Uber is looking for engineers to work on mapping and routing systems that power millions of trips daily. Build real-time systems that match riders with drivers.

**Responsibilities:**
- Build routing algorithms and optimization systems
- Work on real-time mapping infrastructure
- Optimize for latency and accuracy
- Scale systems globally

**Requirements:**
- Strong algorithmic background
- Experience with Go, Java, or Python
- Interest in geospatial systems
- Knowledge of graph algorithms`,
        company: {
          name: 'Uber',
          logo: 'https://logo.clearbit.com/uber.com',
          website: 'https://uber.com',
          industry: 'transportation',
          size: 'enterprise'
        },
        location: 'San Francisco, CA',
        remoteAllowed: false,
        salaryMin: 145000,
        salaryMax: 250000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://uber.com/careers',
        skills: ['go', 'java', 'python', 'algorithms', 'geospatial'],
        source: 'mock',
        interviewFrequency: 0.83,
        problemCategories: ['graphs', 'dynamic-programming', 'arrays', 'searching']
      },
      {
        externalId: 'mock-discord-swe-1',
        title: 'Software Engineer - Real-time Infrastructure',
        description: `Discord is building the future of communication. Join us to work on real-time systems serving millions of concurrent users.

**Responsibilities:**
- Build real-time messaging infrastructure
- Work on voice and video systems
- Optimize for low latency at scale
- Ensure platform reliability

**Requirements:**
- Experience with real-time systems
- Strong Rust, Go, or C++ skills
- Understanding of networking protocols
- Distributed systems experience`,
        company: {
          name: 'Discord',
          logo: 'https://logo.clearbit.com/discord.com',
          website: 'https://discord.com',
          industry: 'technology',
          size: 'medium'
        },
        location: 'San Francisco, CA',
        remoteAllowed: true,
        salaryMin: 140000,
        salaryMax: 240000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://discord.com/jobs',
        skills: ['rust', 'go', 'c++', 'networking', 'distributed-systems'],
        source: 'mock',
        interviewFrequency: 0.75,
        problemCategories: ['arrays', 'hash-tables', 'graphs', 'bit-manipulation']
      },
      {
        externalId: 'mock-coinbase-swe-1',
        title: 'Software Engineer - Blockchain',
        description: `Coinbase is hiring engineers to build the future of finance. Work on cryptocurrency exchange systems and blockchain infrastructure.

**Responsibilities:**
- Build secure trading systems
- Work on blockchain integration
- Ensure regulatory compliance
- Optimize for performance and reliability

**Requirements:**
- Strong Go or Rust skills
- Interest in cryptocurrency
- Understanding of security best practices
- Distributed systems experience`,
        company: {
          name: 'Coinbase',
          logo: 'https://logo.clearbit.com/coinbase.com',
          website: 'https://coinbase.com',
          industry: 'fintech',
          size: 'medium'
        },
        location: 'Remote, US',
        remoteAllowed: true,
        salaryMin: 160000,
        salaryMax: 280000,
        salaryCurrency: 'USD',
        experienceLevel: 'mid',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://coinbase.com/careers',
        skills: ['go', 'rust', 'blockchain', 'security', 'distributed-systems'],
        source: 'mock',
        interviewFrequency: 0.76,
        problemCategories: ['arrays', 'hash-tables', 'math', 'bit-manipulation']
      },
      {
        externalId: 'mock-startup-jr-1',
        title: 'Junior Software Developer',
        description: `Fast-growing startup looking for junior developers to join our team. Great opportunity to learn and grow in a supportive environment.

**Responsibilities:**
- Build and maintain web applications
- Learn from senior developers
- Participate in code reviews
- Contribute to product features

**Requirements:**
- CS degree or bootcamp graduate
- Basic programming skills in JavaScript or Python
- Eagerness to learn
- Good communication skills`,
        company: {
          name: 'TechStartup Inc',
          logo: null,
          website: 'https://techstartup.io',
          industry: 'technology',
          size: 'startup'
        },
        location: 'Austin, TX',
        remoteAllowed: true,
        salaryMin: 70000,
        salaryMax: 100000,
        salaryCurrency: 'USD',
        experienceLevel: 'entry',
        employmentType: 'full-time',
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://techstartup.io/careers',
        skills: ['javascript', 'python', 'git', 'html', 'css'],
        source: 'mock',
        interviewFrequency: 0.55,
        problemCategories: ['arrays', 'strings', 'searching', 'sorting']
      },
      {
        externalId: 'mock-intern-1',
        title: 'Software Engineering Intern',
        description: `Summer internship program for students interested in software engineering. Learn industry best practices while working on real projects.

**Responsibilities:**
- Work on assigned projects under mentorship
- Participate in team meetings and code reviews
- Learn software development practices
- Present work at the end of the internship

**Requirements:**
- Currently pursuing CS or related degree
- Basic programming knowledge
- Strong interest in software development
- Available for summer internship`,
        company: {
          name: 'Enterprise Corp',
          logo: 'https://logo.clearbit.com/salesforce.com',
          website: 'https://enterprise-corp.com',
          industry: 'technology',
          size: 'enterprise'
        },
        location: 'New York, NY',
        remoteAllowed: false,
        salaryMin: 6000,
        salaryMax: 8000,
        salaryCurrency: 'USD',
        experienceLevel: 'entry',
        employmentType: 'internship',
        postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://enterprise-corp.com/internships',
        skills: ['programming', 'algorithms', 'data-structures'],
        source: 'mock',
        interviewFrequency: 0.45,
        problemCategories: ['arrays', 'strings', 'sorting', 'searching']
      }
    ];

    // Filter by query if provided
    const queryLower = query.toLowerCase();
    const locationLower = location.toLowerCase();

    return mockJobs.filter(job => {
      const matchesQuery = !query || 
        job.title.toLowerCase().includes(queryLower) ||
        job.description.toLowerCase().includes(queryLower) ||
        job.company.name.toLowerCase().includes(queryLower) ||
        job.skills.some(s => s.toLowerCase().includes(queryLower));
      
      const matchesLocation = !location ||
        job.location.toLowerCase().includes(locationLower) ||
        (locationLower.includes('remote') && job.remoteAllowed);

      return matchesQuery && matchesLocation;
    });
  }

  /**
   * Store or update a company in Supabase
   * @param {Object} company - Company data
   * @returns {Promise<Object>} Stored company with ID
   */
  async upsertCompany(company) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Build company data object with only fields that exist in schema
      const companyData = {
        name: company.name,
        description: company.description || null,
        logo_url: company.logo || null,
        website: company.website || null,
        size: company.size || 'medium',
        industry: company.industry || 'technology',
        location: company.location || null
      };

      const { data, error } = await supabase
        .from('companies')
        .upsert(companyData, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error upserting company:', error);
      throw error;
    }
  }

  /**
   * Store a job in Supabase
   * @param {Object} job - Job data
   * @param {string} companyId - Company UUID
   * @returns {Promise<Object>} Stored job
   */
  async createJob(job, companyId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const jobData = {
        company_id: companyId,
        title: job.title,
        description: job.description,
        salary_min: job.salaryMin || null,
        salary_max: job.salaryMax || null,
        salary_currency: job.salaryCurrency || 'USD',
        location: job.location,
        remote_allowed: job.remoteAllowed || false,
        experience_level: job.experienceLevel || 'mid',
        employment_type: job.employmentType || 'full-time',
        posted_at: job.postedAt || new Date().toISOString(),
        expires_at: job.expiresAt || null,
        is_active: true,
        linkedin_job_id: job.externalId || null,
        interview_frequency_score: job.interviewFrequency || 0.5
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Create job-problem mappings based on skills
   * @param {string} jobId - Job UUID
   * @param {Array} problemCategories - Problem categories relevant to this job
   */
  async createJobProblemMappings(jobId, problemCategories) {
    if (!this.hasAccess || !problemCategories?.length) return;

    try {
      // Get problems that match the categories
      const { data: problems, error: problemsError } = await supabase
        .from('problems')
        .select('id, difficulty, category')
        .in('category', problemCategories)
        .limit(50);

      if (problemsError) throw problemsError;

      if (!problems || problems.length === 0) return;

      // Create mappings with frequency scores based on difficulty
      const mappings = problems.map(problem => {
        const difficultyWeight = 
          problem.difficulty === 'hard' ? 1.5 :
          problem.difficulty === 'medium' ? 1.0 : 0.7;

        return {
          job_id: jobId,
          problem_id: problem.id,
          frequency_score: Math.random() * 0.5 + 0.5, // Random score between 0.5 and 1.0
          difficulty_weight: difficultyWeight
        };
      });

      const { error } = await supabase
        .from('job_problem_mappings')
        .upsert(mappings, {
          onConflict: 'job_id,problem_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.warn('Error creating job-problem mappings:', error);
      }
    } catch (error) {
      console.warn('Error in createJobProblemMappings:', error);
    }
  }

  /**
   * Fetch and store jobs from all sources
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Results summary
   */
  async fetchAndStoreJobs(options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    const {
      queries = ['software engineer', 'frontend developer', 'backend developer', 'full stack developer'],
      locations = ['United States', 'Remote'],
      useMockData = true
    } = options;

    const results = {
      companiesCreated: 0,
      jobsCreated: 0,
      errors: []
    };

    try {
      // Fetch jobs from each query/location combination
      const allJobs = [];

      for (const query of queries) {
        for (const location of locations) {
          let jobs;
          
          if (useMockData || !this.rapidApiKey) {
            jobs = this.getMockJobs(query, location);
          } else {
            jobs = await this.fetchJobsFromJSearch({ query, location });
          }

          allJobs.push(...jobs);

          // Add a small delay between API calls to avoid rate limiting
          if (!useMockData && this.rapidApiKey) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Deduplicate jobs by external ID
      const uniqueJobs = Array.from(
        new Map(allJobs.map(job => [job.externalId, job])).values()
      );

      // Store each job
      for (const job of uniqueJobs) {
        try {
          // First, create/update the company
          const company = await this.upsertCompany(job.company);
          results.companiesCreated++;

          // Then create the job
          const storedJob = await this.createJob(job, company.id);
          results.jobsCreated++;

          // Create job-problem mappings if we have problem categories
          if (job.problemCategories?.length) {
            await this.createJobProblemMappings(storedJob.id, job.problemCategories);
          }
        } catch (error) {
          // Skip duplicate jobs
          if (!error.message?.includes('duplicate')) {
            results.errors.push({
              job: job.title,
              error: error.message
            });
          }
        }
      }

      console.log(`Job scraping complete: ${results.jobsCreated} jobs, ${results.companiesCreated} companies`);
      return results;
    } catch (error) {
      console.error('Error in fetchAndStoreJobs:', error);
      throw error;
    }
  }

  /**
   * Get all active jobs
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of jobs
   */
  async getActiveJobs(options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    const {
      limit = 50,
      experienceLevel = null,
      location = null,
      remoteOnly = false
    } = options;

    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('is_active', true);

      if (experienceLevel) {
        query = query.eq('experience_level', experienceLevel);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      if (remoteOnly) {
        query = query.eq('remote_allowed', true);
      }

      const { data, error } = await query
        .order('interview_frequency_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      throw error;
    }
  }

  /**
   * Update job activity status
   * @param {string} jobId - Job UUID
   * @param {boolean} isActive - Active status
   */
  async updateJobStatus(jobId, isActive) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: isActive })
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  /**
   * Deactivate expired jobs
   */
  async deactivateExpiredJobs() {
    if (!this.hasAccess) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (error) {
        console.warn('Error deactivating expired jobs:', error);
      }
    } catch (error) {
      console.warn('Error in deactivateExpiredJobs:', error);
    }
  }
}

export default new JobScraperService();

