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
      const sandbox = {
        console: {
          log: (...args) => {
            sandbox._output = args.map(a => 
              typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' ');
          },
          error: () => {},
          warn: () => {}
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
        _output: null,
        _result: null
      };

      // Prepare the code to execute
      const wrappedCode = `
        ${code}
        
        const _input = ${JSON.stringify(testCase.input)};
        try {
          if (typeof solution === 'function') {
            _result = solution(..._input);
          } else {
            throw new Error('No solution function found');
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

      // Get the result
      let output = sandbox._result;
      if (output === undefined && sandbox._output !== null) {
        try {
          output = JSON.parse(sandbox._output);
        } catch {
          output = sandbox._output;
        }
      }

      return {
        success: true,
        output: JSON.stringify(output),
        executionTime: Math.round(executionTime * 100) / 100,
        memory: 0, // Can't measure in VM
        error: null
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

      const passed = result.success && 
        this.compareOutput(result.output, testCase.expectedOutput);

      let actualOutput = result.output;
      try {
        if (typeof result.output === 'string') {
          actualOutput = JSON.parse(result.output.trim());
        }
      } catch {
        actualOutput = result.output;
      }

      results.push({
        testCase: i + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        executionTime: result.executionTime || 0,
        memory: result.memory || 0,
        error: result.error || null
      });

      totalTime += result.executionTime || 0;
      maxMemory = Math.max(maxMemory, result.memory || 0);

      // Stop on first failure for efficiency
      if (!passed && !result.success) break;
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

      let expectedParsed;
      if (typeof expected === 'string') {
        try {
          expectedParsed = JSON.parse(expected);
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

      // Deep comparison
      return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
    } catch {
      return String(actual).trim() === String(expected).trim();
    }
  }

  // Simplified complexity analysis for fallback mode
  async analyzeTimeComplexity(code, language, testCases) {
    return {
      complexity: 'Unknown',
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      confidence: 0,
      details: 'Complexity analysis requires Docker execution environment'
    };
  }
}

export default new FallbackExecutor();

