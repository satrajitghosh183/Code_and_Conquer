import database from '../config/database.js';
import { Problem } from '../models/Problem.js';

export const getAllProblems = async (req, res) => {
  try {
    const { difficulty, category, isPremium } = req.query;
    const filters = {};
    if (difficulty) filters.difficulty = difficulty;
    if (category) filters.category = category;
    if (isPremium !== undefined) filters.isPremium = isPremium === 'true';

    const problems = await database.getAllProblems(filters);
    
    // Sort problems: first by difficulty (easy, medium, hard), then by created_at (or id if available)
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    const sorted = problems.sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || 99;
      const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || 99;
      if (diffA !== diffB) return diffA - diffB;
      
      // If same difficulty, sort by created_at (oldest first) or by id if it's numeric
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      
      // Try to parse IDs as numbers
      const idA = parseInt(a.id) || (a.id ? String(a.id).charCodeAt(0) : 0);
      const idB = parseInt(b.id) || (b.id ? String(b.id).charCodeAt(0) : 0);
      if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
      
      // Fallback to string comparison
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    
    // Assign sequential display IDs (1, 2, 3, ...) based on sorted order
    const sanitized = sorted.map((p, index) => {
      // Use problem_number from database if available, otherwise compute from index
      const displayId = p.problemNumber || p.problem_number || (index + 1);
      
      return {
        ...p,
        displayId: displayId, // Sequential display ID (1, 2, 3, ...)
        problemNumber: displayId, // Also include as problemNumber for compatibility
        hiddenTestCases: undefined,
        testCases: p.testCases?.slice(0, 3),
        // Ensure tags are always an array
        tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : [])
      };
    });
    
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const { includeHidden } = req.query; // Allow fetching with hidden test cases for submissions
    const problem = await database.getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Get all problems to compute displayId
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
    
    // Find the index of this problem in the sorted list
    const problemIndex = sorted.findIndex(p => p.id === problem.id);
    const displayId = problem.problemNumber || problem.problem_number || (problemIndex >= 0 ? problemIndex + 1 : null);
    
    // For frontend display, sanitize test cases
    // For submissions (includeHidden=true), return all test cases
    if (includeHidden === 'true') {
      // Return full problem with all test cases (used by submission controller)
      res.json({
        ...problem,
        displayId: displayId,
        problemNumber: displayId
      });
    } else {
      // Return sanitized problem (used by frontend)
      const sanitized = {
        ...problem,
        displayId: displayId,
        problemNumber: displayId,
        hiddenTestCases: undefined,
        testCases: problem.testCases || [], // Return all visible test cases, not just first 3
        // Ensure tags are always an array
        tags: Array.isArray(problem.tags) ? problem.tags : (problem.tags ? [problem.tags] : [])
      };
      res.json(sanitized);
    }
  } catch (error) {
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

