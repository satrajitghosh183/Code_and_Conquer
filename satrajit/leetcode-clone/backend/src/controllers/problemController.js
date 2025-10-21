import database from '../config/database.js';
import { Problem } from '../models/Problem.js';

export const getAllProblems = async (req, res) => {
  try {
    const problems = await database.getAllProblems();
    // Don't send hidden test cases to frontend
    const sanitized = problems.map(p => ({
      ...p,
      hiddenTestCases: undefined,
      testCases: p.testCases?.slice(0, 3) // Only show first 3 test cases
    }));
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const problem = await database.getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    // Don't send hidden test cases
    const sanitized = {
      ...problem,
      hiddenTestCases: undefined,
      testCases: problem.testCases?.slice(0, 3)
    };
    res.json(sanitized);
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