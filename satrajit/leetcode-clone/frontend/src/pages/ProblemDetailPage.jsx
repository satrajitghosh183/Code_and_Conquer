// import { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import { CheckCircle, XCircle, Clock, Database, Zap, TrendingUp, AlertCircle } from 'lucide-react';
// import { getProblem, submitCode, runCode } from '../services/api';
// import './ProblemDetailPage.css';

// const LANGUAGES = [
//   { value: 'javascript', label: 'JavaScript', icon: '🟨' },
//   { value: 'typescript', label: 'TypeScript', icon: '🔷' },
//   { value: 'python', label: 'Python', icon: '🐍' },
//   { value: 'java', label: 'Java', icon: '☕' },
//   { value: 'cpp', label: 'C++', icon: '⚡' },
//   { value: 'c', label: 'C', icon: '🔧' },
//   { value: 'go', label: 'Go', icon: '🐹' },
//   { value: 'rust', label: 'Rust', icon: '🦀' },
//   { value: 'ruby', label: 'Ruby', icon: '💎' },
//   { value: 'php', label: 'PHP', icon: '🐘' }
// ];

// const CHART_COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

// function ProblemDetailPage() {
//   const { id } = useParams();
//   const [problem, setProblem] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [language, setLanguage] = useState('javascript');
//   const [code, setCode] = useState('');
//   const [submitting, setSubmitting] = useState(false);
//   const [result, setResult] = useState(null);
//   const [activeTab, setActiveTab] = useState('description');
//   const [showVisualization, setShowVisualization] = useState(true);

//   useEffect(() => {
//     loadProblem();
//   }, [id]);

//   useEffect(() => {
//     if (problem && problem.starterCode) {
//       setCode(problem.starterCode[language] || '');
//     }
//   }, [language, problem]);

//   const loadProblem = async () => {
//     try {
//       const data = await getProblem(id);
//       setProblem(data);
//       setCode(data.starterCode?.javascript || '');
//     } catch (error) {
//       console.error('Failed to load problem:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async () => {
//     setSubmitting(true);
//     setResult(null);
//     try {
//       const response = await submitCode(id, code, language);
//       setResult(response);
//       setActiveTab('result');
//     } catch (error) {
//       setResult({
//         status: 'error',
//         error: error.message
//       });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // const handleRun = async () => {
//   //   if (!problem.testCases || problem.testCases.length === 0) {
//   //     alert('No test cases available');
//   //     return;
//   //   }

//   //   setSubmitting(true);
//   //   setResult(null);
//   //   try {
//   //     const testCase = problem.testCases[0];
//   //     const response = await runCode(code, language, testCase);
//   //     setResult({
//   //       status: response.success ? 'run_success' : 'run_error',
//   //       ...response
//   //     });
//   //     setActiveTab('result');
//   //   } catch (error) {
//   //     setResult({
//   //       status: 'error',
//   //       error: error.message
//   //     });
//   //   } finally {
//   //     setSubmitting(false);
//   //   }
//   // };


//   const handleRun = async () => {
//   if (!problem.testCases || problem.testCases.length === 0) {
//     alert('No test cases available');
//     return;
//   }

//   setSubmitting(true);
//   setResult(null);
//   try {
//     // Run against all visible test cases
//     const response = await runCode(code, language, id);
//     setResult({
//       ...response,
//       isRunMode: true // Flag to distinguish from full submit
//     });
//     setActiveTab('result');
//   } catch (error) {
//     setResult({
//       status: 'error',
//       error: error.message
//     });
//   } finally {
//     setSubmitting(false);
//   }
// };
//   const getDifficultyColor = (difficulty) => {
//     switch (difficulty) {
//       case 'easy': return 'var(--easy)';
//       case 'medium': return 'var(--medium)';
//       case 'hard': return 'var(--hard)';
//       default: return 'var(--text-secondary)';
//     }
//   };

//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'accepted':
//         return <CheckCircle size={24} color="var(--easy)" />;
//       case 'wrong_answer':
//       case 'error':
//       case 'run_error':
//         return <XCircle size={24} color="var(--hard)" />;
//       case 'run_success':
//         return <CheckCircle size={24} color="var(--easy)" />;
//       default:
//         return <AlertCircle size={24} color="var(--medium)" />;
//     }
//   };

//   const getStatusText = (status) => {
//     switch (status) {
//       case 'accepted': return 'Accepted';
//       case 'wrong_answer': return 'Wrong Answer';
//       case 'error': return 'Error';
//       case 'run_success': return 'Test Run Success';
//       case 'run_error': return 'Test Run Failed';
//       default: return 'Unknown';
//     }
//   };

//   const generatePerformanceData = (testResults) => {
//     if (!testResults) return [];
//     return testResults.map((test, idx) => ({
//       name: `Test ${idx + 1}`,
//       time: test.executionTime || 0,
//       memory: test.memory || 0,
//       passed: test.passed ? 1 : 0
//     }));
//   };

//   const generateComplexityComparison = (detected, expected) => {
//     const complexities = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
//     const detectedIdx = complexities.findIndex(c => detected?.includes(c.replace(/[²ⁿ]/g, '')));
//     const expectedIdx = complexities.findIndex(c => expected?.includes(c.replace(/[²ⁿ]/g, '')));
    
//     return complexities.map((complexity, idx) => ({
//       complexity,
//       detected: idx === detectedIdx ? 100 : 0,
//       expected: idx === expectedIdx ? 100 : 0
//     })).filter(d => d.detected > 0 || d.expected > 0);
//   };

//   if (loading) {
//     return (
//       <div className="loading-container">
//         <div className="loading-spinner"></div>
//         <p>Loading problem...</p>
//       </div>
//     );
//   }

//   if (!problem) {
//     return <div className="error-container">Problem not found</div>;
//   }

//   return (
//     <div className="problem-detail-page">
//       {/* Left Panel - Problem Description */}
//       <div className="problem-panel">
//         <div className="panel-tabs">
//           <button
//             className={`tab ${activeTab === 'description' ? 'active' : ''}`}
//             onClick={() => setActiveTab('description')}
//           >
//             <span>📝</span> Description
//           </button>
//           <button
//             className={`tab ${activeTab === 'result' ? 'active' : ''}`}
//             onClick={() => setActiveTab('result')}
//             disabled={!result}
//           >
//             <span>📊</span> Results
//           </button>
//           <button
//             className={`tab ${activeTab === 'submissions' ? 'active' : ''}`}
//             onClick={() => setActiveTab('submissions')}
//           >
//             <span>📜</span> Submissions
//           </button>
//         </div>

//         <div className="panel-content">
//           {activeTab === 'description' && (
//             <div className="description-tab">
//               {/* Problem Header */}
//               <div className="problem-header">
//                 <h1 className="problem-number">#{problem.id}</h1>
//                 <h2 className="problem-title">{problem.title}</h2>
//               </div>

//               <div className="problem-meta">
//                 <span 
//                   className="difficulty-badge"
//                   style={{ 
//                     color: getDifficultyColor(problem.difficulty),
//                     borderColor: getDifficultyColor(problem.difficulty)
//                   }}
//                 >
//                   {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
//                 </span>
                
//                 <div className="complexity-info">
//                   <div className="complexity-item">
//                     <Clock size={16} />
//                     <span>Time: {problem.timeComplexity}</span>
//                   </div>
//                   <div className="complexity-item">
//                     <Database size={16} />
//                     <span>Space: {problem.spaceComplexity}</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Tags */}
//               <div className="problem-tags">
//                 {problem.tags?.map((tag, idx) => (
//                   <span key={idx} className="tag">{tag}</span>
//                 ))}
//               </div>

//               {/* Description */}
//               <div className="problem-description">
//                 <div dangerouslySetInnerHTML={{ 
//                   __html: problem.description.replace(/\n/g, '<br/>') 
//                 }} />
//               </div>

//               {/* Examples */}
//               {problem.examples && problem.examples.length > 0 && (
//                 <div className="examples-section">
//                   <h3 className="section-title">
//                     <Zap size={20} />
//                     Examples
//                   </h3>
//                   {problem.examples.map((example, idx) => (
//                     <div key={idx} className="example-card">
//                       <div className="example-label">Example {idx + 1}</div>
//                       <div className="example-content">
//                         <div className="example-item">
//                           <strong>Input:</strong>
//                           <code>{example.input}</code>
//                         </div>
//                         <div className="example-item">
//                           <strong>Output:</strong>
//                           <code>{example.output}</code>
//                         </div>
//                         {example.explanation && (
//                           <div className="example-item explanation">
//                             <strong>Explanation:</strong>
//                             <p>{example.explanation}</p>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Constraints */}
//               {problem.constraints && problem.constraints.length > 0 && (
//                 <div className="constraints-section">
//                   <h3 className="section-title">
//                     <AlertCircle size={20} />
//                     Constraints
//                   </h3>
//                   <ul className="constraints-list">
//                     {problem.constraints.map((constraint, idx) => (
//                       <li key={idx}>{constraint}</li>
//                     ))}
//                   </ul>
//                 </div>
//               )}

//               {/* Hints */}
//               {problem.hints && problem.hints.length > 0 && (
//                 <details className="hints-section">
//                   <summary className="section-title">
//                     💡 Hints ({problem.hints.length})
//                   </summary>
//                   <ul className="hints-list">
//                     {problem.hints.map((hint, idx) => (
//                       <li key={idx}>{hint}</li>
//                     ))}
//                   </ul>
//                 </details>
//               )}
//             </div>
//           )}

//           {activeTab === 'result' && result && (
//             <div className="result-tab">
//               {/* Status Header */}
//               <div className={`result-status status-${result.status}`}>
//                 <div className="status-icon">
//                   {getStatusIcon(result.status)}
//                 </div>
//                 <div className="status-text">
//                   <h2>{getStatusText(result.status)}</h2>
//                   {result.error && (
//                     <p className="error-text">{result.error}</p>
//                   )}
//                 </div>
//               </div>

//               {/* Performance Metrics */}
//               {result.status === 'accepted' && (
//                 <>
//                   <div className="metrics-grid">
//                     <div className="metric-card">
//                       <div className="metric-icon success">
//                         <CheckCircle size={24} />
//                       </div>
//                       <div className="metric-content">
//                         <div className="metric-value">{result.passedTests}/{result.totalTests}</div>
//                         <div className="metric-label">Tests Passed</div>
//                       </div>
//                     </div>

//                     <div className="metric-card">
//                       <div className="metric-icon time">
//                         <Clock size={24} />
//                       </div>
//                       <div className="metric-content">
//                         <div className="metric-value">{result.executionTime} ms</div>
//                         <div className="metric-label">Runtime</div>
//                       </div>
//                     </div>

//                     <div className="metric-card">
//                       <div className="metric-icon memory">
//                         <Database size={24} />
//                       </div>
//                       <div className="metric-content">
//                         <div className="metric-value">{result.memory} MB</div>
//                         <div className="metric-label">Memory</div>
//                       </div>
//                     </div>

//                     <div className="metric-card">
//                       <div className="metric-icon speed">
//                         <TrendingUp size={24} />
//                       </div>
//                       <div className="metric-content">
//                         <div className="metric-value">
//                           {Math.round((result.passedTests / result.totalTests) * 100)}%
//                         </div>
//                         <div className="metric-label">Success Rate</div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Visualization Toggle */}
//                   <div className="visualization-controls">
//                     <button 
//                       className={`viz-toggle ${showVisualization ? 'active' : ''}`}
//                       onClick={() => setShowVisualization(!showVisualization)}
//                     >
//                       {showVisualization ? '📊 Hide Charts' : '📈 Show Charts'}
//                     </button>
//                   </div>

//                   {/* Performance Charts */}
//                   {showVisualization && result.testResults && (
//                     <div className="charts-section">
//                       <div className="chart-container">
//                         <h3 className="chart-title">Execution Time per Test Case</h3>
//                         <ResponsiveContainer width="100%" height={250}>
//                           <LineChart data={generatePerformanceData(result.testResults)}>
//                             <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
//                             <XAxis dataKey="name" stroke="#94a3b8" />
//                             <YAxis stroke="#94a3b8" />
//                             <Tooltip 
//                               contentStyle={{ 
//                                 backgroundColor: '#1a2238', 
//                                 border: '1px solid #2d3a5f',
//                                 borderRadius: '8px'
//                               }}
//                             />
//                             <Legend />
//                             <Line 
//                               type="monotone" 
//                               dataKey="time" 
//                               stroke="#00d4ff" 
//                               strokeWidth={2}
//                               name="Time (ms)"
//                               dot={{ fill: '#00d4ff', r: 4 }}
//                             />
//                           </LineChart>
//                         </ResponsiveContainer>
//                       </div>

//                       <div className="chart-container">
//                         <h3 className="chart-title">Memory Usage per Test Case</h3>
//                         <ResponsiveContainer width="100%" height={250}>
//                           <BarChart data={generatePerformanceData(result.testResults)}>
//                             <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
//                             <XAxis dataKey="name" stroke="#94a3b8" />
//                             <YAxis stroke="#94a3b8" />
//                             <Tooltip 
//                               contentStyle={{ 
//                                 backgroundColor: '#1a2238', 
//                                 border: '1px solid #2d3a5f',
//                                 borderRadius: '8px'
//                               }}
//                             />
//                             <Legend />
//                             <Bar 
//                               dataKey="memory" 
//                               fill="#7c3aed" 
//                               name="Memory (MB)"
//                               radius={[8, 8, 0, 0]}
//                             />
//                           </BarChart>
//                         </ResponsiveContainer>
//                       </div>

//                       {/* Test Results Pie Chart */}
//                       <div className="chart-container">
//                         <h3 className="chart-title">Test Results Overview</h3>
//                         <ResponsiveContainer width="100%" height={250}>
//                           <PieChart>
//                             <Pie
//                               data={[
//                                 { name: 'Passed', value: result.passedTests },
//                                 { name: 'Failed', value: result.totalTests - result.passedTests }
//                               ]}
//                               cx="50%"
//                               cy="50%"
//                               labelLine={false}
//                               label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//                               outerRadius={80}
//                               fill="#8884d8"
//                               dataKey="value"
//                             >
//                               <Cell fill="#10b981" />
//                               <Cell fill="#ef4444" />
//                             </Pie>
//                             <Tooltip />
//                           </PieChart>
//                         </ResponsiveContainer>
//                       </div>
//                     </div>
//                   )}

//                   {/* Complexity Analysis */}
//                   {result.complexityAnalysis && (
//                     <div className="complexity-analysis">
//                       <h3 className="section-title">
//                         <TrendingUp size={20} />
//                         Time Complexity Analysis
//                       </h3>
                      
//                       <div className="complexity-cards">
//                         <div className="complexity-card detected">
//                           <div className="complexity-header">
//                             <span className="complexity-label">Detected</span>
//                             <span className="confidence-badge">
//                               {(result.complexityAnalysis.confidence * 100).toFixed(0)}% confident
//                             </span>
//                           </div>
//                           <div className="complexity-value">
//                             {result.complexityAnalysis.complexity}
//                           </div>
//                         </div>

//                         <div className="complexity-arrow">→</div>

//                         <div className="complexity-card expected">
//                           <div className="complexity-header">
//                             <span className="complexity-label">Expected</span>
//                           </div>
//                           <div className="complexity-value">
//                             {result.expectedComplexity || 'N/A'}
//                           </div>
//                         </div>
//                       </div>

//                       {/* Complexity Comparison Chart */}
//                       {result.expectedComplexity && (
//                         <div className="chart-container">
//                           <ResponsiveContainer width="100%" height={200}>
//                             <BarChart 
//                               data={generateComplexityComparison(
//                                 result.complexityAnalysis.complexity,
//                                 result.expectedComplexity
//                               )}
//                               layout="vertical"
//                             >
//                               <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
//                               <XAxis type="number" stroke="#94a3b8" />
//                               <YAxis dataKey="complexity" type="category" stroke="#94a3b8" width={100} />
//                               <Tooltip 
//                                 contentStyle={{ 
//                                   backgroundColor: '#1a2238', 
//                                   border: '1px solid #2d3a5f',
//                                   borderRadius: '8px'
//                                 }}
//                               />
//                               <Legend />
//                               <Bar dataKey="detected" fill="#00d4ff" name="Your Solution" />
//                               <Bar dataKey="expected" fill="#10b981" name="Expected" />
//                             </BarChart>
//                           </ResponsiveContainer>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </>
//               )}

//               {/* Test Cases Details */}
//               {result.testResults && result.testResults.length > 0 && (
//                 <div className="test-cases-section">
//                   <h3 className="section-title">
//                     📋 Test Cases
//                   </h3>
//                   {result.testResults.map((test, idx) => (
//                     <details 
//                       key={idx} 
//                       className={`test-case ${test.passed ? 'passed' : 'failed'}`}
//                       open={!test.passed}
//                     >
//                       <summary className="test-case-header">
//                         <div className="test-case-title">
//                           {test.passed ? (
//                             <CheckCircle size={20} color="var(--easy)" />
//                           ) : (
//                             <XCircle size={20} color="var(--hard)" />
//                           )}
//                           <span>Test Case {test.testCase}</span>
//                         </div>
//                         <div className="test-case-stats">
//                           <span className="stat">{test.executionTime} ms</span>
//                           <span className="stat">{test.memory} MB</span>
//                         </div>
//                       </summary>
                      
//                       <div className="test-case-body">
//                         <div className="test-case-row">
//                           <div className="test-label">Input:</div>
//                           <code className="test-value">{JSON.stringify(test.input)}</code>
//                         </div>
//                         <div className="test-case-row">
//                           <div className="test-label">Expected:</div>
//                           <code className="test-value expected">{JSON.stringify(test.expectedOutput)}</code>
//                         </div>
//                         <div className="test-case-row">
//                           <div className="test-label">Output:</div>
//                           <code className={`test-value ${test.passed ? 'passed' : 'failed'}`}>
//                             {JSON.stringify(test.actualOutput)}
//                           </code>
//                         </div>
//                         {test.error && (
//                           <div className="test-case-row error">
//                             <div className="test-label">Error:</div>
//                             <code className="test-value">{test.error}</code>
//                           </div>
//                         )}
//                       </div>
//                     </details>
//                   ))}
//                 </div>
//               )}

//               {/* Run Code Result */}
//               {(result.status === 'run_success' || result.status === 'run_error') && (
//                 <div className="run-result">
//                   <h3 className="section-title">Output</h3>
//                   <pre className="output-display">{result.output || result.error}</pre>
//                   <div className="run-stats">
//                     <span><Clock size={16} /> {result.executionTime} ms</span>
//                     <span><Database size={16} /> {result.memory} MB</span>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {activeTab === 'submissions' && (
//             <div className="submissions-tab">
//               <div className="empty-state">
//                 <h3>No submissions yet</h3>
//                 <p>Submit your solution to see your submission history</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Right Panel - Code Editor */}
//       <div className="editor-panel">
//         <div className="editor-header">
//           <select 
//             value={language} 
//             onChange={(e) => setLanguage(e.target.value)}
//             className="language-select"
//           >
//             {LANGUAGES.map(lang => (
//               <option key={lang.value} value={lang.value}>
//                 {lang.icon} {lang.label}
//               </option>
//             ))}
//           </select>
          
//           <div className="editor-actions">
//             <button 
//               onClick={handleRun} 
//               disabled={submitting}
//               className="btn-run"
//             >
//               {submitting ? (
//                 <>
//                   <div className="spinner"></div>
//                   Running...
//                 </>
//               ) : (
//                 <>
//                   <Zap size={18} />
//                   Run Code
//                 </>
//               )}
//             </button>
//             <button 
//               onClick={handleSubmit} 
//               disabled={submitting}
//               className="btn-submit"
//             >
//               {submitting ? (
//                 <>
//                   <div className="spinner"></div>
//                   Submitting...
//                 </>
//               ) : (
//                 <>
//                   <CheckCircle size={18} />
//                   Submit
//                 </>
//               )}
//             </button>
//           </div>
//         </div>

//         <Editor
//           height="calc(100vh - 180px)"
//           language={language === 'cpp' ? 'cpp' : language}
//           value={code}
//           onChange={(value) => setCode(value || '')}
//           theme="vs-dark"
//           options={{
//             minimap: { enabled: true },
//             fontSize: 14,
//             lineNumbers: 'on',
//             scrollBeyondLastLine: false,
//             automaticLayout: true,
//             tabSize: 2,
//             fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
//             fontLigatures: true,
//             cursorBlinking: 'smooth',
//             smoothScrolling: true,
//             padding: { top: 16, bottom: 16 },
//           }}
//         />
//       </div>
//     </div>
//   );
// }

// export default ProblemDetailPage;


import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Clock, Database, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { getProblem, submitCode, runCode } from '../services/api';
import './ProblemDetailPage.css';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'c', label: 'C', icon: '🔧' },
  { value: 'go', label: 'Go', icon: '🐹' },
  { value: 'rust', label: 'Rust', icon: '🦀' },
  { value: 'ruby', label: 'Ruby', icon: '💎' },
  { value: 'php', label: 'PHP', icon: '🐘' }
];

function ProblemDetailPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [showVisualization, setShowVisualization] = useState(true);

  useEffect(() => {
    loadProblem();
  }, [id]);

  useEffect(() => {
    if (problem && problem.starterCode) {
      setCode(problem.starterCode[language] || '');
    }
  }, [language, problem]);

  const loadProblem = async () => {
    try {
      const data = await getProblem(id);
      setProblem(data);
      setCode(data.starterCode?.javascript || '');
    } catch (error) {
      console.error('Failed to load problem:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const response = await submitCode(id, code, language);
      setResult(response);
      setActiveTab('result');
    } catch (error) {
      setResult({
        status: 'error',
        error: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRun = async () => {
    if (!problem.testCases || problem.testCases.length === 0) {
      alert('No test cases available');
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      // Run against all visible test cases
      const response = await runCode(code, language, id);
      setResult({
        ...response,
        isRunMode: true // Flag to distinguish from full submit
      });
      setActiveTab('result');
    } catch (error) {
      setResult({
        status: 'error',
        error: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'var(--easy)';
      case 'medium': return 'var(--medium)';
      case 'hard': return 'var(--hard)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={24} color="var(--easy)" />;
      case 'wrong_answer':
      case 'error':
      case 'run_error':
        return <XCircle size={24} color="var(--hard)" />;
      case 'run_success':
      case 'run_failed':
        return status === 'run_success' ? <CheckCircle size={24} color="var(--easy)" /> : <XCircle size={24} color="var(--hard)" />;
      default:
        return <AlertCircle size={24} color="var(--medium)" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'wrong_answer': return 'Wrong Answer';
      case 'error': return 'Error';
      case 'run_success': return 'Test Run Success';
      case 'run_failed': return 'Test Run Failed';
      case 'run_error': return 'Test Run Failed';
      default: return 'Unknown';
    }
  };

  const generatePerformanceData = (testResults) => {
    if (!testResults) return [];
    return testResults.map((test, idx) => ({
      name: `Test ${idx + 1}`,
      time: test.executionTime || 0,
      memory: test.memory || 0,
      passed: test.passed ? 1 : 0
    }));
  };

  const generateComplexityComparison = (detected, expected) => {
    const complexities = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
    const detectedIdx = complexities.findIndex(c => detected?.includes(c.replace(/[²ⁿ]/g, '')));
    const expectedIdx = complexities.findIndex(c => expected?.includes(c.replace(/[²ⁿ]/g, '')));
    
    return complexities.map((complexity, idx) => ({
      complexity,
      detected: idx === detectedIdx ? 100 : 0,
      expected: idx === expectedIdx ? 100 : 0
    })).filter(d => d.detected > 0 || d.expected > 0);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading problem...</p>
      </div>
    );
  }

  if (!problem) {
    return <div className="error-container">Problem not found</div>;
  }

  return (
    <div className="problem-detail-page">
      {/* Left Panel - Problem Description */}
      <div className="problem-panel">
        <div className="panel-tabs">
          <button
            className={`tab ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            <span>📝</span> Description
          </button>
          <button
            className={`tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
            disabled={!result}
          >
            <span>📊</span> Results
          </button>
          <button
            className={`tab ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            <span>📜</span> Submissions
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'description' && (
            <div className="description-tab">
              {/* Problem Header */}
              <div className="problem-header">
                <h1 className="problem-number">#{problem.id}</h1>
                <h2 className="problem-title">{problem.title}</h2>
              </div>

              <div className="problem-meta">
                <span 
                  className="difficulty-badge"
                  style={{ 
                    color: getDifficultyColor(problem.difficulty),
                    borderColor: getDifficultyColor(problem.difficulty)
                  }}
                >
                  {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                </span>
                
                <div className="complexity-info">
                  <div className="complexity-item">
                    <Clock size={16} />
                    <span>Time: {problem.timeComplexity}</span>
                  </div>
                  <div className="complexity-item">
                    <Database size={16} />
                    <span>Space: {problem.spaceComplexity}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="problem-tags">
                {problem.tags?.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>

              {/* Description */}
              <div className="problem-description">
                <div dangerouslySetInnerHTML={{ 
                  __html: problem.description.replace(/\n/g, '<br/>') 
                }} />
              </div>

              {/* Examples */}
              {problem.examples && problem.examples.length > 0 && (
                <div className="examples-section">
                  <h3 className="section-title">
                    <Zap size={20} />
                    Examples
                  </h3>
                  {problem.examples.map((example, idx) => (
                    <div key={idx} className="example-card">
                      <div className="example-label">Example {idx + 1}</div>
                      <div className="example-content">
                        <div className="example-item">
                          <strong>Input:</strong>
                          <code>{example.input}</code>
                        </div>
                        <div className="example-item">
                          <strong>Output:</strong>
                          <code>{example.output}</code>
                        </div>
                        {example.explanation && (
                          <div className="example-item explanation">
                            <strong>Explanation:</strong>
                            <p>{example.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {problem.constraints && problem.constraints.length > 0 && (
                <div className="constraints-section">
                  <h3 className="section-title">
                    <AlertCircle size={20} />
                    Constraints
                  </h3>
                  <ul className="constraints-list">
                    {problem.constraints.map((constraint, idx) => (
                      <li key={idx}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hints */}
              {problem.hints && problem.hints.length > 0 && (
                <details className="hints-section">
                  <summary className="section-title">
                    💡 Hints ({problem.hints.length})
                  </summary>
                  <ul className="hints-list">
                    {problem.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {activeTab === 'result' && result && (
            <div className="result-tab">
              {/* Status Header */}
              <div className={`result-status status-${result.status}`}>
                <div className="status-icon">
                  {getStatusIcon(result.status)}
                </div>
                <div className="status-text">
                  <h2>{getStatusText(result.status)}</h2>
                  {result.isRunMode && (
                    <p className="mode-badge">🧪 Test Run Mode (Visible Test Cases Only)</p>
                  )}
                  {result.error && (
                    <p className="error-text">{result.error}</p>
                  )}
                </div>
              </div>

              {/* Show metrics for both run and submit if we have test results */}
              {(result.status === 'accepted' || result.status === 'run_success' || result.status === 'run_failed') && result.testResults && (
                <>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-icon success">
                        <CheckCircle size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">{result.passedTests}/{result.totalTests}</div>
                        <div className="metric-label">Tests Passed</div>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon time">
                        <Clock size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">{result.executionTime} ms</div>
                        <div className="metric-label">Runtime</div>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon memory">
                        <Database size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">{result.memory} MB</div>
                        <div className="metric-label">Memory</div>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon speed">
                        <TrendingUp size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">
                          {Math.round((result.passedTests / result.totalTests) * 100)}%
                        </div>
                        <div className="metric-label">Success Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Visualization Toggle */}
                  <div className="visualization-controls">
                    <button 
                      className={`viz-toggle ${showVisualization ? 'active' : ''}`}
                      onClick={() => setShowVisualization(!showVisualization)}
                    >
                      {showVisualization ? '📊 Hide Charts' : '📈 Show Charts'}
                    </button>
                  </div>

                  {/* Performance Charts */}
                  {showVisualization && (
                    <div className="charts-section">
                      <div className="chart-container">
                        <h3 className="chart-title">Execution Time per Test Case</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={generatePerformanceData(result.testResults)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1a2238', 
                                border: '1px solid #2d3a5f',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="time" 
                              stroke="#00d4ff" 
                              strokeWidth={2}
                              name="Time (ms)"
                              dot={{ fill: '#00d4ff', r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="chart-container">
                        <h3 className="chart-title">Memory Usage per Test Case</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={generatePerformanceData(result.testResults)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1a2238', 
                                border: '1px solid #2d3a5f',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="memory" 
                              fill="#7c3aed" 
                              name="Memory (MB)"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Test Results Pie Chart */}
                      <div className="chart-container">
                        <h3 className="chart-title">Test Results Overview</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Passed', value: result.passedTests },
                                { name: 'Failed', value: result.totalTests - result.passedTests }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Complexity Analysis */}
                  {result.complexityAnalysis && (
                    <div className="complexity-analysis">
                      <h3 className="section-title">
                        <TrendingUp size={20} />
                        Time Complexity Analysis
                      </h3>
                      
                      <div className="complexity-cards">
                        <div className="complexity-card detected">
                          <div className="complexity-header">
                            <span className="complexity-label">Detected</span>
                            <span className="confidence-badge">
                              {(result.complexityAnalysis.confidence * 100).toFixed(0)}% confident
                            </span>
                          </div>
                          <div className="complexity-value">
                            {result.complexityAnalysis.complexity}
                          </div>
                          {result.complexityAnalysis.rSquared && (
                            <div className="complexity-detail">
                              R² = {result.complexityAnalysis.rSquared}
                            </div>
                          )}
                        </div>

                        <div className="complexity-arrow">→</div>

                        <div className="complexity-card expected">
                          <div className="complexity-header">
                            <span className="complexity-label">Expected</span>
                          </div>
                          <div className="complexity-value">
                            {result.expectedComplexity || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Complexity Comparison Chart */}
                      {result.expectedComplexity && (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart 
                              data={generateComplexityComparison(
                                result.complexityAnalysis.complexity,
                                result.expectedComplexity
                              )}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a5f" />
                              <XAxis type="number" stroke="#94a3b8" />
                              <YAxis dataKey="complexity" type="category" stroke="#94a3b8" width={100} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#1a2238', 
                                  border: '1px solid #2d3a5f',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                              <Bar dataKey="detected" fill="#00d4ff" name="Your Solution" />
                              <Bar dataKey="expected" fill="#10b981" name="Expected" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Test Cases Details - ALWAYS SHOW if we have test results */}
              {result.testResults && result.testResults.length > 0 && (
                <div className="test-cases-section">
                  <h3 className="section-title">
                    📋 Test Cases ({result.passedTests}/{result.totalTests} Passed)
                  </h3>
                  {result.testResults.map((test, idx) => (
                    <details 
                      key={idx} 
                      className={`test-case ${test.passed ? 'passed' : 'failed'}`}
                      open={!test.passed}
                    >
                      <summary className="test-case-header">
                        <div className="test-case-title">
                          {test.passed ? (
                            <CheckCircle size={20} color="var(--easy)" />
                          ) : (
                            <XCircle size={20} color="var(--hard)" />
                          )}
                          <span>Test Case {test.testCase}</span>
                        </div>
                        <div className="test-case-stats">
                          <span className="stat">{test.executionTime} ms</span>
                          <span className="stat">{test.memory} MB</span>
                        </div>
                      </summary>
                      
                      <div className="test-case-body">
                        <div className="test-case-row">
                          <div className="test-label">Input:</div>
                          <code className="test-value">{JSON.stringify(test.input)}</code>
                        </div>
                        <div className="test-case-row">
                          <div className="test-label">Expected:</div>
                          <code className="test-value expected">{JSON.stringify(test.expectedOutput)}</code>
                        </div>
                        <div className="test-case-row">
                          <div className="test-label">Output:</div>
                          <code className={`test-value ${test.passed ? 'passed' : 'failed'}`}>
                            {JSON.stringify(test.actualOutput)}
                          </code>
                        </div>
                        {test.error && (
                          <div className="test-case-row error">
                            <div className="test-label">Error:</div>
                            <code className="test-value">{test.error}</code>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}

              {/* Legacy single run result (if no test results array) */}
              {!result.testResults && (result.status === 'run_success' || result.status === 'run_error') && (
                <div className="run-result">
                  <h3 className="section-title">Output</h3>
                  <pre className="output-display">{result.output || result.error}</pre>
                  <div className="run-stats">
                    <span><Clock size={16} /> {result.executionTime} ms</span>
                    <span><Database size={16} /> {result.memory} MB</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="submissions-tab">
              <div className="empty-state">
                <h3>No submissions yet</h3>
                <p>Submit your solution to see your submission history</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Code Editor */}
      <div className="editor-panel">
        <div className="editor-header">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="language-select"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.icon} {lang.label}
              </option>
            ))}
          </select>
          
          <div className="editor-actions">
            <button 
              onClick={handleRun} 
              disabled={submitting}
              className="btn-run"
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  Running...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Run Code
                </>
              )}
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="btn-submit"
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>

        <Editor
          height="calc(100vh - 180px)"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={(value) => setCode(value || '')}
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
  );
}

export default ProblemDetailPage;