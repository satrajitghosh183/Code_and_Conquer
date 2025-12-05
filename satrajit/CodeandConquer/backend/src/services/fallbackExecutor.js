/**
 * Fallback Code Executor - Works without Docker
 * 
 * This executor runs code locally using Node.js VM for JavaScript/TypeScript
 * and spawns child processes for Python (if available).
 * 
 * Production-ready: Used when Docker is not available
 */

import vm from 'vm';
import { spawn } from 'child_process';

// Supported languages in fallback mode
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python'];

class FallbackExecutor {
  constructor() {
    this.timeout = parseInt(process.env.EXECUTION_TIMEOUT) || 10000;
  }

  isSupported(language) {
    return SUPPORTED_LANGUAGES.includes(language.toLowerCase());
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  async executeCode(code, language, testCase, timeLimit) {
    const lang = language.toLowerCase();
    
    if (!this.isSupported(lang)) {
      return {
        success: false,
        output: null,
        executionTime: 0,
        memory: 0,
        error: `Language '${language}' requires Docker. Supported fallback languages: ${SUPPORTED_LANGUAGES.join(', ')}`
      };
    }

    const timeout = timeLimit || this.timeout;

    try {
      switch (lang) {
        case 'javascript':
        case 'typescript':
          return await this.executeJavaScript(code, testCase, timeout);
        case 'python':
          return await this.executePython(code, testCase, timeout);
        default:
          return {
            success: false,
            output: null,
            executionTime: 0,
            memory: 0,
            error: `Unsupported language: ${language}`
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        executionTime: 0,
        memory: 0,
        error: error.message || 'Execution error'
      };
    }
  }

  async executeJavaScript(code, testCase, timeout) {
    const startTime = process.hrtime.bigint();
    
    try {
      // Create a sandboxed context
      // Use a Symbol to mark that the result was explicitly set
      const RESULT_SET = Symbol('resultSet');
      
      const sandbox = {
        console: {
          log: (...args) => {
            // Capture console output for debugging but DON'T use it as result
            sandbox._consoleOutput.push(args.map(a => 
              typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' '));
          },
          error: (...args) => {
            sandbox._consoleOutput.push('[ERROR] ' + args.map(a => 
              typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' '));
          },
          warn: (...args) => {
            sandbox._consoleOutput.push('[WARN] ' + args.map(a => 
              typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' '));
          }
        },
        JSON: JSON,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Math: Math,
        Date: Date,
        Map: Map,
        Set: Set,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        Infinity: Infinity,
        NaN: NaN,
        undefined: undefined,
        _consoleOutput: [],
        _result: undefined,
        _resultSet: false
      };

      // Prepare the code to execute
      // Important: Always use the return value from solution(), never console output
      const wrappedCode = `
        ${code}
        
        const _input = ${JSON.stringify(testCase.input)};
        try {
          if (typeof solution === 'function') {
            _result = solution(..._input);
            _resultSet = true;
          } else {
            throw new Error('No solution function found. Please define a function named "solution".');
          }
        } catch (e) {
          throw e;
        }
      `;

      // Create context and run
      vm.createContext(sandbox);
      
      const script = new vm.Script(wrappedCode, {
        timeout: timeout,
        filename: 'solution.js'
      });
      
      script.runInContext(sandbox, { timeout });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // ALWAYS use the return value from the solution function
      // Never fall back to console.log output - that would be incorrect behavior
      let output = sandbox._result;
      
      // Convert the result to JSON string for comparison
      // Handle special cases:
      // - undefined -> "null" (JSON doesn't support undefined)
      // - null -> "null"
      // - everything else -> JSON.stringify
      let outputStr;
      if (output === undefined) {
        outputStr = 'null';
      } else {
        try {
          outputStr = JSON.stringify(output);
          // Handle edge case where JSON.stringify returns undefined (for functions, symbols, etc.)
          if (outputStr === undefined) {
            outputStr = 'null';
          }
        } catch (e) {
          // If we can't stringify (circular reference, etc.), convert to string
          outputStr = String(output);
        }
      }

      return {
        success: true,
        output: outputStr,
        executionTime: Math.round(executionTime * 100) / 100,
        memory: 0, // Can't measure in VM
        error: null,
        consoleOutput: sandbox._consoleOutput // Include console output for debugging display
      };

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      if (error.message?.includes('Script execution timed out')) {
        return {
          success: false,
          output: null,
          executionTime: timeout,
          memory: 0,
          error: 'Time Limit Exceeded'
        };
      }

      return {
        success: false,
        output: null,
        executionTime: Math.round(executionTime * 100) / 100,
        memory: 0,
        error: error.message || 'Runtime Error'
      };
    }
  }

  async executePython(code, testCase, timeout) {
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();

      // Prepare Python code
      const pythonCode = `
import json
import sys

${code}

input_data = ${JSON.stringify(testCase.input)}
try:
    result = solution(*input_data)
    print(json.dumps(result))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

      // Try to run Python
      const python = spawn('python', ['-c', pythonCode], {
        timeout: timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        python.kill('SIGTERM');
      }, timeout);

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('error', (error) => {
        clearTimeout(timer);
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            output: null,
            executionTime: 0,
            memory: 0,
            error: 'Python is not installed on this system. Please use JavaScript for now.'
          });
        } else {
          resolve({
            success: false,
            output: null,
            executionTime: Math.round(executionTime * 100) / 100,
            memory: 0,
            error: error.message
          });
        }
      });

      python.on('close', (exitCode) => {
        clearTimeout(timer);
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        if (killed) {
          resolve({
            success: false,
            output: null,
            executionTime: timeout,
            memory: 0,
            error: 'Time Limit Exceeded'
          });
          return;
        }

        if (exitCode !== 0) {
          resolve({
            success: false,
            output: null,
            executionTime: Math.round(executionTime * 100) / 100,
            memory: 0,
            error: stderr.trim() || 'Runtime Error'
          });
          return;
        }

        resolve({
          success: true,
          output: stdout.trim(),
          executionTime: Math.round(executionTime * 100) / 100,
          memory: 0,
          error: null
        });
      });
    });
  }

  async runTestCases(code, language, testCases) {
    const results = [];
    let totalTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      // Validate test case
      if (!testCase || testCase.input === undefined) {
        results.push({
          testCase: i + 1,
          input: testCase?.input,
          expectedOutput: testCase?.expectedOutput,
          actualOutput: null,
          passed: false,
          executionTime: 0,
          memory: 0,
          error: 'Invalid test case format'
        });
        continue;
      }

      const result = await this.executeCode(code, language, testCase);

      // Compare outputs
      const passed = result.success && 
        this.compareOutput(result.output, testCase.expectedOutput);

      // Parse actual output for display
      let actualOutput = null;
      if (result.output !== null && result.output !== undefined) {
        try {
          if (typeof result.output === 'string') {
            // result.output is already a JSON string from executeCode
            actualOutput = JSON.parse(result.output);
          } else {
            actualOutput = result.output;
          }
        } catch {
          // If parsing fails, use the raw string value
          actualOutput = result.output;
        }
      }

      results.push({
        testCase: i + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        executionTime: result.executionTime || 0,
        memory: result.memory || 0,
        error: result.error || null,
        consoleOutput: result.consoleOutput || [] // Include console output for debugging
      });

      totalTime += result.executionTime || 0;
      maxMemory = Math.max(maxMemory, result.memory || 0);

      // Continue running all test cases even on failure (like LeetCode)
      // Only stop if there's a runtime error
      if (result.error && !passed) break;
    }

    const allPassed = results.length > 0 && results.every(r => r.passed);

    return {
      allPassed,
      results,
      totalExecutionTime: Math.round(totalTime * 100) / 100,
      maxMemory: Math.round(maxMemory * 100) / 100,
      passedTests: results.filter(r => r.passed).length,
      totalTests: results.length
    };
  }

  compareOutput(actual, expected) {
    try {
      // Parse actual output (from code execution)
      let actualParsed;
      if (typeof actual === 'string') {
        try {
          actualParsed = JSON.parse(actual.trim());
        } catch {
          const trimmed = actual.trim().toLowerCase();
          if (trimmed === 'true') actualParsed = true;
          else if (trimmed === 'false') actualParsed = false;
          else if (!isNaN(trimmed) && trimmed !== '') actualParsed = Number(trimmed);
          else actualParsed = actual.trim();
        }
      } else {
        actualParsed = actual;
      }

      // Parse expected output - handle double-stringified JSON from database
      let expectedParsed;
      if (typeof expected === 'string') {
        try {
          expectedParsed = JSON.parse(expected);
          // Check if result is still a string that looks like JSON (double-stringified)
          if (typeof expectedParsed === 'string' && (expectedParsed.startsWith('[') || expectedParsed.startsWith('{'))) {
            try {
              expectedParsed = JSON.parse(expectedParsed);
            } catch {
              // Keep as-is if second parse fails
            }
          }
        } catch {
          const trimmed = expected.trim().toLowerCase();
          if (trimmed === 'true') expectedParsed = true;
          else if (trimmed === 'false') expectedParsed = false;
          else if (!isNaN(trimmed) && trimmed !== '') expectedParsed = Number(trimmed);
          else expectedParsed = expected.trim();
        }
      } else {
        expectedParsed = expected;
      }

      // Normalize arrays and objects for comparison
      const normalize = (value) => {
        if (value === null || value === undefined) return value;
        if (Array.isArray(value)) {
          return JSON.stringify(value.map(normalize));
        }
        if (typeof value === 'object' && value !== null) {
          const sorted = Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = normalize(value[key]);
            return acc;
          }, {});
          return JSON.stringify(sorted);
        }
        return value;
      };

      // Compare normalized values
      const actualNormalized = normalize(actualParsed);
      const expectedNormalized = normalize(expectedParsed);
      
      return actualNormalized === expectedNormalized;
    } catch (error) {
      console.warn('Error comparing output:', error);
      return String(actual).trim() === String(expected).trim();
    }
  }

  // Basic complexity analysis for fallback mode
  async analyzeTimeComplexity(code, language, testCases) {
    if (!testCases || testCases.length < 3) {
      return {
        complexity: 'Unknown',
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        confidence: 0,
        details: `Insufficient data points (${testCases?.length || 0} test cases, need at least 3 with varying input sizes)`
      };
    }

    // Collect measurements
    const measurements = [];
    
    for (const testCase of testCases.slice(0, 10)) { // Use up to 10 test cases
      try {
        const result = await this.executeCode(code, language, testCase);
        if (result.success && result.executionTime > 0) {
          const inputSize = this.getInputSize(testCase.input);
          if (inputSize > 0) {
            measurements.push({ inputSize, time: result.executionTime });
          }
        }
      } catch (error) {
        // Skip failed test cases
      }
    }

    if (measurements.length < 3) {
      return {
        complexity: 'Unknown',
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        confidence: 0,
        details: `Insufficient measurements (${measurements.length}, need at least 3)`
      };
    }

    // Sort by input size
    measurements.sort((a, b) => a.inputSize - b.inputSize);

    // Simple heuristic-based complexity detection
    const complexity = this.detectComplexity(measurements);
    
    return {
      complexity: complexity.type,
      timeComplexity: complexity.type,
      spaceComplexity: 'O(n)', // Assume linear space for most algorithms
      confidence: complexity.confidence,
      measurements: measurements,
      details: complexity.details
    };
  }

  // Detect complexity using growth rate heuristics
  detectComplexity(measurements) {
    if (measurements.length < 3) {
      return { type: 'Unknown', confidence: 0, details: 'Not enough data' };
    }

    // Calculate growth rates between consecutive measurements
    const growthRates = [];
    for (let i = 1; i < measurements.length; i++) {
      const sizeRatio = measurements[i].inputSize / measurements[i-1].inputSize;
      const timeRatio = measurements[i].time / measurements[i-1].time;
      if (sizeRatio > 1 && timeRatio > 0) {
        growthRates.push({ sizeRatio, timeRatio });
      }
    }

    if (growthRates.length === 0) {
      return { type: 'O(1)', confidence: 0.5, details: 'Constant time (no measurable growth)' };
    }

    // Average growth analysis
    const avgTimeRatio = growthRates.reduce((sum, g) => sum + g.timeRatio, 0) / growthRates.length;
    const avgSizeRatio = growthRates.reduce((sum, g) => sum + g.sizeRatio, 0) / growthRates.length;

    // Determine complexity based on how time grows relative to input size
    let type, confidence, details;

    if (avgTimeRatio < 1.2) {
      type = 'O(1)';
      confidence = 0.7;
      details = 'Constant time - execution time does not grow with input';
    } else if (avgTimeRatio < avgSizeRatio * 0.8) {
      type = 'O(log n)';
      confidence = 0.6;
      details = 'Logarithmic time - sub-linear growth detected';
    } else if (avgTimeRatio < avgSizeRatio * 1.5) {
      type = 'O(n)';
      confidence = 0.7;
      details = 'Linear time - execution grows proportionally with input';
    } else if (avgTimeRatio < avgSizeRatio * avgSizeRatio * 0.8) {
      type = 'O(n log n)';
      confidence = 0.6;
      details = 'Linearithmic time - slightly faster than quadratic';
    } else if (avgTimeRatio < avgSizeRatio * avgSizeRatio * 1.5) {
      type = 'O(n²)';
      confidence = 0.7;
      details = 'Quadratic time - execution grows with square of input';
    } else {
      type = 'O(n²+)';
      confidence = 0.5;
      details = 'Super-quadratic time - consider optimization';
    }

    return { type, confidence, details };
  }

  // Get input size for complexity analysis
  getInputSize(input) {
    if (Array.isArray(input)) {
      if (input.length === 0) return 0;
      // If first element is an array, use its length
      if (Array.isArray(input[0])) {
        return input[0].length;
      }
      // If first element is a string, use its length
      if (typeof input[0] === 'string') {
        return input[0].length;
      }
      // Otherwise use array length
      return input.length;
    }
    if (typeof input === 'string') {
      return input.length;
    }
    return 1;
  }
}

export default new FallbackExecutor();

