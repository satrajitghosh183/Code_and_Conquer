import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { CheckCircle, XCircle, Clock, Database, Zap, AlertCircle, Lightbulb } from 'lucide-react'
import { getProblem, submitCode, runCode, getAvailableLanguages } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { Icon } from '../components/Icons'
import { formatMarkdown } from '../utils/markdown'
import './ProblemDetailPage.css'

// Default language list - will be updated from API
const DEFAULT_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', iconName: 'javascript', available: true },
  { value: 'typescript', label: 'TypeScript', iconName: 'javascript', available: true },
  { value: 'python', label: 'Python', iconName: 'python', available: true },
  { value: 'java', label: 'Java', iconName: 'java', available: true },
  { value: 'cpp', label: 'C++', iconName: 'cpp', available: true },
  { value: 'c', label: 'C', iconName: 'settings', available: true },
  { value: 'go', label: 'Go', iconName: 'go', available: true },
  { value: 'rust', label: 'Rust', iconName: 'bolt', available: true },
  { value: 'ruby', label: 'Ruby', iconName: 'ruby', available: true },
  { value: 'php', label: 'PHP', iconName: 'code', available: true }
]

export default function ProblemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addRewards } = useGame()
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState('')
  const [codeByLanguage, setCodeByLanguage] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [availableLanguages, setAvailableLanguages] = useState(DEFAULT_LANGUAGES)
  const [dockerAvailable, setDockerAvailable] = useState(true)

  useEffect(() => {
    loadProblem()
    loadLanguages()
  }, [id])

  const loadLanguages = async () => {
    try {
      const response = await getAvailableLanguages()
      if (response.data?.languages) {
        const langList = response.data.languages.map(lang => ({
          ...DEFAULT_LANGUAGES.find(l => l.value === lang.value) || { value: lang.value, label: lang.label, iconName: 'code' },
          available: lang.available
        }))
        setAvailableLanguages(langList)
        setDockerAvailable(response.data.dockerAvailable)
        
        // If current language is not available, switch to JavaScript
        const currentLang = langList.find(l => l.value === language)
        if (currentLang && !currentLang.available) {
          setLanguage('javascript')
        }
      }
    } catch (error) {
      console.warn('Failed to load available languages, using defaults')
      // Keep default languages on error
    }
  }

  // Handle language change - switch code but preserve user edits
  useEffect(() => {
    if (!problem) return
    
    // When language changes, load the code for that language
    // Check if we already have code saved for this language
    const savedCode = codeByLanguage[language]
    if (savedCode) {
      setCode(savedCode)
    } else {
      // Load starter code for the new language
      const starterCodeForLanguage = problem.starterCode?.[language] || 
                                      problem.starterCode?.javascript || 
                                      getDefaultStarterCode(language)
      setCode(starterCodeForLanguage)
      // Save it so we don't reload it next time
      setCodeByLanguage(prev => {
        if (prev[language]) return prev // Already saved
        return { ...prev, [language]: starterCodeForLanguage }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, problem?.id]) // Only when language or problem ID changes

  const getDefaultStarterCode = (lang) => {
    const defaults = {
      javascript: 'function solution() {\n    // Your code here\n}',
      typescript: 'function solution(): void {\n    // Your code here\n}',
      python: 'def solution():\n    # Your code here\n    pass',
      java: 'public class Solution {\n    public void solution() {\n        // Your code here\n    }\n}',
      cpp: '#include <vector>\n\nclass Solution {\npublic:\n    void solution() {\n        // Your code here\n    }\n};',
      c: '#include <stdio.h>\n\nvoid solution() {\n    // Your code here\n}',
      go: 'package main\n\nfunc solution() {\n    // Your code here\n}',
      rust: 'pub fn solution() {\n    // Your code here\n}',
      ruby: 'def solution\n    # Your code here\nend',
      php: '<?php\n\nfunction solution() {\n    // Your code here\n}'
    }
    return defaults[lang] || defaults.javascript
  }

  const loadProblem = async () => {
    try {
      setIsInitialLoad(true)
      const response = await getProblem(id)
      const problemData = response.data
      
      // Debug: Log test cases to help diagnose Run button issues
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded problem test cases:', {
          hasTestCases: !!problemData.testCases,
          isArray: Array.isArray(problemData.testCases),
          length: problemData.testCases?.length || 0,
          testCases: problemData.testCases
        });
      }
      
      setProblem(problemData)
      
      // Initialize code for all languages from starter code
      const initialCodeByLanguage = {}
      if (problemData.starterCode) {
        DEFAULT_LANGUAGES.forEach(lang => {
          initialCodeByLanguage[lang.value] = problemData.starterCode[lang.value] || 
                                              problemData.starterCode.javascript || 
                                              getDefaultStarterCode(lang.value)
        })
      } else {
        // If no starter code, use defaults
        DEFAULT_LANGUAGES.forEach(lang => {
          initialCodeByLanguage[lang.value] = getDefaultStarterCode(lang.value)
        })
      }
      
      setCodeByLanguage(initialCodeByLanguage)
      // Load starter code for current language
      const starterCode = initialCodeByLanguage[language] || getDefaultStarterCode(language)
      setCode(starterCode)
    } catch (error) {
      console.error('Failed to load problem:', error)
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      alert('Please log in to submit code')
      return
    }

    if (!code || !code.trim()) {
      alert('Please write some code before submitting')
      return
    }

    setSubmitting(true)
    setResult(null)
    setActiveTab('result')
    
    try {
      const response = await submitCode(id, code, language, user.id)
      setResult(response.data)
      
      // Add rewards if accepted
      if (response.data.status === 'accepted' && response.data.rewards) {
        await addRewards(response.data.rewards)
      }
    } catch (error) {
      console.error('Submission error:', error)
      setResult({
        status: 'error',
        error: error.response?.data?.error || error.message || 'An error occurred while submitting your code',
        passedTests: 0,
        totalTests: 0,
        testResults: []
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRun = async () => {
    if (!code || !code.trim()) {
      alert('Please write some code before running')
      return
    }

    if (!problem?.testCases || !Array.isArray(problem.testCases) || problem.testCases.length === 0) {
      // Show error in result tab instead of alert
      setActiveTab('result')
      setResult({
        status: 'error',
        error: 'No test cases available for this problem. Please submit your solution instead.',
        passedTests: 0,
        totalTests: 0,
        testResults: []
      })
      return
    }

    setSubmitting(true)
    setResult(null)
    setActiveTab('result')
    
    try {
      const response = await runCode(code, language, id)
      setResult({
        ...response.data,
        isRunMode: true
      })
    } catch (error) {
      console.error('Run error:', error)
      setResult({
        status: 'error',
        error: error.response?.data?.error || error.message || 'An error occurred while running your code',
        passedTests: 0,
        totalTests: 0,
        testResults: []
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  // Check if problem has test cases
  const hasTestCases = problem?.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0
  
  // Debug: Log why Run button might be disabled
  useEffect(() => {
    if (problem && !hasTestCases && process.env.NODE_ENV === 'development') {
      console.warn('Run button disabled - Problem test cases check:', {
        hasProblem: !!problem,
        hasTestCasesField: !!problem.testCases,
        isArray: Array.isArray(problem.testCases),
        length: problem.testCases?.length || 0,
        testCases: problem.testCases
      });
    }
  }, [problem, hasTestCases])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading problem...</p>
      </div>
    )
  }

  if (!problem) {
    return <div className="error-container">Problem not found</div>
  }

  return (
    <div className="problem-detail-page">
      <div className="problem-panel">
        <div className="panel-tabs">
          <button
            className={`tab ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            <span>Description</span>
          </button>
          <button
            className={`tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
            disabled={!result}
          >
            Results
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'description' && (
            <div className="description-tab">
                      <div className="problem-header">
                        <h1 className="problem-number">#{problem.displayId || problem.problemNumber || problem.id}</h1>
                        <h2 className="problem-title">{problem.title}</h2>
                      </div>

              <div className="problem-meta">
                <span className={`difficulty-badge ${problem.difficulty}`}>
                  {problem.difficulty.toUpperCase()}
                </span>
              </div>

              <div className="problem-description">
                <div 
                  className="description-text"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdown(problem.description)
                  }}
                />
              </div>

              {problem.constraints && problem.constraints.length > 0 && (
                <div className="constraints-section">
                  <h3 className="section-title">
                    <AlertCircle size={20} />
                    Constraints
                  </h3>
                  <ul className="constraints-list">
                    {problem.constraints.map((constraint, idx) => (
                      <li 
                        key={idx} 
                        className="constraint-item"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(constraint) }}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {problem.examples && problem.examples.length > 0 && (
                <div className="examples-section">
                  <h3 className="section-title">
                    <Zap size={20} />
                    Examples
                  </h3>
                  {problem.examples.map((example, idx) => (
                    <div key={idx} className="example-card">
                      <div className="example-label">Example {idx + 1}:</div>
                      <div className="example-content">
                        <div className="example-item">
                          <div className="example-label-text">Input:</div>
                          <pre className="example-code"><code>{example.input}</code></pre>
                        </div>
                        <div className="example-item">
                          <div className="example-label-text">Output:</div>
                          <pre className="example-code"><code>{example.output}</code></pre>
                        </div>
                        {example.explanation && (
                          <div className="example-item explanation">
                            <div className="example-label-text">Explanation:</div>
                            <p className="explanation-text">{example.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {problem.hints && problem.hints.length > 0 && (
                <div className="hints-section">
                  <h3 className="section-title">
                    <Lightbulb size={20} />
                    Hints
                  </h3>
                  <ul className="hints-list">
                    {problem.hints.map((hint, idx) => (
                      <li key={idx} className="hint-item">
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {problem.timeComplexity || problem.spaceComplexity ? (
                <div className="complexity-section">
                  <h3 className="section-title">
                    <Database size={20} />
                    Complexity
                  </h3>
                  <div className="complexity-info">
                    {problem.timeComplexity && (
                      <div className="complexity-item">
                        <strong>Time:</strong> <code className="inline-code">{problem.timeComplexity}</code>
                      </div>
                    )}
                    {problem.spaceComplexity && (
                      <div className="complexity-item">
                        <strong>Space:</strong> <code className="inline-code">{problem.spaceComplexity}</code>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'result' && result && (
            <div className="result-tab">
              <div className={`result-status status-${
                (result.status === 'accepted' || result.status === 'run_success') ? 'accepted' : 
                result.status === 'error' ? 'error' : 'failed'
              }`}>
                <div className="status-icon">
                  {(result.status === 'accepted' || result.status === 'run_success') ? (
                    <CheckCircle size={32} color="#51cf66" />
                  ) : (
                    <XCircle size={32} color="#ff6b6b" />
                  )}
                </div>
                <div className="status-text">
                  <h2>
                    {result.status === 'accepted' ? 'Accepted!' : 
                     result.status === 'run_success' ? 'All Tests Passed!' :
                     result.status === 'run_failed' ? 'Tests Failed' :
                     result.status === 'error' ? 'Error' : 
                     result.status === 'wrong_answer' ? 'Wrong Answer' :
                     'Failed'}
                  </h2>
                  {result.status === 'accepted' && result.rewards && (
                    <div className="rewards-display">
                      <div className="reward-badge">
                        <Zap size={18} />
                        <span>+{result.rewards.xp} XP</span>
                      </div>
                      <div className="reward-badge">
                        <Database size={18} />
                        <span>+{result.rewards.coins} coins</span>
                      </div>
                    </div>
                  )}
                  {result.status === 'run_success' && (
                    <div className="run-success-hint">
                      <span>Click <strong>Submit</strong> to run against all test cases</span>
                    </div>
                  )}
                  {result.executionTime !== undefined && (
                    <div className="execution-info">
                      <Clock size={14} />
                      <span>Execution time: {result.executionTime}ms</span>
                    </div>
                  )}
                </div>
              </div>

              {result.error && (
                <div className="error-message">
                  <strong>Error:</strong> {result.error}
                </div>
              )}

              {result.testResults && result.testResults.length > 0 && (
                <div className="test-results">
                  <div className="test-results-header">
                    <h3>Test Cases</h3>
                    <div className="test-summary">
                      <span className={`test-summary-text ${(result.status === 'accepted' || result.status === 'run_success') ? 'passed' : 'failed'}`}>
                        {result.passedTests || 0}/{result.totalTests || result.testResults.length} passed
                      </span>
                    </div>
                  </div>
                  <div className="test-cases-list">
                    {result.testResults.map((test, idx) => (
                      <details key={idx} className={`test-case-detail ${test.passed ? 'passed' : 'failed'}`}>
                        <summary className="test-case-summary">
                          <div className="test-case-header">
                            {test.passed ? (
                              <CheckCircle size={18} color="#51cf66" />
                            ) : (
                              <XCircle size={18} color="#ff6b6b" />
                            )}
                            <span className="test-case-title">Test Case {idx + 1}</span>
                            {test.executionTime !== undefined && (
                              <span className="test-execution-time">{test.executionTime}ms</span>
                            )}
                          </div>
                        </summary>
                        <div className="test-case-body">
                          {test.input !== undefined && (
                            <div className="test-case-row">
                              <div className="test-label">Input:</div>
                              <pre className="test-value"><code>{JSON.stringify(test.input, null, 2)}</code></pre>
                            </div>
                          )}
                          {test.expectedOutput !== undefined && (
                            <div className="test-case-row">
                              <div className="test-label">Expected:</div>
                              <pre className="test-value expected"><code>{JSON.stringify(test.expectedOutput, null, 2)}</code></pre>
                            </div>
                          )}
                          {test.actualOutput !== undefined && (
                            <div className="test-case-row">
                              <div className="test-label">Output:</div>
                              <pre className={`test-value ${test.passed ? 'passed' : 'failed'}`}>
                                <code>{JSON.stringify(test.actualOutput, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                          {test.error && (
                            <div className="test-case-row error">
                              <div className="test-label">Error:</div>
                              <pre className="test-value error-text"><code>{test.error}</code></pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {result.complexityAnalysis && 
               result.complexityAnalysis.confidence > 0 && 
               result.complexityAnalysis.timeComplexity !== 'Unknown' && (
                <div className="complexity-analysis">
                  <h3>Complexity Analysis</h3>
                  <div className="complexity-content">
                    {(result.complexityAnalysis.timeComplexity || result.complexityAnalysis.complexity) && (
                      <div className="complexity-item">
                        <strong>Time:</strong> <code className={`complexity-badge ${
                          result.complexityAnalysis.timeComplexity?.includes('n²') ? 'quadratic' :
                          result.complexityAnalysis.timeComplexity?.includes('log') ? 'logarithmic' :
                          result.complexityAnalysis.timeComplexity === 'O(1)' ? 'constant' :
                          result.complexityAnalysis.timeComplexity === 'O(n)' ? 'linear' : ''
                        }`}>{result.complexityAnalysis.timeComplexity || result.complexityAnalysis.complexity}</code>
                        {result.complexityAnalysis.confidence !== undefined && result.complexityAnalysis.confidence > 0 && (
                          <span className="confidence-badge">
                            ({Math.round(result.complexityAnalysis.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                    )}
                    {result.complexityAnalysis.spaceComplexity && 
                     result.complexityAnalysis.spaceComplexity !== 'Unknown' && (
                      <div className="complexity-item">
                        <strong>Space:</strong> <code className="complexity-badge">{result.complexityAnalysis.spaceComplexity}</code>
                      </div>
                    )}
                    {result.complexityAnalysis.details && (
                      <div className="complexity-details">
                        <small>{result.complexityAnalysis.details}</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="editor-panel">
        <div className="editor-header">
          <select 
            value={language} 
            onChange={(e) => {
              const newLanguage = e.target.value
              const selectedLang = availableLanguages.find(l => l.value === newLanguage)
              if (selectedLang && !selectedLang.available) {
                alert(`${selectedLang.label} is not available. Docker is required for this language.`)
                return
              }
              // Save current code before switching
              setCodeByLanguage(prev => ({ ...prev, [language]: code }))
              // Switch language (useEffect will load the code for new language)
              setLanguage(newLanguage)
            }}
            className="language-select"
          >
            {availableLanguages.map(lang => (
              <option 
                key={lang.value} 
                value={lang.value}
                disabled={!lang.available}
                style={{ opacity: lang.available ? 1 : 0.5 }}
              >
                {lang.label}{!lang.available ? ' (Docker required)' : ''}
              </option>
            ))}
          </select>
          {!dockerAvailable && (
            <span className="docker-warning" title="Docker is not available. Only JavaScript and Python are supported.">
              ⚠️
            </span>
          )}
          
          <div className="editor-actions">
            <button 
              onClick={handleRun} 
              disabled={submitting || !hasTestCases}
              className="btn-run"
              title={!hasTestCases ? 'No test cases available for this problem. Please submit your solution instead.' : ''}
            >
              {submitting ? 'Running...' : '▶ Run'}
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="btn-submit"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language}
          value={code}
          onChange={(value) => {
            const newCode = value || ''
            setCode(newCode)
            // Save code for current language
            setCodeByLanguage(prev => ({ ...prev, [language]: newCode }))
          }}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
        </div>
      </div>
    </div>
  )
}

