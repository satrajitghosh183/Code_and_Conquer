import Docker from 'dockerode';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import tar from 'tar-stream';
import regression from 'regression';
import fallbackExecutor from './fallbackExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let docker = null;
let dockerAvailable = false;
let dockerImagesAvailable = false;

// Try to initialize Docker
try {
  docker = new Docker();
  // Test Docker connection
  await docker.ping();
  dockerAvailable = true;
  console.log('✅ Docker daemon is available');
  
  // Check if required images exist
  try {
    const images = await docker.listImages();
    const imageNames = images
      .map(img => img.RepoTags || [])
      .flat()
      .filter(name => name && name !== '<none>:<none>');
    
    // Check for our judge images
    const judgeImages = imageNames.filter(name => name.includes('leetcode-judge-'));
    
    if (judgeImages.length > 0) {
      dockerImagesAvailable = true;
      console.log(`✅ Docker images found (${judgeImages.length} judge images) - using Docker executor`);
      console.log('   Available:', judgeImages.map(n => n.split(':')[0]).join(', '));
    } else {
      dockerImagesAvailable = false;
      console.log('⚠️ Docker images not built. Run: cd backend/judge && .\\build-images.ps1');
      console.log('   Falling back to JavaScript/Python executor');
    }
  } catch (imgError) {
    dockerImagesAvailable = false;
    console.log('⚠️ Could not check Docker images:', imgError.message);
    console.log('   Falling back to JavaScript/Python executor');
  }
} catch (error) {
  dockerAvailable = false;
  dockerImagesAvailable = false;
  console.log('⚠️ Docker is not available - using fallback executor (JavaScript/Python only)');
}

const SANDBOX_DIR = path.join(__dirname, '../../../judge/sandbox');

try {
  await fs.ensureDir(SANDBOX_DIR);
} catch (e) {
  // Ignore if we can't create sandbox dir (Docker not available)
}

const LANGUAGE_CONFIGS = {
  javascript: {
    extension: 'js',
    dockerImage: 'leetcode-judge-node:latest',
    compileCmd: null,
    runCmd: 'node solution.js',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  typescript: {
    extension: 'ts',
    dockerImage: 'leetcode-judge-node:latest',
    compileCmd: null,
    runCmd: 'tsx solution.ts',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  python: {
    extension: 'py',
    dockerImage: 'leetcode-judge-python:latest',
    compileCmd: null,
    runCmd: 'python solution.py',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  java: {
    extension: 'java',
    dockerImage: 'leetcode-judge-java:latest',
    compileCmd: 'javac -cp /usr/share/java/gson.jar:. Solution.java',
    runCmd: 'java -cp /usr/share/java/gson.jar:. Solution',
    memoryLimit: 512 * 1024 * 1024,
    timeout: 15000,
  },
  cpp: {
    extension: 'cpp',
    dockerImage: 'leetcode-judge-cpp:latest',
    compileCmd: 'g++ -O2 -std=c++17 -o program solution.cpp',
    runCmd: './program',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  c: {
    extension: 'c',
    dockerImage: 'leetcode-judge-cpp:latest',
    compileCmd: 'gcc -O2 -o program solution.c',
    runCmd: './program',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  go: {
    extension: 'go',
    dockerImage: 'leetcode-judge-go:latest',
    compileCmd: null,
    runCmd: 'go run solution.go',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  rust: {
    extension: 'rs',
    dockerImage: 'leetcode-judge-rust:latest',
    compileCmd: 'rustc -O solution.rs -o program',
    runCmd: './program',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  ruby: {
    extension: 'rb',
    dockerImage: 'leetcode-judge-ruby:latest',
    compileCmd: null,
    runCmd: 'ruby solution.rb',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  php: {
    extension: 'php',
    dockerImage: 'leetcode-judge-php:latest',
    compileCmd: null,
    runCmd: 'php solution.php',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  }
};

class AdvancedExecutorService {
  constructor() {
    this.activeContainers = new Set();
    this.setupCleanup();
  }

  setupCleanup() {
    process.on('SIGINT', async () => {
      await this.cleanupAllContainers();
      process.exit(0);
    });
  }

  async cleanupAllContainers() {
    console.log('Cleaning up containers...');
    for (const containerId of this.activeContainers) {
      try {
        const container = docker.getContainer(containerId);
        await container.stop();
        await container.remove();
      } catch (error) {
        console.error(`Failed to cleanup container ${containerId}:`, error.message);
      }
    }
    this.activeContainers.clear();
  }

  async createTarArchive(files) {
    return new Promise((resolve, reject) => {
      const pack = tar.pack();
      const chunks = [];

      for (const [filename, content] of Object.entries(files)) {
        pack.entry({ name: filename }, content);
      }

      pack.finalize();

      pack.on('data', chunk => chunks.push(chunk));
      pack.on('end', () => resolve(Buffer.concat(chunks)));
      pack.on('error', reject);
    });
  }

  async executeInDocker(code, language, testCase, config) {
    const executionId = uuidv4();
    let container = null;

    try {
      const filename = `solution.${config.extension}`;
      const fullCode = this.prepareCode(code, testCase, language);
      
      const files = {
        [filename]: fullCode
      };

      const tarArchive = await this.createTarArchive(files);

      container = await docker.createContainer({
        Image: config.dockerImage,
        Cmd: ['/bin/sh', '-c', config.compileCmd ? 
          `${config.compileCmd} && ${config.runCmd}` : config.runCmd],
        WorkingDir: '/sandbox',
        HostConfig: {
          Memory: config.memoryLimit,
          MemorySwap: config.memoryLimit,
          CpuQuota: 50000,
          CpuPeriod: 100000,
          NetworkMode: 'none',
          PidsLimit: 50,
          ReadonlyRootfs: false,
          AutoRemove: false,
        },
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: false,
        Tty: false,
      });

      this.activeContainers.add(container.id);

      await container.putArchive(tarArchive, { path: '/sandbox' });

      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true
      });

      let stdout = '';
      let stderr = '';
      
      const outputPromise = new Promise((resolve) => {
        const chunks = [];
        
        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const output = this.stripDockerStreamHeaders(buffer);
          resolve(output);
        });
      });

      const startTime = process.hrtime.bigint();
      await container.start();

      const waitPromise = container.wait();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Time Limit Exceeded')), config.timeout)
      );

      const [result, output] = await Promise.all([
        Promise.race([waitPromise, timeoutPromise]),
        outputPromise
      ]);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const stats = await container.stats({ stream: false });
      const memoryUsed = (stats.memory_stats.usage || 0) / 1024 / 1024;

      try {
        await container.remove({ force: true });
      } catch (e) {
        console.error('Failed to remove container:', e.message);
      }

      this.activeContainers.delete(container.id);

      if (result.StatusCode !== 0) {
        return {
          success: false,
          output: null,
          executionTime: Math.round(executionTime * 100) / 100,
          memory: Math.round(memoryUsed * 100) / 100,
          error: output || 'Runtime Error'
        };
      }

      // Extract only the last line of output (the JSON result)
      // This handles cases where user code might have console.log statements
      const outputLines = output.trim().split('\n').filter(line => line.trim());
      const lastLine = outputLines.length > 0 ? outputLines[outputLines.length - 1] : output.trim();
      
      return {
        success: true,
        output: lastLine.trim(),
        executionTime: Math.round(executionTime * 100) / 100,
        memory: Math.round(memoryUsed * 100) / 100,
        error: null
      };

    } catch (error) {
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        this.activeContainers.delete(container.id);
      }
      
      if (error.message.includes('Time Limit Exceeded')) {
        return {
          success: false,
          output: null,
          executionTime: config.timeout,
          memory: 0,
          error: 'Time Limit Exceeded'
        };
      }

      return {
        success: false,
        output: null,
        executionTime: 0,
        memory: 0,
        error: error.message
      };
    }
  }

  stripDockerStreamHeaders(buffer) {
    if (!buffer || buffer.length === 0) return '';
    
    const chunks = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) {
        chunks.push(buffer.slice(offset));
        break;
      }

      const streamType = buffer[offset];
      if (streamType !== 1 && streamType !== 2) {
        return buffer.toString('utf8');
      }

      const size = buffer.readUInt32BE(offset + 4);
      
      offset += 8;
      
      if (offset + size > buffer.length) {
        chunks.push(buffer.slice(offset));
        break;
      }
      
      const chunk = buffer.slice(offset, offset + size);
      chunks.push(chunk);
      
      offset += size;
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  async executeCode(code, language, testCase, timeLimit) {
    // Check if Docker and images are available
    if (!dockerAvailable || !dockerImagesAvailable) {
      // Use fallback executor
      if (!fallbackExecutor.isSupported(language)) {
        return {
          success: false,
          output: null,
          executionTime: 0,
          memory: 0,
          error: `Docker is not available or images not built. Supported languages without Docker: ${fallbackExecutor.getSupportedLanguages().join(', ')}. To enable all languages, run: cd backend/judge && ./build-images.ps1`
        };
      }
      return await fallbackExecutor.executeCode(code, language, testCase, timeLimit);
    }

    const config = LANGUAGE_CONFIGS[language];
    if (!config) {
      const supportedLanguages = Object.keys(LANGUAGE_CONFIGS).join(', ');
      throw new Error(
        `Unsupported language: ${language}. Supported languages: ${supportedLanguages}`
      );
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new Error('Code cannot be empty');
    }

    if (!testCase || testCase.input === undefined || testCase.expectedOutput === undefined) {
      throw new Error('Invalid test case: input and expectedOutput are required');
    }

    return await this.executeInDocker(code, language, testCase, {
      ...config,
      timeout: timeLimit || config.timeout
    });
  }

  // Check if Docker is available and images are built
  isDockerAvailable() {
    return dockerAvailable && dockerImagesAvailable;
  }

  // Get list of available languages
  getAvailableLanguages() {
    if (dockerAvailable && dockerImagesAvailable) {
      return Object.keys(LANGUAGE_CONFIGS);
    }
    return fallbackExecutor.getSupportedLanguages();
  }

  prepareCode(code, testCase, language) {
    const { input, expectedOutput } = testCase;
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return `
${code}

const input = ${JSON.stringify(input)};
const result = solution(...input);
// Output only the result as the last line
console.log(JSON.stringify(result));
`;

      case 'python':
        return `
import json
import sys

${code}

input_data = ${JSON.stringify(input)}
result = solution(*input_data)
print(json.dumps(result))
`;

      case 'java':
        return `
import java.util.*;
import com.google.gson.Gson;

public class Solution {
    ${code.replace(/public\s+class\s+\w+\s*{/g, '').replace(/}$/, '')}
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        Gson gson = new Gson();
        
        ${this.generateJavaMainCode(input)}
    }
}
`;

      case 'cpp':
        return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <queue>
#include <stack>
using namespace std;

${code}

int main() {
    ${this.generateCppMainCode(input)}
    return 0;
}
`;

      case 'go':
        return `
package main

import (
    "fmt"
    "encoding/json"
)

${code}

func main() {
    input := ${JSON.stringify(input)}
    result := solution(input...)
    jsonResult, _ := json.Marshal(result)
    fmt.Println(string(jsonResult))
}
`;

      case 'rust':
        return `
${code}

fn main() {
    let input = ${this.generateRustInput(input)};
    let result = solution(&input);
    println!("{:?}", result);
}
`;

      case 'ruby':
        return `
${code}

input = ${JSON.stringify(input)}
result = solution(*input)
puts result.to_json
`;

      case 'php':
        return `
<?php
${code}

$input = ${JSON.stringify(input)};
$result = solution(...$input);
echo json_encode($result);
`;

      default:
        throw new Error(`Code preparation not implemented for ${language}`);
    }
  }

  generateJavaMainCode(input) {
    const params = input.map(i => JSON.stringify(i)).join(', ');
    return `
        Object result = sol.solution(${params});
        System.out.println(gson.toJson(result));
    `;
  }

  generateCppMainCode(input) {
    return `cout << solution(${input.map(i => JSON.stringify(i)).join(', ')}) << endl;`;
  }

  generateRustInput(input) {
    if (Array.isArray(input)) {
      if (input.length === 0) return 'vec![]';
      // Handle array of arrays or primitives
      if (Array.isArray(input[0])) {
        return `vec![${input.map(arr => `vec![${arr.join(', ')}]`).join(', ')}]`;
      }
      if (typeof input[0] === 'string') {
        return `vec![${input.map(s => `"${s}"`.replace(/"/g, '\\"')).join(', ')}]`;
      }
      return `vec![${input.join(', ')}]`;
    }
    if (typeof input === 'string') {
      return `"${input.replace(/"/g, '\\"')}"`;
    }
    return String(input);
  }

  async runTestCases(code, language, testCases) {
    // Use fallback executor if Docker is not available or images not built
    if (!dockerAvailable || !dockerImagesAvailable) {
      return await fallbackExecutor.runTestCases(code, language, testCases);
    }

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

      // Parse actual output for display
      // Extract only the last line to handle cases where user code has console.log statements
      let outputToParse = result.output;
      if (typeof outputToParse === 'string') {
        const lines = outputToParse.trim().split('\n').filter(line => line.trim());
        outputToParse = lines.length > 0 ? lines[lines.length - 1] : outputToParse.trim();
      }
      
      let actualOutputParsed = outputToParse;
      try {
        if (typeof outputToParse === 'string') {
          try {
            actualOutputParsed = JSON.parse(outputToParse);
          } catch {
            // If not JSON, try to parse as boolean/number
            const trimmed = outputToParse.trim().toLowerCase();
            if (trimmed === 'true') actualOutputParsed = true;
            else if (trimmed === 'false') actualOutputParsed = false;
            else if (!isNaN(trimmed)) actualOutputParsed = Number(trimmed);
            else actualOutputParsed = outputToParse.trim();
          }
        }
      } catch (e) {
        actualOutputParsed = outputToParse;
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
      });

      totalTime += result.executionTime || 0;
      maxMemory = Math.max(maxMemory, result.memory || 0);

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
      // Parse actual output (from Docker execution)
      let actualParsed;
      if (typeof actual === 'string') {
        try {
          // Try to parse as JSON first
          actualParsed = JSON.parse(actual.trim());
        } catch {
          // If not JSON, check for boolean/number strings
          const trimmed = actual.trim().toLowerCase();
          if (trimmed === 'true') actualParsed = true;
          else if (trimmed === 'false') actualParsed = false;
          else if (!isNaN(trimmed)) actualParsed = Number(trimmed);
          else actualParsed = actual.trim();
        }
      } else {
        actualParsed = actual;
      }

      // Parse expected output
      let expectedParsed;
      if (typeof expected === 'string') {
        try {
          expectedParsed = JSON.parse(expected);
        } catch {
          const trimmed = expected.trim().toLowerCase();
          if (trimmed === 'true') expectedParsed = true;
          else if (trimmed === 'false') expectedParsed = false;
          else if (!isNaN(trimmed)) expectedParsed = Number(trimmed);
          else expectedParsed = expected.trim();
        }
      } else {
        expectedParsed = expected;
      }

      // Normalize arrays and objects for comparison
      const normalize = (value) => {
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
      // Fallback to string comparison
      return String(actual).trim() === String(expected).trim();
    }
  }

  async analyzeTimeComplexity(code, language, testCases) {
    // Use fallback if Docker is not available or images not built
    if (!dockerAvailable || !dockerImagesAvailable) {
      return await fallbackExecutor.analyzeTimeComplexity(code, language, testCases);
    }

    console.log('🔍 Starting advanced time complexity analysis...');
    
    if (!testCases || testCases.length === 0) {
      return { 
        complexity: 'Unknown', 
        confidence: 0,
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        details: 'No test cases available for complexity analysis'
      };
    }
    
    const measurements = [];
    
    // Use up to 10 test cases for complexity analysis, but prioritize larger inputs
    const sortedTestCases = [...testCases].sort((a, b) => {
      const sizeA = this.getInputSize(a.input);
      const sizeB = this.getInputSize(b.input);
      return sizeB - sizeA; // Sort descending by size
    });
    
    const testCasesToUse = sortedTestCases.slice(0, Math.min(10, sortedTestCases.length));
    
    for (const testCase of testCasesToUse) {
      try {
        const result = await this.executeCode(code, language, testCase);
        
        if (result.success && result.executionTime > 0) {
          const inputSize = this.getInputSize(testCase.input);
          if (inputSize > 0) {
            measurements.push([inputSize, result.executionTime]);
          }
        }
      } catch (error) {
        console.warn('Error executing test case for complexity analysis:', error.message);
        // Continue with other test cases
      }
    }

    if (measurements.length < 3) {
      return { 
        complexity: 'Unknown', 
        confidence: 0,
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        details: `Insufficient data points (${measurements.length} measurements, need at least 3)`
      };
    }

    // Sort by input size (ascending)
    measurements.sort((a, b) => a[0] - b[0]);

    // Try different regression models
    const models = {
      'O(1)': this.fitConstant(measurements),
      'O(log n)': this.fitLogarithmic(measurements),
      'O(n)': this.fitLinear(measurements),
      'O(n log n)': this.fitNLogN(measurements),
      'O(n²)': this.fitQuadratic(measurements),
      'O(n³)': this.fitCubic(measurements),
      'O(2ⁿ)': this.fitExponential(measurements),
    };

    // Find best fit (highest R²)
    let bestFit = null;
    let bestR2 = -Infinity;
    let bestComplexity = 'Unknown';

    for (const [complexity, model] of Object.entries(models)) {
      if (model && model.r2 !== undefined && !isNaN(model.r2) && model.r2 > bestR2) {
        bestR2 = model.r2;
        bestFit = model;
        bestComplexity = complexity;
      }
    }

    // Calculate confidence (R² normalized to 0-1, but clamp negative values to 0)
    const confidence = Math.max(0, Math.min(1, bestR2));

    // Estimate space complexity (simplified - just based on input size for now)
    // In a real implementation, we'd need to track memory usage during execution
    const maxInputSize = Math.max(...measurements.map(([n]) => n));
    let spaceComplexity = 'O(1)';
    if (maxInputSize > 100) {
      spaceComplexity = 'O(n)'; // Large input sizes typically require O(n) space
    }

    return {
      complexity: bestComplexity,
      timeComplexity: bestComplexity,
      spaceComplexity: spaceComplexity,
      confidence: Math.round(confidence * 100) / 100,
      rSquared: Math.round(bestR2 * 1000) / 1000,
      measurements: measurements.map(([n, t]) => ({ inputSize: n, time: t })),
      details: `Best fit: ${bestComplexity} with R² = ${bestR2.toFixed(4)} (confidence: ${Math.round(confidence * 100)}%)`
    };
  }

  fitConstant(data) {
    const avgTime = data.reduce((sum, [_, t]) => sum + t, 0) / data.length;
    const predictions = data.map(() => avgTime);
    return {
      r2: this.calculateR2(data.map(d => d[1]), predictions),
      predict: () => avgTime
    };
  }

  fitLogarithmic(data) {
    try {
      const logData = data.map(([n, t]) => [Math.log(n), t]);
      const result = regression.linear(logData);
      const predictions = data.map(([n]) => result.predict(Math.log(n))[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  fitLinear(data) {
    try {
      const result = regression.linear(data);
      const predictions = data.map(([n]) => result.predict(n)[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  fitNLogN(data) {
    try {
      const nLogNData = data.map(([n, t]) => [n * Math.log(n), t]);
      const result = regression.linear(nLogNData);
      const predictions = data.map(([n]) => result.predict(n * Math.log(n))[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  fitQuadratic(data) {
    try {
      const result = regression.polynomial(data, { order: 2 });
      const predictions = data.map(([n]) => result.predict(n)[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  fitCubic(data) {
    try {
      const result = regression.polynomial(data, { order: 3 });
      const predictions = data.map(([n]) => result.predict(n)[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  fitExponential(data) {
    try {
      const result = regression.exponential(data);
      const predictions = data.map(([n]) => result.predict(n)[1]);
      return {
        r2: this.calculateR2(data.map(d => d[1]), predictions),
        ...result
      };
    } catch {
      return null;
    }
  }

  calculateR2(actual, predicted) {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    const ssTot = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    return 1 - (ssRes / ssTot);
  }

  getInputSize(input) {
    if (Array.isArray(input)) {
      if (input.length === 0) return 0;
      if (Array.isArray(input[0])) {
        return input[0].length;
      }
      if (typeof input[0] === 'string') {
        return input[0].length;
      }
      return input.length;
    }
    if (typeof input === 'string') {
      return input.length;
    }
    return 1;
  }
}

export default new AdvancedExecutorService();
