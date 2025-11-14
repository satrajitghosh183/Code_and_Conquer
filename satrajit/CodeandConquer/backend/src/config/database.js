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
        return (data || []).map(p => this.mapSupabaseProblem(p));
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
        
        // If problem from Supabase doesn't have test cases or tags, try local fallback
        const needsLocalData = (!problem.testCases || problem.testCases.length === 0) && 
                                (!problem.hiddenTestCases || problem.hiddenTestCases.length === 0);
        const needsTags = !problem.tags || problem.tags.length === 0;
        
        if (needsLocalData || needsTags) {
          const localProblem = await this.getProblemByIdLocal(id);
          if (localProblem) {
            // Merge test cases from local if missing
            if (needsLocalData && localProblem.testCases && localProblem.testCases.length > 0) {
              // Silently merge test cases from local file (don't log warnings)
              problem.testCases = localProblem.testCases;
              problem.hiddenTestCases = localProblem.hiddenTestCases || [];
            }
            
            // Merge tags from local if missing
            if (needsTags && localProblem.tags && localProblem.tags.length > 0) {
              problem.tags = localProblem.tags;
              // Optionally update tags in database for future requests (silently)
              try {
                await this.updateProblemTags(id, localProblem.tags);
              } catch (error) {
                // Silently handle missing table/column errors
                if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
                  // Table or column doesn't exist - skip silently
                } else {
                  // Only log unexpected errors
                  console.warn(`Failed to update tags in database for problem ${id}:`, error.message);
                }
              }
            }
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

  mapSupabaseProblem(data) {
    // Helper function to parse JSON fields
    const parseJsonField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          // Ensure we return an array if it's an array, or wrap in array if it's a single object
          if (Array.isArray(parsed)) {
            return parsed;
          }
          // If it's an object but not an array, check if it's a single test case
          if (typeof parsed === 'object' && parsed !== null) {
            // Check if it has 'input' and 'expectedOutput' properties (test case structure)
            if ('input' in parsed && 'expectedOutput' in parsed) {
              return [parsed]; // Wrap single test case in array
            }
            // Otherwise, return as array
            return Object.keys(parsed).length > 0 ? [parsed] : [];
          }
          return [];
        } catch (e) {
          console.warn('Failed to parse JSON field:', e.message, 'Field:', field);
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
      hints: parseJsonField(data.hints),
      isPremium: data.is_premium || false,
      createdBy: data.created_by,
      testCases: parseJsonField(data.test_cases),
      hiddenTestCases: parseJsonField(data.hidden_test_cases),
      tags: tags, // Ensure tags are always an array
      constraints: parseJsonField(data.constraints),
      examples: parseJsonField(data.examples),
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
