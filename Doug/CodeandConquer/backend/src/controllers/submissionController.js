import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import { Submission } from '../models/Problem.js';
import executorService from '../services/executorService.js';
import publicDatabaseService from '../services/publicDatabaseService.js';

export const submitCode = async (req, res) => {
  try {
    const { problemId, code, language, userId } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'problemId, code, and language are required'
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'User ID is required for submissions'
      });
    }

    // Get problem with ALL test cases (including hidden) for submission
    const problem = await database.getProblemById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Combine visible and hidden test cases
    const visibleTestCases = Array.isArray(problem.testCases) ? problem.testCases : [];
    const hiddenTestCases = Array.isArray(problem.hiddenTestCases) ? problem.hiddenTestCases : [];
    const allTestCases = [...visibleTestCases, ...hiddenTestCases];

    // Ensure we have test cases
    if (allTestCases.length === 0) {
      return res.status(400).json({ 
        error: 'No test cases available for this problem',
        details: 'This problem does not have any test cases configured'
      });
    }

    // Run test cases first
    const testResults = await executorService.runTestCases(
      code,
      language,
      allTestCases
    );

    // Analyze complexity
    const complexityAnalysis = await executorService.analyzeTimeComplexity(
      code,
      language,
      allTestCases
    ).catch(error => {
      console.warn('Complexity analysis failed:', error);
      return null; // Don't fail submission if complexity analysis fails
    });

    // Create submission with results
    const submission = new Submission({
      id: uuidv4(),
      problemId,
      userId: userId,
      code,
      language,
      status: testResults.allPassed ? 'accepted' : 'wrong_answer',
      timestamp: new Date().toISOString(),
      testResults: testResults.results || [],
      executionTime: testResults.totalExecutionTime || 0,
      memory: testResults.maxMemory || 0,
      complexityAnalysis: complexityAnalysis,
      testCasesPassed: testResults.passedTests || 0,
      testCasesTotal: testResults.totalTests || allTestCases.length
    });

    // Save submission to database (database.createSubmission handles complexity_analysis column gracefully)
    await database.createSubmission(submission.toJSON());

    // Calculate rewards
    const rewards = calculateRewards(problem.difficulty, testResults.allPassed, complexityAnalysis);

    // Update user stats if submission was accepted
    if (testResults.allPassed && publicDatabaseService.isAvailable()) {
      try {
        await updateUserStats(userId, rewards, problem.difficulty);
        await updateLeaderboard(userId, rewards);
      } catch (error) {
        console.error('Error updating user stats or leaderboard:', error);
        // Don't fail the submission if stats update fails
      }
    }

    // Format test results for frontend
    const formattedTestResults = (testResults.results || []).map((result, idx) => ({
      testCase: idx + 1,
      passed: result.passed || false,
      input: result.input,
      expectedOutput: result.expectedOutput,
      actualOutput: result.actualOutput,
      error: result.error,
      executionTime: result.executionTime
    }));

    res.json({
      id: submission.id,
      status: submission.status,
      passedTests: testResults.passedTests || 0,
      totalTests: testResults.totalTests || allTestCases.length,
      executionTime: submission.executionTime || 0,
      memory: submission.memory || 0,
      testResults: formattedTestResults,
      complexityAnalysis: complexityAnalysis || null,
      expectedComplexity: problem.timeComplexity || null,
      rewards: rewards || { coins: 0, xp: 0, powerUps: [] }
    });
  } catch (error) {
    console.error('Submission error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const { code, language, problemId } = req.body;

    if (!code || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'code and language are required'
      });
    }

    if (problemId) {
      const problem = await database.getProblemById(problemId);
      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Get visible test cases only for run (not hidden test cases)
      const visibleTestCases = Array.isArray(problem.testCases) && problem.testCases.length > 0
        ? problem.testCases
        : [];
      
      if (visibleTestCases.length === 0) {
        console.error(`Problem ${problemId} has no visible test cases. Problem data:`, {
          hasTestCases: !!problem.testCases,
          testCasesLength: problem.testCases?.length || 0,
          testCases: problem.testCases
        });
        return res.status(400).json({ 
          error: 'No test cases available for this problem',
          details: 'This problem does not have any visible test cases configured. Please contact support if this is unexpected.'
        });
      }

      console.log(`Running code with ${visibleTestCases.length} visible test cases for problem ${problemId}`);

      const testResults = await executorService.runTestCases(
        code,
        language,
        visibleTestCases
      );

      // Use visible test cases for complexity analysis (not hidden ones)
      const complexityAnalysis = await executorService.analyzeTimeComplexity(
        code,
        language,
        visibleTestCases
      ).catch(error => {
        console.warn('Complexity analysis failed during run:', error);
        return null; // Don't fail run if complexity analysis fails
      });

      return res.json({
        status: testResults.allPassed ? 'run_success' : 'run_failed',
        passedTests: testResults.passedTests,
        totalTests: testResults.totalTests,
        executionTime: testResults.totalExecutionTime,
        memory: testResults.maxMemory,
        testResults: testResults.results,
        complexityAnalysis: complexityAnalysis || null,
        expectedComplexity: problem.timeComplexity || null
      });
    }

    const { testCase } = req.body;
    if (!testCase) {
      return res.status(400).json({ error: 'Missing test case or problem ID' });
    }

    const result = await executorService.executeCode(code, language, testCase);
    
    res.json({
      status: result.success ? 'run_success' : 'run_error',
      ...result
    });
  } catch (error) {
    console.error('Run code error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

function calculateRewards(difficulty, passed, complexityAnalysis) {
  if (!passed) {
    return { coins: 0, xp: 0, powerUps: [] };
  }

  const baseRewards = {
    easy: { coins: 50, xp: 10 },
    medium: { coins: 150, xp: 30 },
    hard: { coins: 300, xp: 60 }
  };

  const base = baseRewards[difficulty] || baseRewards.easy;
  let coins = base.coins;
  let xp = base.xp;
  const powerUps = [];

  // Bonus for optimal complexity
  if (complexityAnalysis && complexityAnalysis.confidence > 0.7) {
    coins += Math.floor(base.coins * 0.2);
    xp += Math.floor(base.xp * 0.2);
  }

  // Random power-up chance (30%)
  if (Math.random() < 0.3) {
    const powerUpTypes = ['damage_boost', 'range_boost', 'speed_boost', 'health_boost'];
    powerUps.push({
      type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
      value: 1.2,
      duration: 300 // 5 minutes
    });
  }

  return { coins, xp, powerUps };
}

// Update user stats after successful submission
async function updateUserStats(userId, rewards, difficulty) {
  try {
    // Get current user stats from user_stats table or user_progress
    const supabase = database.getSupabaseClient();
    if (!supabase) return;

    // Try to get from user_stats table first
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userStats) {
      // Update existing stats
      const updates = {
        coins: (userStats.coins || 0) + (rewards.coins || 0),
        xp: (userStats.xp || 0) + (rewards.xp || 0),
        problems_solved: (userStats.problems_solved || 0) + 1,
        level: Math.floor(((userStats.xp || 0) + (rewards.xp || 0)) / 100) + 1,
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', userId);
    } else {
      // Create new stats entry
      await supabase
        .from('user_stats')
        .insert([{
          user_id: userId,
          coins: rewards.coins || 0,
          xp: rewards.xp || 0,
          level: Math.floor((rewards.xp || 0) / 100) + 1,
          problems_solved: 1,
          games_played: 0,
          wins: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
    }

    // Also update user_progress table if it exists
    try {
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userProgress) {
        await supabase
          .from('user_progress')
          .update({
            total_xp: (userProgress.total_xp || 0) + (rewards.xp || 0),
            coding_level: Math.floor(((userProgress.total_xp || 0) + (rewards.xp || 0)) / 100) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_progress')
          .insert([{
            user_id: userId,
            total_xp: rewards.xp || 0,
            coding_level: Math.floor((rewards.xp || 0) / 100) + 1,
            current_rank: 'bronze',
            rank_level: 1,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }
    } catch (error) {
      // user_progress table might not exist, that's ok
      console.warn('Could not update user_progress:', error.message);
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

// Update leaderboard after successful submission
async function updateLeaderboard(userId, rewards) {
  try {
    if (!publicDatabaseService.isAvailable()) return;

    // Get user stats to calculate leaderboard score
    const supabase = database.getSupabaseClient();
    if (!supabase) return;

    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!userStats) return;

    // Calculate leaderboard score (XP + problems solved * 10)
    const score = (userStats.xp || 0) + ((userStats.problems_solved || 0) * 10);

    // Update global leaderboard
    await publicDatabaseService.updateLeaderboard(userId, 'global', score);

    // Update weekly leaderboard (if we want to track it)
    // For now, just update global
  } catch (error) {
    // Silently handle missing table/column errors
    if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
      // Table or column doesn't exist - skip silently
      return;
    }
    // Only log unexpected errors
    console.error('Error updating leaderboard:', error);
    // Don't throw - leaderboard update failure shouldn't break submission
  }
}

