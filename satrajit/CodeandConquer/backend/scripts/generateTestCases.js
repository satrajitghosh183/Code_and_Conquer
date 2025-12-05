/**
 * Generate Test Cases Script
 * 
 * Consolidated script for generating test cases for coding problems.
 * Supports multiple methods: examples extraction, Hugging Face API (optional)
 * 
 * Usage:
 *   node scripts/generateTestCases.js
 *   USE_HF_API=true node scripts/generateTestCases.js
 *   MAX_PROBLEMS=500 node scripts/generateTestCases.js
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');
const HF_API_URL = process.env.HF_API_URL || 'https://syncbuz120-testcasegenerator.hf.space/api/predict';
const USE_HF_API = process.env.USE_HF_API !== 'false';

/**
 * Parse input value - works for all languages
 */
function parseValueForAllLanguages(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') {
    return valueStr;
  }
  
  valueStr = valueStr.trim();
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try {
      return JSON.parse(valueStr);
    } catch {
      return parseArrayString(valueStr);
    }
  }
  
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr, 10);
  if (/^-?\d*\.\d+([eE][+-]?\d+)?$/.test(valueStr)) return parseFloat(valueStr);
  
  if (valueStr.toLowerCase() === 'true') return true;
  if (valueStr.toLowerCase() === 'false') return false;
  if (valueStr === 'null' || valueStr === 'None') return null;
  
  if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
    return valueStr.slice(1, -1);
  }
  
  return valueStr;
}

function parseArrayString(arrayStr) {
  const content = arrayStr.slice(1, -1).trim();
  if (!content) return [];
  
  const items = [];
  let currentItem = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
      if (char === '[') depth++;
      if (char === ']') depth--;
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    
    if (char === ',' && depth === 0 && !inString) {
      const item = currentItem.trim();
      if (item) {
        items.push(parseValueForAllLanguages(item));
      }
      currentItem = '';
    } else {
      currentItem += char;
    }
  }
  
  const item = currentItem.trim();
  if (item) {
    items.push(parseValueForAllLanguages(item));
  }
  
  return items;
}

function parseInputFromExample(inputStr) {
  if (!inputStr) return [];
  
  inputStr = inputStr.trim();
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  const values = [];
  let currentVar = '';
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    const prevChar = i > 0 ? inputStr[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
    
    if (char === '=' && bracketDepth === 0 && !inString) {
      inAssignment = true;
      continue;
    }
    
    if (char === ',' && bracketDepth === 0 && !inString && inAssignment) {
      const parsed = parseValueForAllLanguages(currentValue.trim());
      if (parsed !== null) {
        values.push(parsed);
      }
      currentVar = '';
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    if (inAssignment) {
      currentValue += char;
    }
  }
  
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValueForAllLanguages(currentValue.trim());
    if (parsed !== null) {
      values.push(parsed);
    }
  }
  
  if (values.length === 0) {
    const singleValue = parseValueForAllLanguages(inputStr);
    if (singleValue !== null) {
      return Array.isArray(singleValue) ? singleValue : [singleValue];
    }
  }
  
  return values;
}

function extractExamplesFromDescription(description) {
  const examples = [];
  
  if (!description) return examples;
  
  const exampleRegex = /\*\*Example\s+(\d+):\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/gi;
  let match;
  
  while ((match = exampleRegex.exec(description)) !== null) {
    const block = match[2];
    
    const inputMatch = block.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:|\*\*Explanation:|$)/i);
    const outputMatch = block.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/i);
    
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim()
      });
    }
  }
  
  if (examples.length === 0) {
    const simpleInputMatch = description.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:)/i);
    const simpleOutputMatch = description.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|$)/i);
    
    if (simpleInputMatch && simpleOutputMatch) {
      examples.push({
        input: simpleInputMatch[1].trim(),
        output: simpleOutputMatch[1].trim()
      });
    }
  }
  
  return examples;
}

function generateTestCasesFromExamples(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  const examples = extractExamplesFromDescription(problem.description || '');
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  for (const example of examples) {
    try {
      const input = parseInputFromExample(example.input);
      const output = parseValueForAllLanguages(example.output);
      
      if (input && input.length > 0 && output !== null) {
        testCases.push({
          input: Array.isArray(input) ? input : [input],
          expectedOutput: output
        });
      }
    } catch (error) {
      // Skip invalid examples
    }
  }
  
  const visibleCount = Math.min(3, testCases.length);
  
  return {
    testCases: testCases.slice(0, visibleCount),
    hiddenTestCases: testCases.slice(visibleCount)
  };
}

async function tryHuggingFaceAPI(problem) {
  if (!USE_HF_API) {
    return null;
  }
  
  try {
    const prompt = `Coding Problem:\nTitle: ${problem.title}\n\nDescription:\n${problem.description}\n\nGenerate test cases with input and expected output.`;
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [prompt, null] }),
      signal: AbortSignal.timeout(20000)
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    
    // Parse HF response - for now, fall back to examples
    return null;
  } catch (error) {
    return null;
  }
}

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
    return false;
  }
}

async function main() {
  console.log('=== Test Case Generator ===\n');
  console.log('Generating test cases that work for: JavaScript, Python, Java, C++, Go, Rust, etc.\n');
  
  const maxProblems = parseInt(process.env.MAX_PROBLEMS || '300', 10);
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, maxProblems);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Progress... (updated: ${updated}, skipped: ${skipped})`);
        }
        continue;
      }
      
      let testCases = [];
      let hiddenTestCases = [];
      let source = 'examples';
      
      if (USE_HF_API) {
        const hfResult = await tryHuggingFaceAPI(problem);
        if (hfResult && hfResult.testCases && hfResult.testCases.length > 0) {
          testCases = hfResult.testCases;
          hiddenTestCases = hfResult.hiddenTestCases || [];
          source = 'hf';
        }
      }
      
      if (testCases.length === 0) {
        const result = generateTestCasesFromExamples(problem);
        testCases = result.testCases;
        hiddenTestCases = result.hiddenTestCases;
        source = 'examples';
      }
      
      if (testCases.length === 0) {
        errors++;
        continue;
      }
      
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        updated++;
        generated++;
        console.log(`[${processed}/${problemsToProcess.length}] ✓ "${problem.title}" - ${testCases.length} visible, ${hiddenTestCases.length} hidden (${source})`);
      } else {
        errors++;
      }
      
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`✅ Processed: ${processed}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`✨ Generated: ${generated}`);
    console.log(`❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n🎉 Test case generation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});

