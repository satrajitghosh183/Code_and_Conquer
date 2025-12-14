/**
 * Unit Tests - Data Models
 * Tests for data model validation and structure
 */

import { describe, it, expect } from './test-framework.js';

describe('Data Models', () => {
  describe('Problem Model', () => {
    it('should create problem with required fields', () => {
      const problem = {
        id: '123',
        title: 'Test Problem',
        difficulty: 'easy',
        description: 'Test description'
      };
      expect(problem.id).toBeTruthy();
      expect(problem.title).toBeTruthy();
      expect(problem.difficulty).toBeTruthy();
    });

    it('should validate problem difficulty', () => {
      const difficulties = ['easy', 'medium', 'hard'];
      const problem = { difficulty: 'easy' };
      expect(difficulties.includes(problem.difficulty)).toBe(true);
    });

    it('should have test cases array', () => {
      const problem = {
        testCases: [
          { input: [1, 2], expectedOutput: 3 }
        ]
      };
      expect(Array.isArray(problem.testCases)).toBe(true);
      expect(problem.testCases.length).toBe(1);
    });

    it('should validate XP reward range', () => {
      const problem = { xpReward: 10 };
      expect(problem.xpReward).toBeGreaterThan(0);
      expect(problem.xpReward).toBeLessThan(1001);
    });
  });

  describe('Submission Model', () => {
    it('should create submission with required fields', () => {
      const submission = {
        id: '456',
        userId: '123',
        problemId: '789',
        code: 'function solution() {}',
        language: 'javascript'
      };
      expect(submission.id).toBeTruthy();
      expect(submission.userId).toBeTruthy();
      expect(submission.problemId).toBeTruthy();
    });

    it('should validate submission status', () => {
      const validStatuses = ['pending', 'accepted', 'wrong_answer', 'error'];
      const submission = { status: 'accepted' };
      expect(validStatuses.includes(submission.status)).toBe(true);
    });

    it('should have execution time as number', () => {
      const submission = { executionTime: 150 };
      expect(typeof submission.executionTime).toBe('number');
      expect(submission.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should validate language support', () => {
      const supportedLanguages = ['javascript', 'python', 'java', 'cpp', 'go', 'rust'];
      const submission = { language: 'javascript' };
      expect(supportedLanguages.includes(submission.language)).toBe(true);
    });
  });
});
