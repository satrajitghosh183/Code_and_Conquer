import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import { Submission } from '../models/Problem.js';
import executorService from '../services/executorService.js';

export const submitCode = async (req, res) => {
  try {
    const { problemId, code, language } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get problem with ALL test cases
    const problem = await database.getProblemById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Combine visible and hidden test cases
    const allTestCases = [
      ...(problem.testCases || []),
      ...(problem.hiddenTestCases || [])
    ];

    // Create submission
    const submission = new Submission({
      id: uuidv4(),
      problemId,
      code,
      language,
      status: 'pending',
      timestamp: new Date().toISOString()
    });

    await database.createSubmission(submission.toJSON());

    // Execute test cases
    const testResults = await executorService.runTestCases(
      code,
      language,
      allTestCases
    );

    // Analyze time complexity
    const complexityAnalysis = await executorService.analyzeTimeComplexity(
      code,
      language,
      allTestCases
    );

    // Update submission
    submission.status = testResults.allPassed ? 'accepted' : 'wrong_answer';
    submission.testResults = testResults.results;
    submission.executionTime = testResults.totalExecutionTime;
    submission.memory = testResults.maxMemory;

    await database.createSubmission(submission.toJSON());

    // Return result (hide some test cases in response)
    res.json({
      id: submission.id,
      status: submission.status,
      passedTests: testResults.passedTests,
      totalTests: testResults.totalTests,
      executionTime: submission.executionTime,
      memory: submission.memory,
      testResults: testResults.results.slice(0, 5), // Only show first 5
      complexityAnalysis,
      expectedComplexity: problem.timeComplexity
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const submission = await database.getSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const runCode = async (req, res) => {
  try {
    const { code, language, testCase } = req.body;

    if (!code || !language || !testCase) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await executorService.executeCode(code, language, testCase);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};