import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProblems } from '../services/api';
import './ProblemsPage.css';

function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      const data = await getProblems();
      setProblems(data);
    } catch (error) {
      console.error('Failed to load problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter(p => {
    const matchesFilter = filter === 'all' || p.difficulty === filter;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'var(--easy)';
      case 'medium': return 'var(--medium)';
      case 'hard': return 'var(--hard)';
      default: return 'var(--text-secondary)';
    }
  };

  const stats = {
    total: problems.length,
    easy: problems.filter(p => p.difficulty === 'easy').length,
    medium: problems.filter(p => p.difficulty === 'medium').length,
    hard: problems.filter(p => p.difficulty === 'hard').length,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading problems...</p>
      </div>
    );
  }

  return (
    <div className="problems-page">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">
          Master Your <span className="gradient-text">Coding Skills</span>
        </h1>
        <p className="hero-subtitle">
          Challenge yourself with problems across 10+ programming languages
        </p>
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Problems</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: 'var(--easy)'}}>{stats.easy}</div>
            <div className="stat-label">Easy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: 'var(--medium)'}}>{stats.medium}</div>
            <div className="stat-label">Medium</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: 'var(--hard)'}}>{stats.hard}</div>
            <div className="stat-label">Hard</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="problems-controls">
        <div className="search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search problems or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'easy' ? 'active' : ''}`}
            onClick={() => setFilter('easy')}
          >
            Easy
          </button>
          <button 
            className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
            onClick={() => setFilter('medium')}
          >
            Medium
          </button>
          <button 
            className={`filter-btn ${filter === 'hard' ? 'active' : ''}`}
            onClick={() => setFilter('hard')}
          >
            Hard
          </button>
        </div>
      </div>

      {/* Problems Table */}
      <div className="problems-container">
        <div className="problems-header">
          <div className="col-status">Status</div>
          <div className="col-title">Title</div>
          <div className="col-difficulty">Difficulty</div>
          <div className="col-tags">Tags</div>
        </div>
        
        {filteredProblems.map((problem) => (
          <Link 
            to={`/problems/${problem.id}`} 
            key={problem.id} 
            className="problem-card"
          >
            <div className="col-status">
              <div className="status-indicator"></div>
            </div>
            <div className="col-title">
              <span className="problem-id">#{problem.id}</span>
              <span className="problem-title">{problem.title}</span>
            </div>
            <div className="col-difficulty">
              <span 
                className="difficulty-badge"
                style={{ 
                  color: getDifficultyColor(problem.difficulty),
                  borderColor: getDifficultyColor(problem.difficulty)
                }}
              >
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </span>
            </div>
            <div className="col-tags">
              {problem.tags?.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="tag-badge">{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ProblemsPage;