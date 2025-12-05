/**
 * Job Database Seeding Script
 * 
 * This script populates the database with initial job data for testing
 * and development purposes.
 * 
 * Usage: node backend/scripts/seedJobs.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend.env
dotenv.config({ path: path.join(__dirname, '../backend.env') });

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend.env');
  process.exit(1);
}

// Create admin client that bypasses RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Companies data (using only columns that exist in base schema)
const companies = [
  {
    name: 'Google',
    description: 'Google LLC is an American multinational technology company focusing on search engine technology, online advertising, cloud computing, computer software, quantum computing, e-commerce, artificial intelligence, and consumer electronics.',
    logo_url: 'https://logo.clearbit.com/google.com',
    website: 'https://google.com',
    size: 'enterprise',
    industry: 'technology',
    location: 'Mountain View, CA'
  },
  {
    name: 'Meta',
    description: 'Meta Platforms, Inc., doing business as Meta, is an American multinational technology conglomerate based in Menlo Park, California.',
    logo_url: 'https://logo.clearbit.com/meta.com',
    website: 'https://meta.com',
    size: 'enterprise',
    industry: 'technology',
    location: 'Menlo Park, CA'
  },
  {
    name: 'Amazon',
    description: 'Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.',
    logo_url: 'https://logo.clearbit.com/amazon.com',
    website: 'https://amazon.com',
    size: 'enterprise',
    industry: 'technology',
    location: 'Seattle, WA'
  },
  {
    name: 'Microsoft',
    description: 'Microsoft Corporation is an American multinational technology corporation producing computer software, consumer electronics, personal computers, and related services.',
    logo_url: 'https://logo.clearbit.com/microsoft.com',
    website: 'https://microsoft.com',
    size: 'enterprise',
    industry: 'technology',
    location: 'Redmond, WA'
  },
  {
    name: 'Apple',
    description: 'Apple Inc. is an American multinational technology company headquartered in Cupertino, California, that designs, develops, and sells consumer electronics, computer software, and online services.',
    logo_url: 'https://logo.clearbit.com/apple.com',
    website: 'https://apple.com',
    size: 'enterprise',
    industry: 'technology',
    location: 'Cupertino, CA'
  },
  {
    name: 'Netflix',
    description: 'Netflix, Inc. is an American subscription video on-demand over-the-top streaming service and production company.',
    logo_url: 'https://logo.clearbit.com/netflix.com',
    website: 'https://netflix.com',
    size: 'large',
    industry: 'entertainment',
    location: 'Los Gatos, CA'
  },
  {
    name: 'Stripe',
    description: 'Stripe, Inc. is an Irish-American financial services and software as a service company headquartered in San Francisco and Dublin.',
    logo_url: 'https://logo.clearbit.com/stripe.com',
    website: 'https://stripe.com',
    size: 'medium',
    industry: 'fintech',
    location: 'San Francisco, CA'
  },
  {
    name: 'Airbnb',
    description: 'Airbnb, Inc. is an American company operating an online marketplace for short and long-term lodging and experiences.',
    logo_url: 'https://logo.clearbit.com/airbnb.com',
    website: 'https://airbnb.com',
    size: 'large',
    industry: 'travel',
    location: 'San Francisco, CA'
  },
  {
    name: 'Uber',
    description: 'Uber Technologies, Inc., commonly known as Uber, is an American multinational transportation company that offers ride-hailing services, food delivery, and freight transport.',
    logo_url: 'https://logo.clearbit.com/uber.com',
    website: 'https://uber.com',
    size: 'large',
    industry: 'transportation',
    location: 'San Francisco, CA'
  },
  {
    name: 'Discord',
    description: 'Discord Inc. is an American instant messaging and VoIP social platform.',
    logo_url: 'https://logo.clearbit.com/discord.com',
    website: 'https://discord.com',
    size: 'medium',
    industry: 'technology',
    location: 'San Francisco, CA'
  },
  {
    name: 'Coinbase',
    description: 'Coinbase Global, Inc. is an American publicly traded company that operates a cryptocurrency exchange platform.',
    logo_url: 'https://logo.clearbit.com/coinbase.com',
    website: 'https://coinbase.com',
    size: 'medium',
    industry: 'fintech',
    location: 'San Francisco, CA'
  },
  {
    name: 'Spotify',
    description: 'Spotify Technology S.A. is a Swedish audio streaming and media services provider.',
    logo_url: 'https://logo.clearbit.com/spotify.com',
    website: 'https://spotify.com',
    size: 'large',
    industry: 'entertainment',
    location: 'Stockholm, Sweden'
  }
];

// Job templates
const jobTemplates = [
  {
    title: 'Software Engineer, Frontend',
    description: `We are looking for a talented Frontend Software Engineer to join our team and help build amazing user experiences.

**Responsibilities:**
- Design and develop user-facing features using modern JavaScript frameworks
- Optimize applications for maximum speed and scalability
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and well-documented code
- Participate in code reviews and mentor junior developers
- Stay up-to-date with emerging technologies and best practices

**Requirements:**
- BS/MS in Computer Science or equivalent experience
- 3+ years of experience with JavaScript/TypeScript
- Strong understanding of web technologies (HTML, CSS, DOM)
- Experience with React, Vue, or Angular
- Familiarity with data structures and algorithms
- Excellent communication and teamwork skills

**Nice to Have:**
- Experience with GraphQL
- Knowledge of testing frameworks
- Contributions to open-source projects`,
    experience_level: 'mid',
    employment_type: 'full-time',
    interview_frequency_score: 0.85
  },
  {
    title: 'Software Engineer, Backend',
    description: `Join our backend engineering team to build scalable services that power our platform.

**Responsibilities:**
- Design and build scalable backend services
- Work with large-scale distributed systems
- Optimize system performance and reliability
- Write efficient database queries and manage data storage
- Implement security best practices
- Participate in on-call rotations

**Requirements:**
- Experience with Python, Java, Go, or Node.js
- Understanding of distributed systems
- Strong algorithmic problem-solving skills
- Knowledge of SQL and NoSQL databases
- Experience with cloud platforms (AWS, GCP, Azure)
- Excellent debugging and troubleshooting skills

**Nice to Have:**
- Experience with microservices architecture
- Knowledge of container orchestration (Kubernetes)
- Understanding of event-driven architectures`,
    experience_level: 'mid',
    employment_type: 'full-time',
    interview_frequency_score: 0.88
  },
  {
    title: 'Senior Software Engineer',
    description: `We're seeking a Senior Software Engineer to lead technical initiatives and mentor team members.

**Responsibilities:**
- Lead design and implementation of complex systems
- Mentor junior and mid-level engineers
- Drive technical excellence through best practices
- Collaborate with product and design teams
- Make architectural decisions and drive technical roadmap
- Conduct code reviews and ensure code quality

**Requirements:**
- 5+ years of software development experience
- Strong proficiency in at least two programming languages
- Experience with system design and architecture
- Proven track record of delivering high-quality software
- Excellent leadership and communication skills
- Experience with agile development methodologies

**Nice to Have:**
- Previous tech lead experience
- Experience with performance optimization
- Public speaking or writing experience`,
    experience_level: 'senior',
    employment_type: 'full-time',
    interview_frequency_score: 0.82
  },
  {
    title: 'Full Stack Engineer',
    description: `Looking for a Full Stack Engineer to work across our entire technology stack.

**Responsibilities:**
- Build and maintain both frontend and backend systems
- Design and implement RESTful APIs
- Work with databases and data pipelines
- Collaborate with designers and product managers
- Ensure application performance and reliability
- Participate in all phases of the development lifecycle

**Requirements:**
- 3+ years of full stack development experience
- Proficiency in JavaScript/TypeScript and a backend language
- Experience with modern frontend frameworks (React, Vue)
- Knowledge of SQL and NoSQL databases
- Understanding of web security best practices
- Strong problem-solving skills

**Nice to Have:**
- Experience with mobile development
- Knowledge of DevOps practices
- Experience with real-time systems`,
    experience_level: 'mid',
    employment_type: 'full-time',
    interview_frequency_score: 0.80
  },
  {
    title: 'Junior Software Developer',
    description: `Great opportunity for early-career developers to learn and grow in a supportive environment.

**Responsibilities:**
- Build and maintain web applications under guidance
- Learn from senior developers through pair programming
- Participate in code reviews and team meetings
- Write unit tests and documentation
- Debug and fix issues in existing code
- Contribute to team improvement initiatives

**Requirements:**
- CS degree or bootcamp graduate
- Basic programming skills in JavaScript or Python
- Eagerness to learn and grow
- Good communication skills
- Ability to work in a team environment
- Basic understanding of version control (Git)

**Nice to Have:**
- Personal projects or contributions to open source
- Familiarity with web development frameworks
- Knowledge of databases`,
    experience_level: 'entry',
    employment_type: 'full-time',
    interview_frequency_score: 0.65
  },
  {
    title: 'Software Engineering Intern',
    description: `Summer internship program for students interested in software engineering.

**Responsibilities:**
- Work on assigned projects under mentorship
- Participate in team meetings and code reviews
- Learn software development practices
- Present work at the end of the internship
- Collaborate with other interns on group projects

**Requirements:**
- Currently pursuing CS or related degree
- Basic programming knowledge
- Strong interest in software development
- Available for 12-week summer internship
- Good academic standing

**Benefits:**
- Competitive stipend
- Housing assistance
- Mentorship program
- Return offer opportunity`,
    experience_level: 'entry',
    employment_type: 'internship',
    interview_frequency_score: 0.55
  },
  {
    title: 'Staff Engineer',
    description: `Join as a Staff Engineer to drive technical strategy and lead cross-team initiatives.

**Responsibilities:**
- Define technical vision and strategy
- Lead large-scale, cross-team technical initiatives
- Mentor and grow engineering talent
- Drive engineering culture and best practices
- Collaborate with leadership on technical roadmap
- Represent engineering in company-wide decisions

**Requirements:**
- 8+ years of software engineering experience
- Track record of delivering impactful projects
- Strong system design and architecture skills
- Excellent communication and leadership abilities
- Experience working across multiple teams
- Ability to influence without direct authority

**Nice to Have:**
- Previous staff or principal engineer experience
- Industry recognition through publications or talks
- Experience scaling engineering organizations`,
    experience_level: 'lead',
    employment_type: 'full-time',
    interview_frequency_score: 0.70
  },
  {
    title: 'DevOps Engineer',
    description: `Looking for a DevOps Engineer to improve our infrastructure and deployment processes.

**Responsibilities:**
- Design and maintain CI/CD pipelines
- Manage cloud infrastructure (AWS/GCP/Azure)
- Implement infrastructure as code
- Monitor system health and respond to incidents
- Automate operational tasks
- Collaborate with development teams on deployments

**Requirements:**
- 3+ years of DevOps/SRE experience
- Strong experience with cloud platforms
- Proficiency with container technologies (Docker, Kubernetes)
- Experience with infrastructure as code (Terraform, CloudFormation)
- Knowledge of monitoring and logging tools
- Scripting skills (Python, Bash, Go)

**Nice to Have:**
- Experience with multi-cloud environments
- Security certifications
- Database administration experience`,
    experience_level: 'mid',
    employment_type: 'full-time',
    interview_frequency_score: 0.75
  },
  {
    title: 'Machine Learning Engineer',
    description: `Join our ML team to build and deploy machine learning models at scale.

**Responsibilities:**
- Design and implement ML models and pipelines
- Deploy models to production systems
- Optimize model performance and efficiency
- Collaborate with data scientists and engineers
- Maintain ML infrastructure and tooling
- Stay current with ML research and techniques

**Requirements:**
- MS/PhD in CS, ML, or related field (or equivalent experience)
- Strong Python programming skills
- Experience with ML frameworks (TensorFlow, PyTorch)
- Knowledge of ML algorithms and techniques
- Experience deploying models to production
- Strong mathematical and statistical background

**Nice to Have:**
- Publications in ML/AI conferences
- Experience with NLP or computer vision
- Knowledge of distributed training`,
    experience_level: 'senior',
    employment_type: 'full-time',
    interview_frequency_score: 0.78
  },
  {
    title: 'Data Engineer',
    description: `Build and maintain data infrastructure that powers our analytics and ML systems.

**Responsibilities:**
- Design and build data pipelines
- Maintain data warehouse and data lake infrastructure
- Ensure data quality and reliability
- Optimize query performance
- Collaborate with data scientists and analysts
- Implement data governance practices

**Requirements:**
- 3+ years of data engineering experience
- Strong SQL skills
- Experience with big data technologies (Spark, Kafka)
- Knowledge of data warehousing concepts
- Python or Scala programming skills
- Experience with cloud data services

**Nice to Have:**
- Experience with real-time data processing
- Knowledge of data modeling
- Experience with orchestration tools (Airflow)`,
    experience_level: 'mid',
    employment_type: 'full-time',
    interview_frequency_score: 0.72
  }
];

// Generate jobs for each company
function generateJobs(companies) {
  const jobs = [];
  const locations = [
    'San Francisco, CA',
    'New York, NY',
    'Seattle, WA',
    'Austin, TX',
    'Boston, MA',
    'Los Angeles, CA',
    'Chicago, IL',
    'Denver, CO'
  ];

  companies.forEach((company, companyIndex) => {
    // Each company gets 2-4 random job postings
    const numJobs = Math.floor(Math.random() * 3) + 2;
    const selectedJobIndices = new Set();

    while (selectedJobIndices.size < numJobs && selectedJobIndices.size < jobTemplates.length) {
      selectedJobIndices.add(Math.floor(Math.random() * jobTemplates.length));
    }

    selectedJobIndices.forEach((jobIndex) => {
      const template = jobTemplates[jobIndex];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const remoteAllowed = Math.random() > 0.4; // 60% chance of remote
      
      // Generate salary based on experience level
      let salaryMin, salaryMax;
      switch (template.experience_level) {
        case 'entry':
          salaryMin = 70000 + Math.floor(Math.random() * 20000);
          salaryMax = salaryMin + 30000 + Math.floor(Math.random() * 20000);
          break;
        case 'mid':
          salaryMin = 120000 + Math.floor(Math.random() * 30000);
          salaryMax = salaryMin + 50000 + Math.floor(Math.random() * 30000);
          break;
        case 'senior':
          salaryMin = 180000 + Math.floor(Math.random() * 40000);
          salaryMax = salaryMin + 80000 + Math.floor(Math.random() * 40000);
          break;
        case 'lead':
          salaryMin = 250000 + Math.floor(Math.random() * 50000);
          salaryMax = salaryMin + 100000 + Math.floor(Math.random() * 50000);
          break;
        default:
          salaryMin = 100000;
          salaryMax = 150000;
      }

      // Random posted date (within last 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const postedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(postedAt.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from posting

      jobs.push({
        companyName: company.name,
        title: template.title,
        description: template.description,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: 'USD',
        location: randomLocation,
        remote_allowed: remoteAllowed,
        experience_level: template.experience_level,
        employment_type: template.employment_type,
        posted_at: postedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        interview_frequency_score: template.interview_frequency_score + (Math.random() * 0.1 - 0.05)
      });
    });
  });

  return jobs;
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Step 1: Insert companies (first check for existing, then insert new ones)
    console.log('📋 Inserting companies...');
    
    const insertedCompanies = [];
    for (const company of companies) {
      // Check if company already exists
      const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('name', company.name)
        .single();
      
      if (existing) {
        insertedCompanies.push(existing);
        console.log(`   ✓ Found existing: ${company.name}`);
      } else {
        // Insert new company
        const { data: newCompany, error: insertError } = await supabase
          .from('companies')
          .insert(company)
          .select()
          .single();
        
        if (insertError) {
          console.warn(`   ⚠ Error inserting ${company.name}:`, insertError.message);
        } else {
          insertedCompanies.push(newCompany);
          console.log(`   ✓ Inserted: ${company.name}`);
        }
      }
    }

    console.log(`✅ Processed ${insertedCompanies.length} companies\n`);

    // Create company lookup map
    const companyMap = {};
    insertedCompanies.forEach(company => {
      companyMap[company.name] = company.id;
    });

    // Step 2: Generate and insert jobs
    console.log('💼 Generating jobs...');
    const jobsData = generateJobs(companies);
    
    console.log(`📋 Inserting ${jobsData.length} jobs...`);
    
    let jobsInserted = 0;
    for (const job of jobsData) {
      const companyId = companyMap[job.companyName];
      if (!companyId) {
        console.warn(`Warning: Company ${job.companyName} not found`);
        continue;
      }

      const { companyName, ...jobRecord } = job;
      jobRecord.company_id = companyId;

      const { error: jobError } = await supabase
        .from('jobs')
        .insert(jobRecord);

      if (jobError) {
        console.warn(`Warning: Failed to insert job ${job.title} for ${companyName}:`, jobError.message);
      } else {
        jobsInserted++;
      }
    }

    console.log(`✅ Inserted ${jobsInserted} jobs\n`);

    // Step 3: Verify results
    console.log('📊 Verifying results...');
    
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    const { count: jobsCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   - Total companies: ${companiesCount}`);
    console.log(`   - Total active jobs: ${jobsCount}`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();

