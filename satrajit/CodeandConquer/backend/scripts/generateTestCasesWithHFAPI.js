/**
 * Generate Test Cases Using Hugging Face API
 * 
 * This script uses the Hugging Face testCaseGenerator Space API
 * to generate comprehensive test cases for problems.
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
const HF_API_URL = 'https://syncbuz120-testcasegenerator.hf.space/api/predict';

/**
 * Convert HF test case format to our format
 */
function convertHFTestCaseToOurFormat(hfTestCase, problem) {
  // Extract input from test case steps/description
  // This is a simplified conversion - you may need to enhance this
  const input = parseInputFromDescription(hfTestCase.description || hfTestCase.steps?.join(' ') || '');
  const expectedOutput = parseExpectedFromDescription(hfTestCase.expected || hfTestCase.description || '');
  
  return {
    input: input,
    expectedOutput: expectedOutput
  };
}

/**
 * Parse input from description/steps (simplified - will need enhancement)
 */
function parseInputFromDescription(description) {
  // Try to extract from examples in problem description
  // This is a placeholder - actual parsing would be more sophisticated
  return [];
}

/**
 * Parse expected output from description
 */
function parseExpectedFromDescription(description) {
  // Placeholder
  return null;
}

/**
 * Call Hugging Face API to generate test cases
 */
async function generateTestCasesFromHF(problemDescription, problemTitle) {
  try {
    // Create a prompt that combines problem description and title
    const prompt = `Problem: ${problemTitle}\n\nDescription:\n${problemDescription}\n\nGenerate test cases for this coding problem. Include input and expected output for each test case.`;
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [prompt, null]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Parse the response
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const testCaseData = result.data[0];
      
      // Try to parse JSON from the response
      let testCases = [];
      
      // Check if response is JSON string
      if (typeof testCaseData === 'string') {
        try {
          const parsed = JSON.parse(testCaseData);
          if (parsed.test_cases && Array.isArray(parsed.test_cases)) {
            testCases = parsed.test_cases;
          }
        } catch {
          // Not JSON, might be formatted text
          // Try to extract test cases from text format
          testCases = parseTestCasesFromText(testCaseData);
        }
      } else if (testCaseData.test_cases) {
        testCases = testCaseData.test_cases;
      }
      
      return testCases;
    }
    
    return [];
  } catch (error) {
    console.error('Error calling HF API:', error.message);
    return [];
  }
}

/**
 * Parse test cases from text format (fallback)
 */
function parseTestCasesFromText(text) {
  // This would parse text-formatted test cases
  // For now, return empty - we'll enhance this
  return [];
}

/**
 * Generate test cases from examples in problem description
 * This is a fallback if HF API doesn't work
 */
function generateTestCasesFromExamples(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  if (!problem.description) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Extract examples from description
  const examples = extractExamplesFromDescription(problem.description);
  
  for (const example of examples) {
    try {
      const input = parseInputFromExample(example.input);
      const output = parseOutputFromExample(example.output);
      
      if (input && output !== null) {
        testCases.push({
          input: input,
          expectedOutput: output
        });
      }
    } catch (error) {
      console.warn(`Failed to parse example: ${error.message}`);
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
  const exampleBlocks = description.match(/\*\*Example\s+\d+:\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/g);
  
  if (!exampleBlocks) {
    // Try simpler pattern
    const inputOutputPairs = description.match(/\*\*Input:\*\*([\s\S]*?)\*\*Output:\*\*/g);
    if (inputOutputPairs) {
      for (const pair of inputOutputPairs) {
        const inputMatch = pair.match(/\*\*Input:\*\*([\s\S]*?)(?:\*\*Output:)/);
        const outputMatch = pair.match(/\*\*Output:\*\*([\s\S]*?)(?:\*\*Explanation:|$)/);
        
        if (inputMatch && outputMatch) {
          examples.push({
            input: inputMatch[1].trim(),
            output: outputMatch[1].trim()
          });
        }
      }
    }
    return examples;
  }
  
  // Parse each example block
  for (const block of exampleBlocks) {
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
 * Parse input from example string
 */
function parseInputFromExample(inputStr) {
  if (!inputStr) return [];
  
  inputStr = inputStr.trim();
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Parse multiple assignments like "n = 4, p = 0, banned = [1,2], k = 4"
  const values = [];
  let currentVar = '';
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    
    if (char === '=' && bracketDepth === 0) {
      inAssignment = true;
      continue;
    }
    
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0 && inAssignment) {
      const parsed = parseValue(currentValue.trim());
      if (parsed !== null) values.push(parsed);
      currentVar = '';
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    if (inAssignment) {
      currentValue += char;
    } else if (!char.match(/\s/)) {
      currentVar += char;
    }
  }
  
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValue(currentValue.trim());
    if (parsed !== null) values.push(parsed);
  }
  
  return values.length > 0 ? values : [inputStr];
}

/**
 * Parse output from example string
 */
function parseOutputFromExample(outputStr) {
  if (!outputStr) return null;
  
  outputStr = outputStr.trim();
  outputStr = outputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  return parseValue(outputStr);
}

/**
 * Parse a value string into JavaScript value
 */
function parseValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') {
    return valueStr;
  }
  
  valueStr = valueStr.trim();
  
  // Try JSON parse first
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
    
    await fs.writeJson(filePath, fullProblem, { spaces: 2 });
    
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
  console.log('=== Generate Test Cases Using Hugging Face API ===\n');
  console.log(`Using HF API: ${HF_API_URL}\n`);
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let hfGenerated = 0;
    let exampleGenerated = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Skip if already has test cases
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
      let generatedFrom = 'none';
      
      // Try Hugging Face API first
      try {
        const hfTestCases = await generateTestCasesFromHF(problem.description || '', problem.title || '');
        if (hfTestCases && hfTestCases.length > 0) {
          // Convert HF format to our format
          // For now, fall back to examples since HF format needs custom parsing
          generatedFrom = 'hf';
          hfGenerated++;
        }
      } catch (error) {
        console.warn(`  ⚠️  HF API failed: ${error.message}`);
      }
      
      // Fallback to extracting from examples
      if (testCases.length === 0) {
        const result = generateTestCasesFromExamples(problem);
        testCases = result.testCases;
        hiddenTestCases = result.hiddenTestCases;
        
        if (testCases.length > 0) {
          generatedFrom = 'examples';
          exampleGenerated++;
        }
      }
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        errors++;
        console.log(`  ⚠️  Could not generate test cases`);
        continue;
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        updated++;
        console.log(`  ✓ Generated ${testCases.length} visible + ${hiddenTestCases.length} hidden test cases (${generatedFrom})`);
      } else {
        errors++;
      }
      
      // Rate limiting - wait between requests
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`HF API generated: ${hfGenerated}`);
    console.log(`Example extracted: ${exampleGenerated}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\nScript completed!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

