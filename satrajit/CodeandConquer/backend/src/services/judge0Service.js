// Judge0 API Service for Code Execution
// Replaces Docker-based execution when Docker is not available

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com'
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || ''
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com'

// Language IDs for Judge0
const LANGUAGE_IDS = {
  javascript: 63,  // Node.js
  typescript: 74,  // TypeScript
  python: 71,      // Python 3
  java: 62,        // Java
  cpp: 54,         // C++
  c: 50,           // C
  go: 60,          // Go
  rust: 73,        // Rust
  ruby: 72,        // Ruby
  php: 68,         // PHP
}

class Judge0Service {
  constructor() {
    this.isConfigured = !!(JUDGE0_API_KEY || process.env.JUDGE0_API_URL?.includes('localhost'))
    if (!this.isConfigured) {
      console.log('⚠️ Judge0 API not configured - set JUDGE0_API_KEY for multi-language support')
    } else {
      console.log('✅ Judge0 API configured')
    }
  }

  isAvailable() {
    return this.isConfigured
  }

  getSupportedLanguages() {
    return Object.keys(LANGUAGE_IDS)
  }

  isSupported(language) {
    return LANGUAGE_IDS.hasOwnProperty(language)
  }

  async executeCode(code, language, testCase, timeLimit = 10000) {
    if (!this.isConfigured) {
      return {
        success: false,
        output: null,
        error: 'Judge0 API not configured. Set JUDGE0_API_KEY environment variable.',
        executionTime: 0,
        memory: 0
      }
    }

    const languageId = LANGUAGE_IDS[language]
    if (!languageId) {
      return {
        success: false,
        output: null,
        error: `Language ${language} not supported by Judge0`,
        executionTime: 0,
        memory: 0
      }
    }

    // Prepare code with test case
    const fullCode = this.prepareCode(code, testCase, language)
    
    try {
      // Create submission
      const submission = await this.createSubmission(fullCode, languageId, timeLimit)
      
      if (!submission || !submission.token) {
        return {
          success: false,
          output: null,
          error: 'Failed to create submission',
          executionTime: 0,
          memory: 0
        }
      }

      // Wait for result
      const result = await this.waitForResult(submission.token)
      
      return this.parseResult(result)
    } catch (error) {
      console.error('Judge0 execution error:', error)
      return {
        success: false,
        output: null,
        error: error.message || 'Execution failed',
        executionTime: 0,
        memory: 0
      }
    }
  }

  async createSubmission(code, languageId, timeLimit) {
    const headers = {
      'Content-Type': 'application/json',
    }

    // Add RapidAPI headers if using RapidAPI
    if (JUDGE0_API_KEY && JUDGE0_API_HOST.includes('rapidapi')) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY
      headers['X-RapidAPI-Host'] = JUDGE0_API_HOST
    }

    const body = {
      source_code: Buffer.from(code).toString('base64'),
      language_id: languageId,
      cpu_time_limit: Math.ceil(timeLimit / 1000), // Convert ms to seconds
      wall_time_limit: Math.ceil(timeLimit / 1000) + 5,
      memory_limit: 256000, // 256MB
      enable_per_process_and_thread_memory_limit: false,
      enable_network: false
    }

    const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  async waitForResult(token, maxAttempts = 20) {
    const headers = {}
    
    if (JUDGE0_API_KEY && JUDGE0_API_HOST.includes('rapidapi')) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY
      headers['X-RapidAPI-Host'] = JUDGE0_API_HOST
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=*`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`Failed to get submission result: ${response.status}`)
      }

      const result = await response.json()

      // Status IDs:
      // 1 = In Queue, 2 = Processing, 3 = Accepted
      // 4 = Wrong Answer, 5 = Time Limit, 6 = Compilation Error
      // 7-12 = Various runtime errors
      if (result.status && result.status.id > 2) {
        return result
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    throw new Error('Execution timed out waiting for result')
  }

  parseResult(result) {
    const statusId = result.status?.id || 0
    const statusDescription = result.status?.description || 'Unknown'

    // Decode base64 outputs
    const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf8') : ''
    const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf8') : ''
    const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf8') : ''

    // Parse timing
    const executionTime = result.time ? parseFloat(result.time) * 1000 : 0 // Convert to ms
    const memory = result.memory ? result.memory / 1024 : 0 // Convert to MB

    // Determine success (status 3 = Accepted)
    const success = statusId === 3

    // Extract last line of output (the result)
    const outputLines = stdout.trim().split('\n').filter(line => line.trim())
    const output = outputLines.length > 0 ? outputLines[outputLines.length - 1] : stdout.trim()

    // Build error message if not successful
    let error = null
    if (!success) {
      if (statusId === 5) {
        error = 'Time Limit Exceeded'
      } else if (statusId === 6) {
        error = `Compilation Error: ${compileOutput}`
      } else if (stderr) {
        error = stderr
      } else {
        error = statusDescription
      }
    }

    return {
      success,
      output: success ? output : null,
      error,
      executionTime: Math.round(executionTime * 100) / 100,
      memory: Math.round(memory * 100) / 100
    }
  }

  prepareCode(code, testCase, language) {
    const { input, expectedOutput } = testCase

    switch (language) {
      case 'javascript':
        return `
${code}

const input = ${JSON.stringify(input)};
const result = solution(...input);
console.log(JSON.stringify(result));
`

      case 'typescript':
        return `
${code}

const input = ${JSON.stringify(input)};
const result = solution(...input);
console.log(JSON.stringify(result));
`

      case 'python':
        return `
import json

${code}

input_data = ${JSON.stringify(input)}
result = solution(*input_data)
print(json.dumps(result))
`

      case 'java':
        return `
import java.util.*;

public class Main {
    ${code.replace(/public\s+class\s+\w+\s*{/g, '').replace(/}$/, '')}
    
    public static void main(String[] args) {
        Main sol = new Main();
        // Note: simplified - would need proper JSON parsing
        ${this.generateJavaMainCode(input)}
    }
}
`

      case 'cpp':
        return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

${code}

int main() {
    ${this.generateCppMainCode(input)}
    return 0;
}
`

      case 'go':
        return `
package main

import (
    "fmt"
    "encoding/json"
)

${code}

func main() {
    // Simplified - would need proper type handling
    result := solution()
    jsonResult, _ := json.Marshal(result)
    fmt.Println(string(jsonResult))
}
`

      case 'rust':
        return `
${code}

fn main() {
    let result = solution();
    println!("{:?}", result);
}
`

      case 'ruby':
        return `
require 'json'

${code}

input = ${JSON.stringify(input)}
result = solution(*input)
puts result.to_json
`

      case 'php':
        return `
<?php
${code}

$input = ${JSON.stringify(input)};
$result = solution(...$input);
echo json_encode($result);
`

      default:
        return code
    }
  }

  generateJavaMainCode(input) {
    // Simplified Java code generation
    return `System.out.println(sol.solution());`
  }

  generateCppMainCode(input) {
    // Simplified C++ code generation
    return `auto result = solution(); cout << result << endl;`
  }

  async runTestCases(code, language, testCases) {
    const results = []
    let totalTime = 0
    let maxMemory = 0

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      const result = await this.executeCode(code, language, testCase)

      const passed = result.success && this.compareOutput(result.output, testCase.expectedOutput)

      let actualOutputParsed = result.output
      try {
        if (typeof result.output === 'string') {
          actualOutputParsed = JSON.parse(result.output)
        }
      } catch (e) {
        // Keep as string
      }

      results.push({
        testCase: i + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: actualOutputParsed,
        passed,
        executionTime: result.executionTime || 0,
        memory: result.memory || 0,
        error: result.error || null
      })

      totalTime += result.executionTime || 0
      maxMemory = Math.max(maxMemory, result.memory || 0)

      // Stop on first failure
      if (!passed && !result.success) break
    }

    const allPassed = results.length > 0 && results.every(r => r.passed)

    return {
      allPassed,
      results,
      totalExecutionTime: Math.round(totalTime * 100) / 100,
      maxMemory: Math.round(maxMemory * 100) / 100,
      passedTests: results.filter(r => r.passed).length,
      totalTests: results.length
    }
  }

  compareOutput(actual, expected) {
    try {
      let actualParsed = actual
      let expectedParsed = expected

      if (typeof actual === 'string') {
        try {
          actualParsed = JSON.parse(actual.trim())
        } catch {
          const trimmed = actual.trim().toLowerCase()
          if (trimmed === 'true') actualParsed = true
          else if (trimmed === 'false') actualParsed = false
          else if (!isNaN(trimmed)) actualParsed = Number(trimmed)
        }
      }

      if (typeof expected === 'string') {
        try {
          expectedParsed = JSON.parse(expected)
        } catch {
          const trimmed = expected.trim().toLowerCase()
          if (trimmed === 'true') expectedParsed = true
          else if (trimmed === 'false') expectedParsed = false
          else if (!isNaN(trimmed)) expectedParsed = Number(trimmed)
        }
      }

      return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed)
    } catch {
      return String(actual).trim() === String(expected).trim()
    }
  }
}

export default new Judge0Service()

