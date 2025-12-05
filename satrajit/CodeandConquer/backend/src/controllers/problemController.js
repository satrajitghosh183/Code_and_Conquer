import database from '../config/database.js';
import { Problem } from '../models/Problem.js';

// Helper to check if a problem has valid test cases
const checkHasTestCases = (problem) => {
  const visibleTestCases = problem.testCases && Array.isArray(problem.testCases) ? problem.testCases : [];
  const hiddenTestCases = problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) ? problem.hiddenTestCases : [];
  
  // A problem is runnable if it has at least one valid test case with input and expectedOutput
  const hasValidVisible = visibleTestCases.some(tc => 
    tc && (tc.input !== undefined || tc.expectedOutput !== undefined)
  );
  const hasValidHidden = hiddenTestCases.some(tc => 
    tc && (tc.input !== undefined || tc.expectedOutput !== undefined)
  );
  
  return {
    hasTestCases: hasValidVisible || hasValidHidden,
    visibleCount: visibleTestCases.length,
    hiddenCount: hiddenTestCases.length,
    totalCount: visibleTestCases.length + hiddenTestCases.length
  };
};

export const getAllProblems = async (req, res) => {
  try {
    const { difficulty, category, isPremium, runnableOnly } = req.query;
    const filters = {};
    if (difficulty) filters.difficulty = difficulty;
    if (category) filters.category = category;
    if (isPremium !== undefined) filters.isPremium = isPremium === 'true';

    let problems = await database.getAllProblems(filters);
    
    // Add hasTestCases flag to each problem
    problems = problems.map(p => {
      const testCaseInfo = checkHasTestCases(p);
      return { ...p, ...testCaseInfo };
    });
    
    // Filter to only runnable problems if requested (default: false to show all problems)
    // Only filter if explicitly requested with runnableOnly=true
    if (runnableOnly === 'true') {
      problems = problems.filter(p => p.hasTestCases);
    }
    
    // Sort problems: by difficulty (easy, medium, hard), then by displayId/created_at
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    const sorted = problems.sort((a, b) => {
      // First priority: difficulty
      const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || 99;
      const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || 99;
      if (diffA !== diffB) return diffA - diffB;
      
      // Second priority: created_at (oldest first)
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      
      // Fallback to ID comparison
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idA - idB;
    });
    
    // Assign sequential display IDs (1, 2, 3, ...) based on sorted order
    const sanitized = sorted.map((p, index) => {
      const displayId = p.problemNumber || p.problem_number || (index + 1);
      
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description?.substring(0, 300) + (p.description?.length > 300 ? '...' : ''), // Truncate for list
        difficulty: p.difficulty,
        category: p.category,
        displayId: displayId,
        problemNumber: displayId,
        hasTestCases: p.hasTestCases,
        testCaseCount: p.totalCount,
        tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []),
        isPremium: p.isPremium || false,
        xpReward: p.xpReward || 0,
        // Include first 2 test cases for preview (input only, not answers)
        sampleTestCases: p.testCases && Array.isArray(p.testCases) 
          ? p.testCases.slice(0, 2).map(tc => ({ input: tc.input }))
          : []
      };
    });
    
    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const { includeHidden } = req.query;
    const problem = await database.getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Check test cases availability
    const testCaseInfo = checkHasTestCases(problem);
    
    // Get display ID (simplified - just use problem number if available)
    const displayId = problem.problemNumber || problem.problem_number || null;
    
    // For submissions (includeHidden=true), return all test cases
    if (includeHidden === 'true') {
      res.json({
        ...problem,
        displayId,
        problemNumber: displayId,
        ...testCaseInfo
      });
    } else {
      // Return sanitized problem for frontend
      const testCasesArray = Array.isArray(problem.testCases) ? problem.testCases : [];
      
      const sanitized = {
        id: problem.id,
        title: problem.title,
        slug: problem.slug,
        description: problem.description,
        difficulty: problem.difficulty,
        category: problem.category,
        displayId,
        problemNumber: displayId,
        hasTestCases: testCaseInfo.hasTestCases,
        testCaseCount: testCaseInfo.totalCount,
        testCases: testCasesArray,
        hiddenTestCaseCount: testCaseInfo.hiddenCount,
        tags: Array.isArray(problem.tags) ? problem.tags : (problem.tags ? [problem.tags] : []),
        hints: problem.hints || [],
        constraints: problem.constraints || [],
        starterCode: problem.starterCode || {},
        xpReward: problem.xpReward || 0,
        timeLimitMs: problem.timeLimitMs || 5000,
        memoryLimitMb: problem.memoryLimitMb || 256,
        isPremium: problem.isPremium || false
      };
      
      res.json(sanitized);
    }
  } catch (error) {
    console.error('Error fetching problem by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createProblem = async (req, res) => {
  try {
    const problem = new Problem(req.body);
    const created = await database.createProblem(problem.toJSON());
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProblemTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    // Get the problem first
    const problem = await database.getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Update tags in database
    const updated = await database.updateProblemTags(id, tags);
    
    // Compute displayId for the updated problem
    const allProblems = await database.getAllProblems({});
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    const sorted = allProblems.sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || 99;
      const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || 99;
      if (diffA !== diffB) return diffA - diffB;
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      const idA = parseInt(a.id) || (a.id ? String(a.id).charCodeAt(0) : 0);
      const idB = parseInt(b.id) || (b.id ? String(b.id).charCodeAt(0) : 0);
      if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    
    const problemIndex = sorted.findIndex(p => p.id === updated.id);
    const displayId = updated.problemNumber || updated.problem_number || (problemIndex >= 0 ? problemIndex + 1 : null);
    
    res.json({
      ...updated,
      displayId: displayId,
      problemNumber: displayId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncProblemTags = async (req, res) => {
  try {
    const fs = (await import('fs-extra')).default;
    const pathModule = await import('path');
    const { fileURLToPath } = await import('url');
    const path = pathModule.default;
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const PROBLEMS_DIR = path.join(__dirname, '../../../data/problems');
    
    // Get all local problem files
    const files = await fs.readdir(PROBLEMS_DIR);
    const problemFiles = files.filter(f => f.endsWith('.json'));
    
    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const errors = [];
    const syncedProblems = [];
    
    for (const file of problemFiles) {
      try {
        const filePath = path.join(PROBLEMS_DIR, file);
        const problemData = await fs.readJson(filePath);
        
        const problemId = problemData.id;
        const tags = Array.isArray(problemData.tags) ? problemData.tags : [];
        
        if (!problemId) {
          skipped++;
          continue;
        }
        
        // Check if problem exists in database
        const existingProblem = await database.getProblemById(problemId);
        
        if (!existingProblem) {
          skipped++;
          continue;
        }
        
        // Update tags in database (even if empty, to ensure consistency)
        await database.updateProblemTags(problemId, tags);
        synced++;
        syncedProblems.push({ id: problemId, title: problemData.title, tags });
      } catch (error) {
        errors.push({ file, error: error.message });
        failed++;
      }
    }
    
    res.json({
      success: true,
      synced,
      skipped,
      failed,
      total: problemFiles.length,
      syncedProblems: syncedProblems.slice(0, 20), // Show first 20 synced problems
      errors: errors.slice(0, 10) // Limit errors to first 10
    });
  } catch (error) {
    console.error('Error syncing problem tags:', error);
    res.status(500).json({ error: error.message });
  }
};

