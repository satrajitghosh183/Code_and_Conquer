import { useState } from 'react'
import { Icon } from './Icons'
import './LearningModule.css'

const DUMMY_LESSONS = [
  {
    id: 1,
    title: "Big O Notation Basics",
    concept: "Time Complexity",
    content: "Big O notation describes how the runtime of an algorithm grows as input size increases. Understanding this helps you write efficient code. O(1) is constant time (fastest), O(n) is linear, O(n²) is quadratic (slowest for large inputs).",
    codeExample: `// O(1) - Constant time
function getFirst(arr) {
  return arr[0]; // Always takes same time
}

// O(n) - Linear time
function findMax(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

// O(n²) - Quadratic time
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
    quiz: { 
      question: "What's the time complexity of accessing an array element by index?", 
      answer: "O(1)",
      options: ["O(1)", "O(n)", "O(log n)", "O(n²)"]
    }
  },
  {
    id: 2,
    title: "Binary Search Trees",
    concept: "Data Structures",
    content: "A Binary Search Tree (BST) is a tree data structure where each node has at most two children. Left child is smaller, right child is larger. This allows for efficient searching, insertion, and deletion operations.",
    codeExample: `class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

class BST {
  constructor() {
    this.root = null;
  }
  
  insert(val) {
    this.root = this._insert(this.root, val);
  }
  
  _insert(node, val) {
    if (!node) return new TreeNode(val);
    if (val < node.val) node.left = this._insert(node.left, val);
    else node.right = this._insert(node.right, val);
    return node;
  }
  
  search(val) {
    return this._search(this.root, val);
  }
  
  _search(node, val) {
    if (!node || node.val === val) return node;
    return val < node.val 
      ? this._search(node.left, val)
      : this._search(node.right, val);
  }
}`,
    quiz: { 
      question: "What's the average time complexity of searching in a balanced BST?", 
      answer: "O(log n)",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"]
    }
  },
  {
    id: 3,
    title: "Dynamic Programming",
    concept: "Algorithms",
    content: "Dynamic Programming solves complex problems by breaking them into simpler subproblems. It stores results of subproblems to avoid recomputation. Key concepts: memoization (top-down) and tabulation (bottom-up).",
    codeExample: `// Fibonacci with memoization
function fibonacci(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 2) return 1;
  
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}

// Fibonacci with tabulation
function fibTabulation(n) {
  const dp = [0, 1, 1];
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}`,
    quiz: { 
      question: "What's the main advantage of dynamic programming?", 
      answer: "Avoids redundant calculations",
      options: ["Uses less memory", "Avoids redundant calculations", "Simpler code", "Faster for small inputs"]
    }
  },
  {
    id: 4,
    title: "Hash Tables",
    concept: "Data Structures",
    content: "Hash tables provide O(1) average time complexity for insert, delete, and lookup operations. They use a hash function to map keys to array indices. Collision handling is crucial (chaining or open addressing).",
    codeExample: `class HashTable {
  constructor(size = 53) {
    this.keyMap = new Array(size);
  }
  
  _hash(key) {
    let total = 0;
    const WEIRD_PRIME = 31;
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      const char = key[i];
      const value = char.charCodeAt(0) - 96;
      total = (total * WEIRD_PRIME + value) % this.keyMap.length;
    }
    return total;
  }
  
  set(key, value) {
    const index = this._hash(key);
    if (!this.keyMap[index]) this.keyMap[index] = [];
    this.keyMap[index].push([key, value]);
  }
  
  get(key) {
    const index = this._hash(key);
    if (this.keyMap[index]) {
      for (let pair of this.keyMap[index]) {
        if (pair[0] === key) return pair[1];
      }
    }
    return undefined;
  }
}`,
    quiz: { 
      question: "What's the average time complexity of hash table operations?", 
      answer: "O(1)",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"]
    }
  },
  {
    id: 5,
    title: "Recursion Patterns",
    concept: "Algorithms",
    content: "Recursion is when a function calls itself. Key components: base case (stopping condition) and recursive case (function calls itself with modified input). Common patterns: tree traversal, divide & conquer, backtracking.",
    codeExample: `// Factorial
function factorial(n) {
  if (n <= 1) return 1; // Base case
  return n * factorial(n - 1); // Recursive case
}

// Tree traversal
function inorderTraversal(root) {
  if (!root) return [];
  return [
    ...inorderTraversal(root.left),
    root.val,
    ...inorderTraversal(root.right)
  ];
}

// Backtracking pattern
function generatePermutations(arr) {
  const result = [];
  
  function backtrack(current) {
    if (current.length === arr.length) {
      result.push([...current]);
      return;
    }
    
    for (let num of arr) {
      if (current.includes(num)) continue;
      current.push(num);
      backtrack(current);
      current.pop(); // Backtrack
    }
  }
  
  backtrack([]);
  return result;
}`,
    quiz: { 
      question: "What must every recursive function have?", 
      answer: "A base case",
      options: ["A loop", "A base case", "Multiple parameters", "A return statement"]
    }
  }
]

export default function LearningModule({ onClose, problemCount = 0 }) {
  const lessonIndex = (problemCount - 1) % DUMMY_LESSONS.length
  const [currentLesson] = useState(DUMMY_LESSONS[lessonIndex])
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState('')
  const [quizResult, setQuizResult] = useState(null)
  
  const handleQuizSubmit = () => {
    const isCorrect = quizAnswer.trim().toLowerCase() === currentLesson.quiz.answer.toLowerCase()
    setQuizResult(isCorrect)
    
    if (isCorrect) {
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }
  
  return (
    <div className="learning-module-overlay">
      <div className="learning-module">
        <div className="learning-header">
          <h2><Icon name="diamond" size={28} color="#ffd700" /> Learning Break</h2>
          <p>You've solved {problemCount} problems! Here's something new:</p>
        </div>
        
        <div className="learning-content">
          <div className="lesson-badge">{currentLesson.concept}</div>
          <h3>{currentLesson.title}</h3>
          <p className="lesson-description">{currentLesson.content}</p>
          
          <div className="code-example">
            <div className="code-header">Example Code:</div>
            <pre><code>{currentLesson.codeExample}</code></pre>
          </div>
          
          {!showQuiz ? (
            <button 
              className="quiz-toggle-btn"
              onClick={() => setShowQuiz(true)}
            >
              Test Your Knowledge
            </button>
          ) : (
            <div className="quiz-section">
              <p className="quiz-question">{currentLesson.quiz.question}</p>
              
              {currentLesson.quiz.options ? (
                <div className="quiz-options">
                  {currentLesson.quiz.options.map((option, idx) => (
                    <button
                      key={idx}
                      className={`quiz-option ${quizAnswer === option ? 'selected' : ''}`}
                      onClick={() => setQuizAnswer(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <input 
                  type="text" 
                  className="quiz-input"
                  placeholder="Your answer..." 
                  value={quizAnswer}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuizSubmit()}
                />
              )}
              
              <button 
                className="quiz-submit-btn"
                onClick={handleQuizSubmit}
                disabled={!quizAnswer}
              >
                Check Answer
              </button>
              
              {quizResult !== null && (
                <div className={`quiz-result ${quizResult ? 'correct' : 'incorrect'}`}>
                  {quizResult ? (
                    <>
                      <span className="result-icon"><Icon name="check" size={24} color="#00ff00" /></span>
                      <span>Correct! Great job!</span>
                    </>
                  ) : (
                    <>
                      <span className="result-icon"><Icon name="close" size={24} color="#ff0000" /></span>
                      <span>Not quite. The answer is: <strong>{currentLesson.quiz.answer}</strong></span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <button className="continue-btn" onClick={onClose}>
          Continue Playing
        </button>
      </div>
    </div>
  )
}

