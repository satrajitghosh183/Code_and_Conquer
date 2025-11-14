import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProblems } from '../services/api'
import './ProblemsPage.css'

export default function ProblemsPage() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadProblems()
  }, [])

  const loadProblems = async () => {
    try {
      const response = await getProblems()
      setProblems(response.data || [])
    } catch (error) {
      console.error('Failed to load problems:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sort problems: first by difficulty (easy, medium, hard), then by id
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  const sortedProblems = [...problems].sort((a, b) => {
    const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || 99;
    const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || 99;
    if (diffA !== diffB) return diffA - diffB;
    // If same difficulty, sort by id (convert to number if possible)
    const idA = parseInt(a.id) || a.id;
    const idB = parseInt(b.id) || b.id;
    if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
    return String(idA).localeCompare(String(idB));
  });

  const filteredProblems = sortedProblems.filter(p => {
    const matchesFilter = filter === 'all' || p.difficulty?.toLowerCase() === filter.toLowerCase()
    const matchesSearch = !searchTerm || 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags?.some(tag => tag?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#51cf66'
      case 'medium': return '#ffc107'
      case 'hard': return '#ff6b6b'
      default: return '#8e8e93'
    }
  }

  const stats = {
    total: problems.length,
    easy: problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length,
    medium: problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length,
    hard: problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length,
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading problems...</p>
      </div>
    )
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
            <div className="stat-value" style={{color: getDifficultyColor('easy')}}>{stats.easy}</div>
            <div className="stat-label">Easy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: getDifficultyColor('medium')}}>{stats.medium}</div>
            <div className="stat-label">Medium</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: getDifficultyColor('hard')}}>{stats.hard}</div>
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
              <span className="problem-id">#{problem.displayId || problem.problemNumber || problem.id}</span>
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
                {problem.difficulty ? problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1) : 'Unknown'}
              </span>
            </div>
            <div className="col-tags">
              {problem.tags && problem.tags.length > 0 ? (
                problem.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="tag-badge">{typeof tag === 'string' ? tag : tag.name || tag}</span>
                ))
              ) : (
                <span className="tag-badge tag-empty">No tags</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

