/**
 * Perfect Test Case Generator using Hugging Face API
 * 
 * Uses the Hugging Face testCaseGenerator Space to generate comprehensive,
 * perfect test cases for all coding problems.
 * 
 * API: https://huggingface.co/spaces/Syncbuz120/testCaseGenerator
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');
const HF_API_URL = process.env.HF_API_URL || 'https://syncbuz120-testcasegenerator.hf.space/api/predict';

/**
 * Create a comprehensive prompt for the HF API from problem description
 */
function createPromptForHF(problem) {
  const title = problem.title || '';
  const description = problem.description || '';
  const examples = problem.examples || [];
  const constraints = problem.constraints || [];
  
  let prompt = `Problem Title: ${title}\n\n`;
  prompt += `Problem Description:\n${description}\n\n`;
  
  if (examples.length > 0) {
    prompt += `Examples:\n`;
    examples.forEach((ex, idx) => {
      prompt += `Example ${idx + 1}:\n`;
      prompt += `Input: ${ex.input}\n`;
      prompt += `Output: ${ex.output}\n`;
      if (ex.explanation) prompt += `Explanation: ${ex.explanation}\n`;
      prompt += '\n';
    });
  }
  
  if (constraints.length > 0) {
    prompt += `Constraints:\n`;
    constraints.forEach(c => prompt += `- ${c}\n`);
    prompt += '\n';
  }
  
  prompt += `\nGenerate comprehensive test cases for this coding problem. `;
  prompt += `Include multiple test cases with different inputs and expected outputs. `;
  prompt += `Make sure to cover edge cases, boundary conditions, and typical scenarios. `;
  prompt += `Format each test case with clear input and expected output.`;
  
  return prompt;
}

/**
 * Call Hugging Face API to generate test cases
 */
async function generateTestCasesFromHF(problem) {
  try {
    const prompt = createPromptForHF(problem);
    
    console.log(`  Calling HF API for "${problem.title}"...`);
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [prompt, null]
      }),
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result || !result.data) {
      throw new Error('Invalid response from HF API');
    }
    
    // Parse the response - HF API returns array with formatted text and JSON
    const responseData = result.data[0] || result.data;
    
    // Try to extract test cases from the response
    const testCases = extractTestCasesFromHFResponse(responseData, problem);
    
    return testCases;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`  ⚠️  HF API timeout after 30 seconds`);
    } else {
      console.warn(`  ⚠️  HF API error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Extract test cases from HF API response
 */
function extractTestCasesFromHFResponse(responseData, problem) {
  const testCases = [];
  
  if (!responseData) {
    return testCases;
  }
  
  // Try to parse as JSON first
  let parsed = null;
  if (typeof responseData === 'string') {
    try {
      parsed = JSON.parse(responseData);
    } catch {
      // Not JSON, try to extract from text
      return extractTestCasesFromText(responseData, problem);
    }
  } else if (typeof responseData === 'object') {
    parsed = responseData;
  }
  
  // Check if it's in the expected HF format
  if (parsed && parsed.test_cases && Array.isArray(parsed.test_cases)) {
    for (const hfCase of parsed.test_cases) {
      const converted = convertHFTestCase(hfCase, problem);
      if (converted) {
        testCases.push(converted);
      }
    }
  }
  
  // If no test cases found, try extracting from examples in problem
  if (testCases.length === 0) {
    return extractFromProblemExamples(problem);
  }
  
  return testCases;
}

/**
 * Convert HF test case format to our format
 */
function convertHFTestCase(hfCase, problem) {
  try {
    // HF format has: steps, expected, test_data, etc.
    // We need: input, expectedOutput
    
    // Try to extract from test_data or steps
    let input = null;
    let expectedOutput = null;
    
    if (hfCase.test_data) {
      input = parseInputValue(hfCase.test_data);
    }
    
    if (hfCase.expected) {
      expectedOutput = parseOutputValue(hfCase.expected);
    }
    
    // If we have steps, try to extract input/output from them
    if (!input && hfCase.steps && Array.isArray(hfCase.steps)) {
      input = extractInputFromSteps(hfCase.steps);
    }
    
    // Fallback: use problem examples
    if (!input || expectedOutput === null) {
      return null;
    }
    
    return {
      input: Array.isArray(input) ? input : [input],
      expectedOutput: expectedOutput
    };
  } catch (error) {
    console.warn(`Failed to convert HF test case: ${error.message}`);
    return null;
  }
}

/**
 * Extract input from HF test case steps
 */
function extractInputFromSteps(steps) {
  // Look for input patterns in steps
  for (const step of steps) {
    if (step.includes('Input:') || step.includes('input:')) {
      const match = step.match(/[Ii]nput[:\s]+(.+)/);
      if (match) {
        return parseInputValue(match[1]);
      }
    }
  }
  return null;
}

/**
 * Extract test cases from text response
 */
function extractTestCasesFromText(text, problem) {
  // Fallback to extracting from problem examples
  return extractFromProblemExamples(problem);
}

/**
 * Extract test cases from problem examples (fallback method)
 */
function extractFromProblemExamples(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  if (!problem.description) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Extract examples from description using improved parsing
  const examples = extractExamplesFromDescription(problem.description);
  
  for (const example of examples) {
    try {
      const input = parseInputFromExample(example.input);
      const output = parseOutputFromExample(example.output);
      
      if (input && output !== null) {
        testCases.push({
          input: Array.isArray(input) ? input : [input],
          expectedOutput: output
        });
      }
    } catch (error) {
      // Skip invalid examples
    }
  }
  
  // First 2-3 become visible, rest become hidden
  const visibleCount = Math.min(3, testCases.length);
  
  return {
    testCases: testCases.slice(0, visibleCount),
    hiddenTestCases: testCases.slice(visibleCount)
  };
}

/**
 * Extract examples from problem description
 */
function extractExamplesFromDescription(description) {
  const examples = [];
  
  if (!description) return examples;
  
  // Pattern: **Example N:** ... **Input:** ... **Output:** ...
  const exampleRegex = /\*\*Example\s+(\d+):\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/g;
  let match;
  
  while ((match = exampleRegex.exec(description)) !== null) {
    const block = match[2];
    
    const inputMatch = block.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:|\*\*Explanation:|$)/);
    const outputMatch = block.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/);
    
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim()
      });
    }
  }
  
  return examples;
}

/**
 * Parse input from example string - improved version
 */
function parseInputFromExample(inputStr) {
  if (!inputStr) return [];
  
  inputStr = inputStr.trim();
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Parse multiple variable assignments
  const assignments = {};
  const parts = [];
  
  // Split by commas but respect brackets
  let current = '';
  let bracketDepth = 0;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  
  // Parse each assignment
  for (const part of parts) {
    const equalIdx = part.indexOf('=');
    if (equalIdx === -1) continue;
    
    const varName = part.substring(0, equalIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
    let varValue = part.substring(equalIdx + 1).trim();
    
    assignments[varName] = parseValue(varValue);
  }
  
  // Return as array of values in order
  return Object.values(assignments);
}

/**
 * Parse output from example
 */
function parseOutputFromExample(outputStr) {
  if (!outputStr) return null;
  
  outputStr = outputStr.trim();
  outputStr = outputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  return parseValue(outputStr);
}

/**
 * Parse input value
 */
function parseInputValue(valueStr) {
  return parseValue(valueStr);
}

/**
 * Parse output value
 */
function parseOutputValue(valueStr) {
  return parseValue(valueStr);
}

/**
 * Parse a value string into JavaScript value
 */
function parseValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') {
    return valueStr;
  }
  
  valueStr = valueStr.trim();
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try JSON parse
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  // Try array format
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try {
      return JSON.parse(valueStr);
    } catch {
      const content = valueStr.slice(1, -1).trim();
      if (!content) return [];
      
      return content.split(',').map(item => {
        const trimmed = item.trim();
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
        if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed;
      });
    }
  }
  
  // Try number
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr);
  if (/^-?\d*\.\d+$/.test(valueStr)) return parseFloat(valueStr);
  
  // Try boolean
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  
  return valueStr;
}

/**
 * Update problem with test cases
 */
async function updateProblem(problem) {
  try {
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    
    let fullProblem = await database.getProblemById(problem.id);
    if (!fullProblem) {
      fullProblem = { ...problem };
    }
    
    fullProblem.testCases = problem.testCases || [];
    fullProblem.hiddenTestCases = problem.hiddenTestCases || [];
    fullProblem.updatedAt = new Date().toISOString();
    
    // Save locally
    await fs.writeJson(filePath, fullProblem, { spaces: 2 });
    
    // Try to update in database
    try {
      await database.updateProblem(problem.id, {
        testCases: fullProblem.testCases,
        hiddenTestCases: fullProblem.hiddenTestCases
      });
    } catch (error) {
      // Database columns might not exist - that's okay
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Perfect Test Case Generator (Using Hugging Face API) ===\n');
  console.log(`HF API URL: ${HF_API_URL}\n`);
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let hfSuccess = 0;
    let exampleFallback = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Skip if already has good test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (skipped: ${skipped}, updated: ${updated})`);
        }
        continue;
      }
      
      console.log(`[${processed}/${problemsToProcess.length}] Processing "${problem.title}"...`);
      
      let testCases = [];
      let hiddenTestCases = [];
      let source = 'none';
      
      // Try Hugging Face API first
      const hfResult = await generateTestCasesFromHF(problem);
      
      if (hfResult && hfResult.testCases && hfResult.testCases.length > 0) {
        testCases = hfResult.testCases;
        hiddenTestCases = hfResult.hiddenTestCases || [];
        source = 'hf';
        hfSuccess++;
        console.log(`  ✓ Generated ${testCases.length} visible + ${hiddenTestCases.length} hidden test cases from HF API`);
      } else {
        // Fallback to extracting from examples
        const exampleResult = extractFromProblemExamples(problem);
        if (exampleResult.testCases.length > 0) {
          testCases = exampleResult.testCases;
          hiddenTestCases = exampleResult.hiddenTestCases;
          source = 'examples';
          exampleFallback++;
          console.log(`  ✓ Generated ${testCases.length} visible + ${hiddenTestCases.length} hidden test cases from examples`);
        } else {
          errors++;
          console.log(`  ⚠️  Could not generate test cases`);
          continue;
        }
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        updated++;
      } else {
        errors++;
      }
      
      // Rate limiting - wait between HF API calls
      if (source === 'hf' && processed % 5 === 0) {
        console.log('  Waiting 2 seconds for rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);
    console.log(`Generated from HF API: ${hfSuccess}`);
    console.log(`Generated from examples (fallback): ${exampleFallback}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

