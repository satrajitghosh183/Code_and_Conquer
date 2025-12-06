import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllJobs, 
  getJobRecommendations, 
  getUserSkillProfile,
  getJobStatistics,
  getTrendingJobs,
  markJobViewed,
  markJobApplied,
  saveJob,
  unsaveJob,
  getUserStats
} from '../services/api';
import './JobRecommendationsPage.css';

// Icons as SVG components
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

// Company careers page URLs
const COMPANY_CAREERS_URLS = {
  'Google': 'https://careers.google.com/',
  'Meta': 'https://www.metacareers.com/',
  'Amazon': 'https://www.amazon.jobs/',
  'Microsoft': 'https://careers.microsoft.com/',
  'Apple': 'https://jobs.apple.com/',
  'Netflix': 'https://jobs.netflix.com/',
  'Stripe': 'https://stripe.com/jobs',
  'Airbnb': 'https://careers.airbnb.com/',
  'Uber': 'https://www.uber.com/careers/',
  'Discord': 'https://discord.com/careers',
  'Coinbase': 'https://www.coinbase.com/careers',
  'Spotify': 'https://www.lifeatspotify.com/',
  // Default fallback for other companies
  'default': 'https://www.linkedin.com/jobs/'
};

const RemoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const TrendingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Job Card Component
const JobCard = ({ job, matchScore, onView, onApply, onSave, isSaved, isRecommendation }) => {
  const company = job.company || {};
  const [expanded, setExpanded] = useState(false);
  
  // Get the careers URL for this company
  const getCareerUrl = () => {
    const companyName = company.name || '';
    return COMPANY_CAREERS_URLS[companyName] || COMPANY_CAREERS_URLS['default'];
  };

  const formatSalary = (min, max, currency = 'USD') => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    });
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return min ? `From ${formatter.format(min)}` : `Up to ${formatter.format(max)}`;
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const posted = new Date(date);
    const diffDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const experienceLevelLabels = {
    'entry': 'Entry Level',
    'mid': 'Mid Level',
    'senior': 'Senior',
    'lead': 'Lead / Principal'
  };

  const salary = formatSalary(job.salary_min || job.salaryMin, job.salary_max || job.salaryMax, job.salary_currency || job.salaryCurrency);

  return (
    <div className={`job-card ${expanded ? 'expanded' : ''}`} onClick={() => { setExpanded(!expanded); onView && onView(job.id); }}>
      <div className="job-card-header">
        <div className="company-info">
          {company.logo_url || company.logo ? (
            <img 
              src={company.logo_url || company.logo} 
              alt={company.name} 
              className="company-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="company-logo-placeholder">
              {(company.name || 'C')[0]}
            </div>
          )}
          <div className="company-details">
            <h3 className="job-title">{job.title}</h3>
            <span className="company-name">{company.name || 'Company'}</span>
          </div>
        </div>
        <div className="job-actions">
          {matchScore > 0 && (
            <div className="match-score" title="Match Score">
              <div className="match-score-circle" style={{ '--score': matchScore }}>
                <span>{Math.round(matchScore)}%</span>
              </div>
            </div>
          )}
          <button 
            className={`save-btn ${isSaved ? 'saved' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSave && onSave(job.id); }}
            title={isSaved ? 'Remove from saved' : 'Save job'}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        </div>
      </div>

      <div className="job-meta">
        <span className="meta-item">
          <LocationIcon />
          {job.location || 'Location not specified'}
        </span>
        {(job.remote_allowed || job.remoteAllowed) && (
          <span className="meta-item remote">
            <RemoteIcon />
            Remote OK
          </span>
        )}
        <span className="meta-item experience">
          <BriefcaseIcon />
          {experienceLevelLabels[job.experience_level || job.experienceLevel] || 'Experience varies'}
        </span>
        {salary && (
          <span className="meta-item salary">
            <DollarIcon />
            {salary}
          </span>
        )}
        <span className="meta-item posted">
          <ClockIcon />
          {getTimeAgo(job.posted_at || job.postedAt)}
        </span>
      </div>

      {expanded && (
        <div className="job-expanded-content">
          <div className="job-description">
            <h4>Job Description</h4>
            <p>{job.description?.substring(0, 800)}{job.description?.length > 800 ? '...' : ''}</p>
          </div>
          
          {isRecommendation && (
            <div className="recommendation-reason">
              <h4>Why We Recommend This</h4>
              <p>{job.recommendation_reason || job.recommendationReason || 'This job matches your skills and experience level.'}</p>
            </div>
          )}

          <div className="job-cta">
            <a 
              href={getCareerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="apply-btn"
              onClick={(e) => { 
                e.stopPropagation(); 
                onApply && onApply(job.id); 
              }}
            >
              Apply Now <ExternalLinkIcon />
            </a>
            {company.website && (
              <a 
                href={company.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="company-link"
                onClick={(e) => e.stopPropagation()}
              >
                Visit Company
              </a>
            )}
          </div>
        </div>
      )}

      <div className="job-tags">
        <span className={`tag type-${(job.employment_type || job.employmentType || 'full-time').toLowerCase().replace('-', '')}`}>
          {(job.employment_type || job.employmentType || 'Full-time').replace('-', ' ')}
        </span>
        {job.interview_frequency_score > 0.7 && (
          <span className="tag hot">
            <TrendingIcon /> Hot
          </span>
        )}
      </div>
    </div>
  );
};

// Stats Bar Component
const StatsBar = ({ stats, userStats }) => {
  // Get problems solved from user stats (the actual count from the database)
  const problemsSolved = userStats?.problemsSolved || userStats?.problems_solved || 0;
  
  return (
    <div className="stats-bar" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem' }}>
      <div className="stat-item" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="stat-number">{stats?.totalJobs || 0}</span>
        <span className="stat-text">Active Jobs</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="stat-number">{stats?.totalCompanies || 0}</span>
        <span className="stat-text">Companies</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="stat-number">{stats?.remoteJobs || 0}</span>
        <span className="stat-text">Remote</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="stat-number">{problemsSolved}</span>
        <span className="stat-text">Problems Solved</span>
      </div>
    </div>
  );
};

// Skill Profile Component
const SkillProfile = ({ profile, userStats }) => {
  const levelColors = {
    'entry': '#10b981',
    'mid': '#3b82f6', 
    'senior': '#a855f7',
    'lead': '#f59e0b'
  };

  const levelLabels = {
    'entry': 'Entry Level',
    'mid': 'Mid Level',
    'senior': 'Senior',
    'lead': 'Lead / Principal'
  };

  // Get problems solved from user stats (the actual count)
  const problemsSolved = userStats?.problemsSolved || userStats?.problems_solved || 0;
  
  // Determine level based on actual problems solved
  let level = 'entry';
  if (problemsSolved >= 100) level = 'lead';
  else if (problemsSolved >= 50) level = 'senior';
  else if (problemsSolved >= 20) level = 'mid';
  
  // Use profile's level if available and problems > 0
  if (profile?.estimatedExperienceLevel && problemsSolved > 0) {
    level = profile.estimatedExperienceLevel;
  }
  
  const totalProblems = problemsSolved;
  const breakdown = profile?.difficultyBreakdown || { easy: 0, medium: 0, hard: 0 };

  return (
    <div className="skill-profile" style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', minWidth: '280px' }}>
      <div className="skill-profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', margin: 0 }}>Your Skill Profile</h3>
        <span className="level-badge" style={{ padding: '0.25rem 0.625rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', background: `${levelColors[level]}20`, color: levelColors[level] }}>
          {levelLabels[level]}
        </span>
      </div>
      
      <div className="skill-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
        <div className="skill-stat">
          <span className="skill-stat-value">{totalProblems}</span>
          <span className="skill-stat-label">Problems</span>
        </div>
        {totalProblems > 0 && (
          <>
            <div className="skill-stat easy">
              <span className="skill-stat-value">{breakdown.easy || 0}</span>
              <span className="skill-stat-label">Easy</span>
            </div>
            <div className="skill-stat medium">
              <span className="skill-stat-value">{breakdown.medium || 0}</span>
              <span className="skill-stat-label">Medium</span>
            </div>
            <div className="skill-stat hard">
              <span className="skill-stat-value">{breakdown.hard || 0}</span>
              <span className="skill-stat-label">Hard</span>
            </div>
          </>
        )}
      </div>

      {totalProblems > 0 && (
        <div className="difficulty-progress">
          <div 
            className="progress-segment easy" 
            style={{ width: `${(breakdown.easy / totalProblems) * 100}%` }}
          />
          <div 
            className="progress-segment medium" 
            style={{ width: `${(breakdown.medium / totalProblems) * 100}%` }}
          />
          <div 
            className="progress-segment hard" 
            style={{ width: `${(breakdown.hard / totalProblems) * 100}%` }}
          />
        </div>
      )}

      {profile?.strongestCategories?.length > 0 && (
        <div className="skill-categories">
          <span className="categories-label">Strongest:</span>
          <div className="category-chips">
            {profile.strongestCategories.slice(0, 3).map((cat, i) => (
              <span key={i} className="category-chip">{cat}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const JobRecommendationsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [skillProfile, setSkillProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    experienceLevel: '',
    location: '',
    remoteOnly: false
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const promises = [
          getJobStatistics().catch(() => ({ data: { statistics: null } })),
          getTrendingJobs(10).catch(() => ({ data: { jobs: [] } })),
          getAllJobs({ limit: 50 }).catch(() => ({ data: { jobs: [] } }))
        ];

        if (user?.id) {
          promises.push(
            getJobRecommendations(user.id, { limit: 20, minMatchScore: 0 }).catch(() => ({ data: { recommendations: [] } })),
            getUserSkillProfile(user.id).catch(() => ({ data: { profile: null } })),
            getUserStats(user.id).catch(() => ({ data: null }))
          );
        }

        const results = await Promise.all(promises);
        
        setStatistics(results[0]?.data?.statistics);
        setTrendingJobs(results[1]?.data?.jobs || []);
        setJobs(results[2]?.data?.jobs || []);
        
        if (user?.id) {
          setRecommendations(results[3]?.data?.recommendations || []);
          setSkillProfile(results[4]?.data?.profile);
          setUserStats(results[5]?.data);
        }
      } catch (err) {
        console.error('Error fetching job data:', err);
        setError('Failed to load job data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Fetch filtered jobs
  useEffect(() => {
    if (activeTab === 'all' && !loading) {
      fetchAllJobs();
    }
  }, [filters]);

  const fetchAllJobs = async () => {
    try {
      const params = {
        limit: 50,
        ...(filters.search && { search: filters.search }),
        ...(filters.experienceLevel && { experienceLevel: filters.experienceLevel }),
        ...(filters.location && { location: filters.location }),
        ...(filters.remoteOnly && { remoteOnly: 'true' })
      };

      const response = await getAllJobs(params);
      setJobs(response.data?.jobs || []);
    } catch (err) {
      console.error('Error fetching all jobs:', err);
    }
  };

  const handleSaveJob = useCallback(async (jobId) => {
    if (!user?.id) return;

    try {
      if (savedJobIds.has(jobId)) {
        await unsaveJob(jobId, user.id);
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        await saveJob(jobId, user.id);
        setSavedJobIds(prev => new Set([...prev, jobId]));
      }
    } catch (err) {
      console.error('Error saving job:', err);
    }
  }, [user?.id, savedJobIds]);

  const handleViewJob = useCallback(async (jobId) => {
    if (!user?.id) return;
    try {
      await markJobViewed(jobId, user.id);
    } catch (err) {
      // Silent fail for view tracking
    }
  }, [user?.id]);

  const handleApplyJob = useCallback(async (jobId) => {
    if (!user?.id) return;
    try {
      await markJobApplied(jobId, user.id);
    } catch (err) {
      console.error('Error marking job as applied:', err);
    }
  }, [user?.id]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getDisplayJobs = () => {
    switch (activeTab) {
      case 'recommended':
        return recommendations.map(rec => ({
          ...rec.job,
          matchScore: rec.matchScore,
          recommendation_reason: rec.recommendationReason
        }));
      case 'trending':
        return trendingJobs;
      case 'all':
      default:
        return jobs;
    }
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="jobs-page">
      <div className="jobs-page-header">
        <h1>Job Opportunities</h1>
        <p className="jobs-subtitle">Discover roles that match your coding skills and experience</p>
      </div>

      <div className="top-section" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatsBar stats={statistics} userStats={userStats} />
        <SkillProfile profile={skillProfile} userStats={userStats} />
      </div>

      <div className="jobs-toolbar">
        <div className="search-container">
          <SearchIcon className="search-icon" />
          <input 
            type="text"
            className="search-input"
            placeholder="Search jobs, companies, skills..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Jobs
          </button>
          <button 
            className={`filter-tab ${activeTab === 'recommended' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommended')}
          >
            For You {recommendations.length > 0 && `(${recommendations.length})`}
          </button>
          <button 
            className={`filter-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </button>
        </div>
      </div>

      <div className="jobs-filters-row">
        <select 
          className="filter-select"
          value={filters.experienceLevel}
          onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="entry">Entry Level</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead / Principal</option>
        </select>
        
        <input 
          type="text"
          className="filter-input"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
        />
        
        <label className="filter-checkbox">
          <input 
            type="checkbox"
            checked={filters.remoteOnly}
            onChange={(e) => handleFilterChange('remoteOnly', e.target.checked)}
          />
          <span>Remote Only</span>
        </label>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="empty-state">
          <BriefcaseIcon />
          <h3>No jobs found</h3>
          <p>
            {activeTab === 'recommended' 
              ? "Solve more coding problems to get personalized job recommendations based on your skills!"
              : "No jobs match your current filters. Try adjusting your search criteria."}
          </p>
        </div>
      ) : (
        <div className="jobs-list">
          {displayJobs.map((job) => (
            <JobCard 
              key={job.id}
              job={job}
              matchScore={job.matchScore || 0}
              onView={handleViewJob}
              onApply={handleApplyJob}
              onSave={handleSaveJob}
              isSaved={savedJobIds.has(job.id)}
              isRecommendation={activeTab === 'recommended'}
            />
          ))}
        </div>
      )}

      {displayJobs.length > 0 && (
        <div className="results-info">
          Showing {displayJobs.length} {displayJobs.length === 1 ? 'job' : 'jobs'}
        </div>
      )}
    </div>
  );
};

export default JobRecommendationsPage;
