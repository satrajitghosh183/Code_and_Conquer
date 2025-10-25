// import { exec } from 'child_process';
// import fs from 'fs-extra';
// import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const SANDBOX_DIR = path.join(__dirname, '../../../judge/sandbox');
// const TIMEOUT = parseInt(process.env.EXECUTION_TIMEOUT) || 10000;

// await fs.ensureDir(SANDBOX_DIR);

// const LANGUAGE_CONFIGS = {
//   javascript: {
//     extension: 'js',
//     dockerImage: 'node:18-alpine',
//     compileCmd: null,
//     runCmd: (filename) => `node ${filename}`,
//     dockerfile: null
//   },
//   typescript: {
//     extension: 'ts',
//     dockerImage: 'node:18-alpine',
//     compileCmd: (filename) => `npx tsx ${filename}`,
//     runCmd: (filename) => `npx tsx ${filename}`,
//     dockerfile: null
//   },
//   python: {
//     extension: 'py',
//     dockerImage: 'python:3.11-alpine',
//     compileCmd: null,
//     runCmd: (filename) => `python ${filename}`,
//     dockerfile: null
//   },
//   java: {
//     extension: 'java',
//     dockerImage: 'openjdk:17-alpine',
//     compileCmd: (filename) => `javac ${filename}`,
//     runCmd: (filename) => `java ${filename.replace('.java', '')}`,
//     dockerfile: null
//   },
//   cpp: {
//     extension: 'cpp',
//     dockerImage: 'gcc:12-alpine',
//     compileCmd: (filename) => `g++ -o program ${filename} -std=c++17`,
//     runCmd: () => `./program`,
//     dockerfile: null
//   },
//   c: {
//     extension: 'c',
//     dockerImage: 'gcc:12-alpine',
//     compileCmd: (filename) => `gcc -o program ${filename}`,
//     runCmd: () => `./program`,
//     dockerfile: null
//   },
//   go: {
//     extension: 'go',
//     dockerImage: 'golang:1.21-alpine',
//     compileCmd: null,
//     runCmd: (filename) => `go run ${filename}`,
//     dockerfile: null
//   },
//   rust: {
//     extension: 'rs',
//     dockerImage: 'rust:1.75-alpine',
//     compileCmd: (filename) => `rustc ${filename} -o program`,
//     runCmd: () => `./program`,
//     dockerfile: null
//   },
//   ruby: {
//     extension: 'rb',
//     dockerImage: 'ruby:3.2-alpine',
//     compileCmd: null,
//     runCmd: (filename) => `ruby ${filename}`,
//     dockerfile: null
//   },
//   php: {
//     extension: 'php',
//     dockerImage: 'php:8.2-alpine',
//     compileCmd: null,
//     runCmd: (filename) => `php ${filename}`,
//     dockerfile: null
//   }
// };

// class ExecutorService {
//   async executeCode(code, language, testCase, timeLimit = TIMEOUT) {
//     const config = LANGUAGE_CONFIGS[language];
//     if (!config) {
//       throw new Error(`Unsupported language: ${language}`);
//     }

//     const executionId = uuidv4();
//     const workDir = path.join(SANDBOX_DIR, executionId);
//     await fs.ensureDir(workDir);

//     try {
//       // Prepare code with test case
//       const fullCode = this.prepareCode(code, testCase, language);
//       const filename = `solution.${config.extension}`;
//       const filepath = path.join(workDir, filename);
      
//       await fs.writeFile(filepath, fullCode);

//       // Compile if needed
//       if (config.compileCmd) {
//         await this.runCommand(config.compileCmd(filename), workDir, 30000);
//       }

//       // Execute
//       const startTime = process.hrtime.bigint();
//       const startMemory = process.memoryUsage().heapUsed;
      
//       const result = await this.runCommand(
//         config.runCmd(filename),
//         workDir,
//         timeLimit
//       );

//       const endTime = process.hrtime.bigint();
//       const endMemory = process.memoryUsage().heapUsed;
      
//       const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
//       const memoryUsed = Math.abs(endMemory - startMemory) / 1024 / 1024; // Convert to MB

//       return {
//         success: true,
//         output: result.stdout.trim(),
//         executionTime: Math.round(executionTime * 100) / 100,
//         memory: Math.round(memoryUsed * 100) / 100,
//         error: null
//       };
//     } catch (error) {
//       return {
//         success: false,
//         output: null,
//         executionTime: 0,
//         memory: 0,
//         error: error.message
//       };
//     } finally {
//       // Cleanup
//       await fs.remove(workDir);
//     }
//   }

//   prepareCode(code, testCase, language) {
//     const { input, expectedOutput } = testCase;
    
//     switch (language) {
//       case 'javascript':
//       case 'typescript':
//         return `
// ${code}

// // Test execution
// const input = ${JSON.stringify(input)};
// const result = solution(...input);
// console.log(JSON.stringify(result));
// `;

//       case 'python':
//         return `
// import json

// ${code}

// # Test execution
// input_data = ${JSON.stringify(input)}
// result = solution(*input_data)
// print(json.dumps(result))
// `;

//       case 'java':
//         return `
// import java.util.*;

// ${code}

// public class Solution {
//     public static void main(String[] args) {
//         Solution sol = new Solution();
//         // Parse input and call solution
//         ${this.generateJavaTestCode(input)}
//     }
// }
// `;

//       case 'cpp':
//       case 'c':
//         return `
// #include <iostream>
// #include <vector>
// #include <string>
// using namespace std;

// ${code}

// int main() {
//     ${this.generateCppTestCode(input)}
//     return 0;
// }
// `;

//       case 'go':
//         return `
// package main

// import (
//     "fmt"
//     "encoding/json"
// )

// ${code}

// func main() {
//     input := ${JSON.stringify(input)}
//     result := solution(input...)
//     jsonResult, _ := json.Marshal(result)
//     fmt.Println(string(jsonResult))
// }
// `;

//       case 'rust':
//         return `
// ${code}

// fn main() {
//     let input = ${JSON.stringify(input)};
//     let result = solution(&input);
//     println!("{:?}", result);
// }
// `;

//       case 'ruby':
//         return `
// require 'json'

// ${code}

// input = ${JSON.stringify(input)}
// result = solution(*input)
// puts JSON.generate(result)
// `;

//       case 'php':
//         return `
// <?php
// ${code}

// $input = ${this.phpJsonEncode(input)};
// $result = call_user_func_array('solution', $input);
// echo json_encode($result);
// ?>
// `;

//       default:
//         throw new Error(`Code preparation not implemented for ${language}`);
//     }
//   }

//   generateJavaTestCode(input) {
//     // Simplified - in production, you'd parse the input type
//     return `System.out.println(sol.solution(${input.map(i => JSON.stringify(i)).join(', ')}));`;
//   }

//   generateCppTestCode(input) {
//     return `cout << solution(${input.map(i => JSON.stringify(i)).join(', ')}) << endl;`;
//   }

//   phpJsonEncode(obj) {
//     return JSON.stringify(obj).replace(/"/g, '\\"');
//   }

//   runCommand(command, cwd, timeout) {
//     return new Promise((resolve, reject) => {
//       const process = exec(
//         command,
//         {
//           cwd,
//           timeout,
//           maxBuffer: 10 * 1024 * 1024, // 10MB
//           env: { ...process.env, NODE_ENV: 'production' }
//         },
//         (error, stdout, stderr) => {
//           if (error) {
//             if (error.killed) {
//               reject(new Error('Time Limit Exceeded'));
//             } else {
//               reject(new Error(stderr || error.message));
//             }
//           } else {
//             resolve({ stdout, stderr });
//           }
//         }
//       );
//     });
//   }

//   async runTestCases(code, language, testCases) {
//     const results = [];
//     let totalTime = 0;
//     let maxMemory = 0;

//     for (let i = 0; i < testCases.length; i++) {
//       const testCase = testCases[i];
//       const result = await this.executeCode(code, language, testCase);
      
//       const passed = result.success && 
//         this.compareOutput(result.output, testCase.expectedOutput);

//       results.push({
//         testCase: i + 1,
//         input: testCase.input,
//         expectedOutput: testCase.expectedOutput,
//         actualOutput: result.output,
//         passed,
//         executionTime: result.executionTime,
//         memory: result.memory,
//         error: result.error
//       });

//       totalTime += result.executionTime;
//       maxMemory = Math.max(maxMemory, result.memory);

//       // Stop on first failure for efficiency
//       if (!passed && !result.success) break;
//     }

//     const allPassed = results.every(r => r.passed);
    
//     return {
//       allPassed,
//       results,
//       totalExecutionTime: Math.round(totalTime * 100) / 100,
//       maxMemory: Math.round(maxMemory * 100) / 100,
//       passedTests: results.filter(r => r.passed).length,
//       totalTests: results.length
//     };
//   }

//   compareOutput(actual, expected) {
//     try {
//       const actualParsed = typeof actual === 'string' ? JSON.parse(actual) : actual;
//       const expectedParsed = typeof expected === 'string' ? JSON.parse(expected) : expected;
//       return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
//     } catch {
//       return String(actual).trim() === String(expected).trim();
//     }
//   }

//   async analyzeTimeComplexity(code, language, testCases) {
//     // Run with varying input sizes and measure time
//     const measurements = [];
    
//     for (const testCase of testCases.slice(0, 5)) { // Analyze first 5 test cases
//       const result = await this.executeCode(code, language, testCase);
//       if (result.success) {
//         const inputSize = this.getInputSize(testCase.input);
//         measurements.push({
//           size: inputSize,
//           time: result.executionTime
//         });
//       }
//     }

//     if (measurements.length < 2) {
//       return { complexity: 'Unknown', confidence: 0 };
//     }

//     // Analyze growth pattern
//     const complexity = this.estimateComplexity(measurements);
//     return complexity;
//   }

//   getInputSize(input) {
//     if (Array.isArray(input)) {
//       if (input.length === 0) return 0;
//       if (Array.isArray(input[0])) {
//         return input[0].length; // Assume first arg is main input
//       }
//       return input.length;
//     }
//     return 1;
//   }

//   estimateComplexity(measurements) {
//     // Sort by size
//     measurements.sort((a, b) => a.size - b.size);
    
//     if (measurements.length < 2) {
//       return { complexity: 'O(1) or O(n)', confidence: 0.3 };
//     }

//     // Calculate ratios
//     const ratios = [];
//     for (let i = 1; i < measurements.length; i++) {
//       const sizeRatio = measurements[i].size / measurements[i - 1].size;
//       const timeRatio = measurements[i].time / measurements[i - 1].time;
//       ratios.push({ sizeRatio, timeRatio });
//     }

//     const avgTimeRatio = ratios.reduce((sum, r) => sum + r.timeRatio, 0) / ratios.length;
//     const avgSizeRatio = ratios.reduce((sum, r) => sum + r.sizeRatio, 0) / ratios.length;

//     // Classify complexity
//     if (avgTimeRatio < 1.5) {
//       return { complexity: 'O(1) or O(log n)', confidence: 0.7 };
//     } else if (avgTimeRatio < avgSizeRatio * 1.5) {
//       return { complexity: 'O(n)', confidence: 0.8 };
//     } else if (avgTimeRatio < avgSizeRatio * avgSizeRatio * 1.5) {
//       return { complexity: 'O(n log n) or O(n²)', confidence: 0.6 };
//     } else {
//       return { complexity: 'O(n²) or higher', confidence: 0.7 };
//     }
//   }
// }

// export default new ExecutorService();




import Docker from 'dockerode';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import tar from 'tar-stream';
import regression from 'regression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docker = new Docker();
const SANDBOX_DIR = path.join(__dirname, '../../../judge/sandbox');

await fs.ensureDir(SANDBOX_DIR);

const LANGUAGE_CONFIGS = {
  javascript: {
    extension: 'js',
    dockerImage: 'leetcode-judge-node:latest',
    compileCmd: null,
    runCmd: 'node solution.js',
    memoryLimit: 256 * 1024 * 1024, // 256MB
    timeout: 10000, // 10 seconds
  },
  typescript: {
    extension: 'ts',
    dockerImage: 'leetcode-judge-node:latest',
    compileCmd: null,
    runCmd: 'npx tsx solution.ts',
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
    compileCmd: 'javac Solution.java',
    runCmd: 'java Solution',
    memoryLimit: 512 * 1024 * 1024, // 512MB for JVM
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
    dockerImage: 'ruby:3.2-alpine',
    compileCmd: null,
    runCmd: 'ruby solution.rb',
    memoryLimit: 256 * 1024 * 1024,
    timeout: 10000,
  },
  php: {
    extension: 'php',
    dockerImage: 'php:8.2-alpine',
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
    // Cleanup on exit
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
    // Prepare code files
    const filename = `solution.${config.extension}`;
    const fullCode = this.prepareCode(code, testCase, language);
    
    const files = {
      [filename]: fullCode
    };

    const tarArchive = await this.createTarArchive(files);

    // Create container
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
        AutoRemove: false, // Changed to false so we can get stats
      },
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      Tty: false,
    });

    this.activeContainers.add(container.id);

    // Copy files to container
    await container.putArchive(tarArchive, { path: '/sandbox' });

    // Attach to get output streams
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    // Collect output
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

    // Start container
    const startTime = process.hrtime.bigint();
    await container.start();

    // Wait for completion or timeout
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

    // Get stats
    const stats = await container.stats({ stream: false });
    const memoryUsed = (stats.memory_stats.usage || 0) / 1024 / 1024;

    // Cleanup
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

    return {
      success: true,
      output: output.trim(),
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

/**
 * Strip Docker stream headers from logs
 * Docker multiplexes stdout/stderr with 8-byte headers
 * Header format: [stream_type, 0, 0, 0, size1, size2, size3, size4]
 */
stripDockerStreamHeaders(buffer) {
  if (!buffer || buffer.length === 0) return '';
  
  const chunks = [];
  let offset = 0;

  while (offset < buffer.length) {
    // Need at least 8 bytes for header
    if (offset + 8 > buffer.length) {
      // Remaining data without proper header, just add it
      chunks.push(buffer.slice(offset));
      break;
    }

    // Check if this looks like a Docker header
    const streamType = buffer[offset];
    if (streamType !== 1 && streamType !== 2) {
      // Doesn't look like a Docker header, treat as raw output
      return buffer.toString('utf8');
    }

    // Read payload size (big-endian)
    const size = buffer.readUInt32BE(offset + 4);
    
    // Skip header (8 bytes)
    offset += 8;
    
    if (offset + size > buffer.length) {
      // Not enough data for payload, add what we have
      chunks.push(buffer.slice(offset));
      break;
    }
    
    const chunk = buffer.slice(offset, offset + size);
    chunks.push(chunk);
    
    offset += size;
  }

  return Buffer.concat(chunks).toString('utf8');
}

  // async executeInDocker(code, language, testCase, config) {
  //   const executionId = uuidv4();
  //   let container = null;

  //   try {
  //     // Prepare code files
  //     const filename = `solution.${config.extension}`;
  //     const fullCode = this.prepareCode(code, testCase, language);
      
  //     const files = {
  //       [filename]: fullCode
  //     };

  //     const tarArchive = await this.createTarArchive(files);

  //     // Create container
  //     container = await docker.createContainer({
  //       Image: config.dockerImage,
  //       Cmd: ['/bin/sh', '-c', config.compileCmd ? 
  //         `${config.compileCmd} && ${config.runCmd}` : config.runCmd],
  //       WorkingDir: '/sandbox',
  //       HostConfig: {
  //         Memory: config.memoryLimit,
  //         MemorySwap: config.memoryLimit,
  //         CpuQuota: 50000, // 50% CPU
  //         CpuPeriod: 100000,
  //         NetworkMode: 'none', // No network access
  //         PidsLimit: 50, // Limit number of processes
  //         ReadonlyRootfs: false,
  //         AutoRemove: true,
  //       },
  //       AttachStdout: true,
  //       AttachStderr: true,
  //       Tty: false,
  //     });

  //     this.activeContainers.add(container.id);

  //     // Copy files to container
  //     await container.putArchive(tarArchive, { path: '/sandbox' });

  //     // Start container
  //     await container.start();

  //     const startTime = process.hrtime.bigint();

  //     // Wait for container with timeout
  //     const waitPromise = container.wait();
  //     const timeoutPromise = new Promise((_, reject) => 
  //       setTimeout(() => reject(new Error('Time Limit Exceeded')), config.timeout)
  //     );

  //     const result = await Promise.race([waitPromise, timeoutPromise]);

  //     const endTime = process.hrtime.bigint();
  //     const executionTime = Number(endTime - startTime) / 1000000; // ms

  //     // Get logs
  //     const logs = await container.logs({
  //       stdout: true,
  //       stderr: true,
  //     });

  //     const output = logs.toString('utf8');

  //     // Get stats
  //     const stats = await container.stats({ stream: false });
  //     const memoryUsed = stats.memory_stats.usage / 1024 / 1024; // MB

  //     this.activeContainers.delete(container.id);

  //     if (result.StatusCode !== 0) {
  //       return {
  //         success: false,
  //         output: null,
  //         executionTime: Math.round(executionTime * 100) / 100,
  //         memory: Math.round(memoryUsed * 100) / 100,
  //         error: output || 'Runtime Error'
  //       };
  //     }

  //     return {
  //       success: true,
  //       output: output.trim(),
  //       executionTime: Math.round(executionTime * 100) / 100,
  //       memory: Math.round(memoryUsed * 100) / 100,
  //       error: null
  //     };

  //   } catch (error) {
  //     if (container) {
  //       this.activeContainers.delete(container.id);
  //     }
      
  //     if (error.message.includes('Time Limit Exceeded')) {
  //       return {
  //         success: false,
  //         output: null,
  //         executionTime: config.timeout,
  //         memory: 0,
  //         error: 'Time Limit Exceeded'
  //       };
  //     }

  //     return {
  //       success: false,
  //       output: null,
  //       executionTime: 0,
  //       memory: 0,
  //       error: error.message
  //     };
  //   }
  // }

  async executeCode(code, language, testCase, timeLimit) {
    const config = LANGUAGE_CONFIGS[language];
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    return await this.executeInDocker(code, language, testCase, {
      ...config,
      timeout: timeLimit || config.timeout
    });
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
        
        // Parse input
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

      default:
        throw new Error(`Code preparation not implemented for ${language}`);
    }
  }

  generateJavaMainCode(input) {
    // Simplified for demo - in production, parse types properly
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
    return `vec![${input.join(', ')}]`;
  }

  async runTestCases(code, language, testCases) {
    const results = [];
    let totalTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await this.executeCode(code, language, testCase);
      
      const passed = result.success && 
        this.compareOutput(result.output, testCase.expectedOutput);

      results.push({
        testCase: i + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.output,
        passed,
        executionTime: result.executionTime,
        memory: result.memory,
        error: result.error
      });

      totalTime += result.executionTime;
      maxMemory = Math.max(maxMemory, result.memory);

      if (!passed && !result.success) break;
    }

    const allPassed = results.every(r => r.passed);
    
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
      const actualParsed = typeof actual === 'string' ? JSON.parse(actual) : actual;
      const expectedParsed = typeof expected === 'string' ? JSON.parse(expected) : expected;
      return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
    } catch {
      return String(actual).trim() === String(expected).trim();
    }
  }

  /**
   * ADVANCED TIME COMPLEXITY ANALYSIS
   * Uses mathematical regression to determine actual complexity
   */
  async analyzeTimeComplexity(code, language, testCases) {
    console.log('🔍 Starting advanced time complexity analysis...');
    
    const measurements = [];
    
    // Run with various input sizes
    for (const testCase of testCases.slice(0, Math.min(10, testCases.length))) {
      const result = await this.executeCode(code, language, testCase);
      
      if (result.success) {
        const inputSize = this.getInputSize(testCase.input);
        measurements.push([inputSize, result.executionTime]);
      }
    }

    if (measurements.length < 3) {
      return { 
        complexity: 'Unknown', 
        confidence: 0,
        details: 'Insufficient data points'
      };
    }

    // Sort by input size
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

    // Find best fit (lowest R² error)
    let bestFit = null;
    let bestR2 = -Infinity;
    let bestComplexity = 'Unknown';

    for (const [complexity, model] of Object.entries(models)) {
      if (model && model.r2 > bestR2) {
        bestR2 = model.r2;
        bestFit = model;
        bestComplexity = complexity;
      }
    }

    const confidence = Math.max(0, Math.min(1, bestR2));

    return {
      complexity: bestComplexity,
      confidence: Math.round(confidence * 100) / 100,
      rSquared: Math.round(bestR2 * 1000) / 1000,
      measurements: measurements.map(([n, t]) => ({ inputSize: n, time: t })),
      details: `Best fit: ${bestComplexity} with R² = ${bestR2.toFixed(4)}`
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