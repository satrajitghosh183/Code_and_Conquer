import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const PROBLEMS_DIR = path.join(DATA_DIR, 'problems');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');

await fs.ensureDir(PROBLEMS_DIR);
await fs.ensureDir(SUBMISSIONS_DIR);

// Initialize Supabase client if credentials are provided
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

class Database {
  constructor() {
    this.type = process.env.DATABASE_TYPE || (supabase ? 'supabase' : 'local');
  }

  // Problems CRUD - Use Supabase if available, otherwise local
  async getAllProblems(filters = {}) {
    if (this.type === 'supabase' && supabase) {
      try {
        let query = supabase
          .from('problems')
          .select('*');

        // Apply filters
        if (filters.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.isPremium !== undefined) {
          query = query.eq('is_premium', filters.isPremium);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map problems and load test cases from local files or Supabase test_cases table
        const mappedProblems = await Promise.all((data || []).map(async (p) => {
          const mapped = this.mapSupabaseProblem(p);
          let hasTestCases = mapped.testCases && mapped.testCases.length > 0;
          
          // 1. Try to load test cases from local files (fastest)
          try {
            const localProblem = await this.getProblemByIdLocal(mapped.id);
            if (localProblem) {
              if (localProblem.testCases && Array.isArray(localProblem.testCases) && localProblem.testCases.length > 0) {
                mapped.testCases = localProblem.testCases;
                hasTestCases = true;
              }
              if (localProblem.hiddenTestCases && Array.isArray(localProblem.hiddenTestCases) && localProblem.hiddenTestCases.length > 0) {
                mapped.hiddenTestCases = localProblem.hiddenTestCases;
              }
            }
          } catch (error) {
            // Silently ignore errors when trying to load local file
          }
          
          // 2. If still no test cases, try Supabase test_cases table
          if (!hasTestCases) {
            try {
              const testCases = await this.getTestCasesFromSupabase(mapped.id);
              if (testCases.visible.length > 0) {
                mapped.testCases = testCases.visible;
              }
              if (testCases.hidden.length > 0) {
                mapped.hiddenTestCases = testCases.hidden;
              }
            } catch (error) {
              // Silently ignore
            }
          }
          
          return mapped;
        }));
        
        return mappedProblems;
      } catch (error) {
        console.error('Error fetching problems from Supabase:', error);
        // Fallback to local
        return this.getAllProblemsLocal();
      }
    }

    // Fallback to local storage
    return this.getAllProblemsLocal();
  }

  async getAllProblemsLocal() {
    const files = await fs.readdir(PROBLEMS_DIR);
    const problems = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const data = await fs.readJson(path.join(PROBLEMS_DIR, file));
          // Ensure tags are always an array for local files
          if (!data.tags || !Array.isArray(data.tags)) {
            // If no tags, use category or empty array
            data.tags = data.category ? [data.category] : [];
          }
          return data;
        })
    );
    // Sort by numeric ID if available, otherwise by filename
    return problems.sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idA - idB;
    });
  }

  async getProblemById(id) {
    if (this.type === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('problems')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Problem not found in Supabase, try local fallback
            return this.getProblemByIdLocal(id);
          }
          throw error;
        }
        
        const problem = this.mapSupabaseProblem(data);
        
        // Try to load test cases from multiple sources (in priority order):
        // 1. Local files (fastest, always up to date)
        // 2. Supabase test_cases table
        
        let hasTestCases = problem.testCases && problem.testCases.length > 0;
        
        // 1. Try local files first
        const localProblem = await this.getProblemByIdLocal(id);
        if (localProblem) {
          if (localProblem.testCases && Array.isArray(localProblem.testCases) && localProblem.testCases.length > 0) {
            problem.testCases = localProblem.testCases;
            hasTestCases = true;
          }
          if (localProblem.hiddenTestCases && Array.isArray(localProblem.hiddenTestCases) && localProblem.hiddenTestCases.length > 0) {
            problem.hiddenTestCases = localProblem.hiddenTestCases;
          }
          if ((!problem.tags || problem.tags.length === 0) && localProblem.tags && localProblem.tags.length > 0) {
            problem.tags = localProblem.tags;
          }
        }
        
        // 2. If still no test cases, try Supabase test_cases table
        if (!hasTestCases) {
          const testCases = await this.getTestCasesFromSupabase(id);
          if (testCases.visible.length > 0) {
            problem.testCases = testCases.visible;
          }
          if (testCases.hidden.length > 0) {
            problem.hiddenTestCases = testCases.hidden;
          }
        }
        
        return problem;
      } catch (error) {
        console.error('Error fetching problem from Supabase:', error);
        // Fallback to local
        return this.getProblemByIdLocal(id);
      }
    }

    // Fallback to local storage
    return this.getProblemByIdLocal(id);
  }
  
  // Fetch test cases from the Supabase test_cases table
  async getTestCasesFromSupabase(problemId) {
    if (!supabase) return { visible: [], hidden: [] };
    
    try {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problemId);
      
      if (error || !data) {
        return { visible: [], hidden: [] };
      }
      
      const visible = [];
      const hidden = [];
      
      for (const tc of data) {
        const testCase = {
          input: tc.input,
          expectedOutput: tc.expected_output,
          explanation: tc.explanation
        };
        
        if (tc.is_hidden) {
          hidden.push(testCase);
        } else {
          visible.push(testCase);
        }
      }
      
      return { visible, hidden };
    } catch (error) {
      console.error('Error fetching test cases from Supabase:', error);
      return { visible: [], hidden: [] };
    }
  }

  async getProblemByIdLocal(id) {
    const filePath = path.join(PROBLEMS_DIR, `${id}.json`);
    if (await fs.pathExists(filePath)) {
      const problem = await fs.readJson(filePath);
      // Ensure tags are always an array for local files
      if (!problem.tags || !Array.isArray(problem.tags)) {
        // If no tags, use category or empty array
        problem.tags = problem.category ? [problem.category] : [];
      }
      return problem;
    }
    return null;
  }

  async createProblem(problem) {
    if (this.type === 'supabase' && supabase) {
      try {
        // Get test cases from separate table or include in problem
        const { testCases, hiddenTestCases, ...problemData } = problem;
        
        const problemPayload = {
          id: problem.id,
          title: problem.title,
          slug: problem.slug || problem.title.toLowerCase().replace(/\s+/g, '-'),
          description: problem.description,
          difficulty: problem.difficulty,
          category: problem.category || 'algorithm',
          xp_reward: problem.xpReward || (problem.difficulty === 'easy' ? 10 : problem.difficulty === 'medium' ? 30 : 60),
          time_limit_ms: problem.timeLimitMs || 5000,
          memory_limit_mb: problem.memoryLimitMb || 256,
          starter_code: typeof problem.starterCode === 'object' ? JSON.stringify(problem.starterCode) : (problem.starterCode || '{}'),
          solution_code: problem.solutionCode || '',
          hints: Array.isArray(problem.hints) ? JSON.stringify(problem.hints) : (problem.hints || '[]'),
          is_premium: problem.isPremium || false,
          created_by: problem.createdBy || null,
          test_cases: Array.isArray(testCases) ? JSON.stringify(testCases) : (testCases || '[]'),
          hidden_test_cases: Array.isArray(hiddenTestCases) ? JSON.stringify(hiddenTestCases) : (hiddenTestCases || '[]'),
          tags: Array.isArray(problem.tags) ? JSON.stringify(problem.tags) : (problem.tags || '[]'),
          constraints: Array.isArray(problem.constraints) ? JSON.stringify(problem.constraints) : (problem.constraints || '[]'),
          examples: Array.isArray(problem.examples) ? JSON.stringify(problem.examples) : (problem.examples || '[]'),
          time_complexity: problem.timeComplexity || null,
          space_complexity: problem.spaceComplexity || null,
        };

        const { data, error } = await supabase
          .from('problems')
          .insert([problemPayload])
          .select()
          .single();

        if (error) throw error;
        return this.mapSupabaseProblem(data);
      } catch (error) {
        console.error('Error creating problem in Supabase:', error);
        // Fallback to local
        return this.createProblemLocal(problem);
      }
    }

    // Fallback to local storage
    return this.createProblemLocal(problem);
  }

  async createProblemLocal(problem) {
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    await fs.writeJson(filePath, problem, { spaces: 2 });
    return problem;
  }

  async updateProblemTags(problemId, tags) {
    if (this.type === 'supabase' && supabase) {
      try {
        // Update tags in Supabase
        const { data, error } = await supabase
          .from('problems')
          .update({
            tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
            updated_at: new Date().toISOString()
          })
          .eq('id', problemId)
          .select()
          .single();

        if (error) throw error;
        return this.mapSupabaseProblem(data);
      } catch (error) {
        console.error('Error updating problem tags in Supabase:', error);
        // Fallback to local
        return this.updateProblemTagsLocal(problemId, tags);
      }
    }

    // Fallback to local storage
    return this.updateProblemTagsLocal(problemId, tags);
  }

  async updateProblemTagsLocal(problemId, tags) {
    const filePath = path.join(PROBLEMS_DIR, `${problemId}.json`);
    if (await fs.pathExists(filePath)) {
      const problem = await fs.readJson(filePath);
      problem.tags = Array.isArray(tags) ? tags : [];
      problem.updatedAt = new Date().toISOString();
      await fs.writeJson(filePath, problem, { spaces: 2 });
      return problem;
    }
    throw new Error('Problem not found');
  }

  async updateProblem(problemId, updates) {
    if (this.type === 'supabase' && supabase) {
      try {
        const { testCases, hiddenTestCases, ...otherUpdates } = updates;
        
        const updatePayload = {
          ...otherUpdates,
          updated_at: new Date().toISOString()
        };
        
        // Handle test cases if provided
        // Note: If columns don't exist, we'll gracefully fall back to local storage
        if (testCases !== undefined) {
          const testCasesArray = Array.isArray(testCases) ? testCases : [];
          const hiddenTestCasesArray = Array.isArray(hiddenTestCases) ? hiddenTestCases : [];
          
          // Combine all test cases into test_cases field (if column exists)
          // If it doesn't exist, the error will be caught and we'll fall back to local
          updatePayload.test_cases = JSON.stringify([...testCasesArray, ...hiddenTestCasesArray]);
        }
        
        const { data, error } = await supabase
          .from('problems')
          .update(updatePayload)
          .eq('id', problemId)
          .select()
          .single();

        // Handle PGRST204 (column not found) silently - fall back to local
        if (error) {
          if (error.code === 'PGRST204') {
            // Column doesn't exist - silently fall back to local
            return this.updateProblemLocal(problemId, updates);
          }
          throw error;
        }
        return this.mapSupabaseProblem(data);
      } catch (error) {
        // Only log non-PGRST204 errors
        if (error.code !== 'PGRST204') {
          console.error('Error updating problem in Supabase:', error);
        }
        // Fallback to local
        return this.updateProblemLocal(problemId, updates);
      }
    }

    return this.updateProblemLocal(problemId, updates);
  }

  async updateProblemLocal(problemId, updates) {
    const filePath = path.join(PROBLEMS_DIR, `${problemId}.json`);
    if (await fs.pathExists(filePath)) {
      const problem = await fs.readJson(filePath);
      Object.assign(problem, updates);
      problem.updatedAt = new Date().toISOString();
      await fs.writeJson(filePath, problem, { spaces: 2 });
      return problem;
    }
    // If file doesn't exist, create it with the updates
    const newProblem = { id: problemId, ...updates, updatedAt: new Date().toISOString() };
    await fs.writeJson(filePath, newProblem, { spaces: 2 });
    return newProblem;
  }

  mapSupabaseProblem(data) {
    // Helper function to parse JSON fields
    const parseJsonField = (field, fieldName = 'unknown') => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        // Check if it's an empty string or just whitespace
        if (field.trim() === '' || field.trim() === 'null' || field.trim() === '[]') {
          return [];
        }
        try {
          const parsed = JSON.parse(field);
          // Ensure we return an array if it's an array, or wrap in array if it's a single object
          if (Array.isArray(parsed)) {
            return parsed.length > 0 ? parsed : [];
          }
          // If it's an object but not an array, check if it's a single test case
          if (typeof parsed === 'object' && parsed !== null) {
            // Check if it has 'input' and 'expectedOutput' properties (test case structure)
            if ('input' in parsed && 'expectedOutput' in parsed) {
              return [parsed]; // Wrap single test case in array
            }
            // Check if it's an object with numeric keys (like {0: {...}, 1: {...}})
            const keys = Object.keys(parsed);
            if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
              return Object.values(parsed).filter(v => v !== null && v !== undefined);
            }
            // Otherwise, return as array if it has content
            return Object.keys(parsed).length > 0 ? [parsed] : [];
          }
          return [];
        } catch (e) {
          // Only log if it's not an empty/null value
          if (field && field.trim() !== '' && field.trim() !== 'null') {
            console.warn(`Failed to parse JSON field "${fieldName}":`, e.message, 'Value:', field.substring(0, 100));
          }
          return [];
        }
      }
      return Array.isArray(field) ? field : [];
    };

    const parseObjectField = (field) => {
      if (!field) return {};
      if (typeof field === 'object') return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch (e) {
          return {};
        }
      }
      return field;
    };

    // Parse tags - handle both string arrays and JSON arrays
    let tags = parseJsonField(data.tags);
    // If tags is empty but we have category, use category as a tag
    if ((!tags || tags.length === 0) && data.category) {
      tags = [data.category];
    }
    
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      difficulty: data.difficulty,
      category: data.category,
      xpReward: data.xp_reward,
      timeLimitMs: data.time_limit_ms,
      memoryLimitMb: data.memory_limit_mb,
      starterCode: parseObjectField(data.starter_code),
      solutionCode: data.solution_code || '',
      hints: parseJsonField(data.hints, 'hints'),
      isPremium: data.is_premium || false,
      createdBy: data.created_by,
      testCases: parseJsonField(data.test_cases || data.testCases, 'test_cases'),
      hiddenTestCases: parseJsonField(data.hidden_test_cases || data.hiddenTestCases, 'hidden_test_cases'),
      tags: tags, // Ensure tags are always an array
      constraints: parseJsonField(data.constraints, 'constraints'),
      examples: parseJsonField(data.examples, 'examples'),
      timeComplexity: data.time_complexity,
      spaceComplexity: data.space_complexity,
      problemNumber: data.problem_number || null, // Support problem_number column if it exists
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Submissions CRUD - Use Supabase if available, otherwise local
  async createSubmission(submission) {
    if (this.type === 'supabase' && supabase) {
      try {
        // Store complexity_analysis in test_results JSON if column doesn't exist
        // First try with complexity_analysis column
        let submissionPayload = {
          id: submission.id,
          problem_id: submission.problemId,
          user_id: submission.userId,
          code: submission.code,
          language: submission.language,
          verdict: submission.status || submission.verdict || 'pending',
          test_results: Array.isArray(submission.testResults) 
            ? JSON.stringify(submission.testResults) 
            : (typeof submission.testResults === 'string' ? submission.testResults : JSON.stringify([])),
          execution_time_ms: submission.executionTime || submission.executionTimeMs || 0,
          memory_used_mb: submission.memory || submission.memoryUsedMb || 0,
          test_cases_passed: submission.testCasesPassed || (submission.testResults ? (Array.isArray(submission.testResults) ? submission.testResults.filter(r => r.passed).length : 0) : 0),
          test_cases_total: submission.testCasesTotal || (submission.testResults ? (Array.isArray(submission.testResults) ? submission.testResults.length : 0) : 0),
          score: submission.score || null,
          submitted_at: submission.timestamp || new Date().toISOString()
        };

        // Try to include complexity_analysis if it exists, but don't fail if column doesn't exist
        if (submission.complexityAnalysis) {
          // Store complexity analysis in test_results JSON as metadata
          const testResultsWithComplexity = Array.isArray(submission.testResults) 
            ? submission.testResults 
            : (typeof submission.testResults === 'string' ? JSON.parse(submission.testResults) : []);
          
          // Add complexity analysis as metadata in test_results
          submissionPayload.test_results = JSON.stringify({
            results: testResultsWithComplexity,
            complexityAnalysis: submission.complexityAnalysis
          });
        }

        const { data, error } = await supabase
          .from('submissions')
          .insert([submissionPayload])
          .select()
          .single();

        if (error) {
          // If it's a column error, try without complexity_analysis column
          if (error.message && error.message.includes('complexity_analysis')) {
            console.warn('complexity_analysis column not found, storing in test_results JSON');
            // Complexity analysis is already stored in test_results JSON above
            // Just remove it from the payload if it was added as a column
            delete submissionPayload.complexity_analysis;
            
            // Retry without complexity_analysis column
            const { data: retryData, error: retryError } = await supabase
              .from('submissions')
              .insert([submissionPayload])
              .select()
              .single();
            
            if (retryError) throw retryError;
            return this.mapSupabaseSubmission(retryData);
          }
          throw error;
        }
        return this.mapSupabaseSubmission(data);
      } catch (error) {
        console.error('Error creating submission in Supabase:', error);
        // Fallback to local if it's a table error
        if (error.code === '42P01') {
          console.warn('Submissions table does not exist, falling back to local storage');
          return this.createSubmissionLocal(submission);
        }
        // For other errors, still try local fallback
        console.warn('Falling back to local storage due to error:', error.message);
        return this.createSubmissionLocal(submission);
      }
    }

    // Fallback to local storage
    return this.createSubmissionLocal(submission);
  }

  async createSubmissionLocal(submission) {
    const filePath = path.join(SUBMISSIONS_DIR, `${submission.id}.json`);
    await fs.writeJson(filePath, submission, { spaces: 2 });
    return submission;
  }

  async getSubmissionById(id) {
    if (this.type === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          if (error.code === '42P01') {
            // Table doesn't exist, fallback to local
            return this.getSubmissionByIdLocal(id);
          }
          throw error;
        }
        return this.mapSupabaseSubmission(data);
      } catch (error) {
        console.error('Error fetching submission from Supabase:', error);
        return null;
      }
    }

    // Fallback to local storage
    return this.getSubmissionByIdLocal(id);
  }

  async getSubmissionByIdLocal(id) {
    const filePath = path.join(SUBMISSIONS_DIR, `${id}.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  }

  async getSubmissionsByProblem(problemId, limit = 10) {
    if (this.type === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('problem_id', problemId)
          .order('submitted_at', { ascending: false })
          .limit(limit);

        if (error) {
          if (error.code === '42P01') return []; // Table doesn't exist
          throw error;
        }
        return (data || []).map(s => this.mapSupabaseSubmission(s));
      } catch (error) {
        console.error('Error fetching submissions from Supabase:', error);
        return [];
      }
    }

    const files = await fs.readdir(SUBMISSIONS_DIR);
    const submissions = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const data = await fs.readJson(path.join(SUBMISSIONS_DIR, file));
          return data;
        })
    );
    return submissions
      .filter(s => s.problemId === problemId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getSubmissionsByUser(userId, limit = 10) {
    if (this.type === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .order('submitted_at', { ascending: false })
          .limit(limit);

        if (error) {
          if (error.code === '42P01') return []; // Table doesn't exist
          throw error;
        }
        return (data || []).map(s => this.mapSupabaseSubmission(s));
      } catch (error) {
        console.error('Error fetching user submissions from Supabase:', error);
        return [];
      }
    }

    const files = await fs.readdir(SUBMISSIONS_DIR);
    const submissions = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const data = await fs.readJson(path.join(SUBMISSIONS_DIR, file));
          return data;
        })
    );
    return submissions
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  mapSupabaseSubmission(data) {
    // Parse test_results JSON field
    let testResults = [];
    let complexityAnalysis = null;
    
    if (data.test_results) {
      try {
        if (typeof data.test_results === 'string') {
          const parsed = JSON.parse(data.test_results);
          // Check if complexity analysis is stored in test_results JSON
          if (parsed.complexityAnalysis) {
            complexityAnalysis = parsed.complexityAnalysis;
            testResults = parsed.results || parsed;
          } else if (Array.isArray(parsed)) {
            testResults = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Check if it's a single test result object
            if ('input' in parsed || 'expectedOutput' in parsed || 'passed' in parsed) {
              testResults = [parsed];
            } else {
              // Try to extract results array
              testResults = parsed.results || parsed.testResults || [];
            }
          }
        } else if (Array.isArray(data.test_results)) {
          testResults = data.test_results;
        }
      } catch (e) {
        console.warn('Failed to parse test_results:', e.message);
        testResults = [];
      }
    }
    
    // Try to get complexity analysis from column first, then from JSON
    if (data.complexity_analysis) {
      try {
        if (typeof data.complexity_analysis === 'string') {
          complexityAnalysis = JSON.parse(data.complexity_analysis);
        } else if (typeof data.complexity_analysis === 'object') {
          complexityAnalysis = data.complexity_analysis;
        }
      } catch (e) {
        console.warn('Failed to parse complexity_analysis column:', e.message);
      }
    }
    
    return {
      id: data.id,
      problemId: data.problem_id,
      userId: data.user_id,
      code: data.code,
      language: data.language,
      status: data.verdict || data.status,
      verdict: data.verdict || data.status,
      testResults: testResults,
      executionTime: data.execution_time_ms || data.execution_time || 0,
      memory: data.memory_used_mb || data.memory || 0,
      complexityAnalysis: complexityAnalysis, // Use parsed complexity analysis
      testCasesPassed: data.test_cases_passed || 0,
      testCasesTotal: data.test_cases_total || 0,
      score: data.score || null,
      timestamp: data.submitted_at || data.timestamp
    };
  }

  /**
   * Get Supabase client instance
   * @returns {Object|null} Supabase client or null
   */
  getSupabaseClient() {
    return supabase;
  }

  /**
   * Check if Supabase is configured
   * @returns {boolean} True if Supabase is available
   */
  isSupabaseAvailable() {
    return !!supabase;
  }
}

export default new Database();
