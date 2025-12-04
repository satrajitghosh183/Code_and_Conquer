import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Search, SlidersHorizontal } from 'lucide-react'
import { getProblems } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import './ProblemsPage.css'

export default function ProblemsPage() {
  const { user } = useAuth()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [solvedProblems, setSolvedProblems] = useState(new Set())

  useEffect(() => {
    loadProblems()
    if (user) {
      loadSolvedProblems()
    }
  }, [user])

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

  const loadSolvedProblems = async () => {
    // TODO: Load from backend once implemented
    // For now, check localStorage for solved problems
    try {
      const solved = localStorage.getItem(`solved_${user.id}`)
      if (solved) {
        setSolvedProblems(new Set(JSON.parse(solved)))
      }
    } catch (e) {
      console.error('Failed to load solved problems:', e)
    }
  }

  const filteredProblems = problems.filter(p => {
    const matchesFilter = filter === 'all' || p.difficulty?.toLowerCase() === filter.toLowerCase()
    const matchesSearch = !searchTerm || 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags?.some(tag => (typeof tag === 'string' ? tag : tag?.name || '')?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: problems.length,
    easy: problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length,
    medium: problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length,
    hard: problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length,
    solved: solvedProblems.size
  }

  if (loading) {
    return (
      <div className="problems-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading problems...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="problems-page">
      {/* Header */}
      <div className="problems-page-header">
        <h1>Problems</h1>
        <p className="problems-subtitle">Practice coding problems to level up your skills</p>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-text">Total</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item easy">
          <span className="stat-number">{stats.easy}</span>
          <span className="stat-text">Easy</span>
        </div>
        <div className="stat-item medium">
          <span className="stat-number">{stats.medium}</span>
          <span className="stat-text">Medium</span>
        </div>
        <div className="stat-item hard">
          <span className="stat-number">{stats.hard}</span>
          <span className="stat-text">Hard</span>
        </div>
      </div>

      {/* Controls */}
      <div className="problems-toolbar">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-tabs">
          {['all', 'easy', 'medium', 'hard'].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''} ${f !== 'all' ? f : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="problems-table">
        <div className="table-header">
          <div className="col-status">Status</div>
          <div className="col-title">Title</div>
          <div className="col-difficulty">Difficulty</div>
          <div className="col-tags">Topics</div>
        </div>

        <div className="table-body">
          {filteredProblems.length === 0 ? (
            <div className="empty-state">
              <p>No problems found matching your criteria</p>
            </div>
          ) : (
            filteredProblems.map((problem, index) => {
              const isSolved = solvedProblems.has(problem.id)
              const difficulty = problem.difficulty?.toLowerCase() || 'easy'
              
              return (
                <Link
                  to={`/problems/${problem.id}`}
                  key={problem.id}
                  className={`problem-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                >
                  <div className="col-status">
                    {isSolved ? (
                      <Check size={18} className="status-solved" />
                    ) : (
                      <Circle size={18} className="status-unsolved" />
                    )}
                  </div>
                  
                  <div className="col-title">
                    <span className="problem-name">{problem.title}</span>
                  </div>
                  
                  <div className="col-difficulty">
                    <span className={`difficulty-label ${difficulty}`}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </span>
                  </div>
                  
                  <div className="col-tags">
                    {problem.tags && problem.tags.length > 0 ? (
                      problem.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="topic-tag">
                          {typeof tag === 'string' ? tag : tag?.name || tag}
                        </span>
                      ))
                    ) : (
                      <span className="topic-tag empty">—</span>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredProblems.length} of {problems.length} problems
      </div>
    </div>
  )
}
