import { useState, useEffect } from 'react'
import { getProblems } from '../services/api'
import { X } from 'lucide-react'
import './CodingConsole.css'

export default function CodingConsole({ onClose, onSubmit, onProblemSelect }) {
  const [problems, setProblems] = useState([])
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProblems()
  }, [])

  const loadProblems = async () => {
    try {
      const response = await getProblems()
      setProblems(response.data || [])
      if (response.data && response.data.length > 0) {
        setSelectedProblem(response.data[0])
        onProblemSelect?.(response.data[0])
      }
    } catch (error) {
      console.error('Failed to load problems:', error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedProblem || !code.trim()) return

    setLoading(true)
    try {
      onSubmit(code, selectedProblem.id, selectedProblem.difficulty, 'javascript')
      setCode('')
    } catch (error) {
      console.error('Failed to submit code:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedProblem) {
    return (
      <div className="coding-console-overlay" onClick={onClose}>
        <div className="coding-console" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="loading">Loading problems...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="coding-console-overlay" onClick={onClose}>
      <div className="coding-console" onClick={(e) => e.stopPropagation()}>
        <div className="console-header">
          <h3>Coding Challenge</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="console-content">
          <div className="problem-selector">
            <label>Select Problem:</label>
            <select 
              value={selectedProblem.id} 
              onChange={(e) => {
                const problem = problems.find(p => p.id === e.target.value)
                setSelectedProblem(problem)
                onProblemSelect?.(problem)
                setCode('')
              }}
            >
              {problems.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </div>

          <div className="problem-description">
            <h4>{selectedProblem.title}</h4>
            <p>{selectedProblem.description}</p>
            <div className="problem-meta">
              <span className={`difficulty ${selectedProblem.difficulty}`}>
                {selectedProblem.difficulty}
              </span>
            </div>
          </div>

          <div className="code-editor">
            <label>Your Solution (JavaScript):</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="function solve(input) {&#10;  // Your code here&#10;  return input;&#10;}"
              className="code-input"
            />
          </div>

          <div className="console-actions">
            <button 
              onClick={handleSubmit} 
              disabled={loading || !code.trim()}
              className="submit-btn"
            >
              {loading ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

