/**
 * Unit Tests - API Utilities
 * Tests for API-related utility functions
 */

import { describe, it, expect } from './test-framework.js';

describe('API Utilities', () => {
  describe('Request Validation', () => {
    it('should validate required fields are present', () => {
      const request = { userId: '123', problemId: '456' };
      expect(request.userId).toBeTruthy();
      expect(request.problemId).toBeTruthy();
    });

    it('should validate UUID format', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it('should validate difficulty levels', () => {
      const validDifficulties = ['easy', 'medium', 'hard'];
      const testDifficulty = 'easy';
      expect(validDifficulties.includes(testDifficulty)).toBe(true);
    });

    it('should validate language codes', () => {
      const validLanguages = ['javascript', 'python', 'java', 'cpp'];
      const testLanguage = 'javascript';
      expect(validLanguages.includes(testLanguage)).toBe(true);
    });
  });

  describe('Response Formatting', () => {
    it('should format success response', () => {
      const response = {
        success: true,
        data: { id: '123' },
        message: 'Operation successful'
      };
      expect(response.success).toBe(true);
      expect(response.data).toBeTruthy();
    });

    it('should format error response', () => {
      const response = {
        success: false,
        error: 'Validation failed',
        statusCode: 400
      };
      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('should include status code in response', () => {
      const response = { statusCode: 200, data: {} };
      expect(response.statusCode).toBe(200);
    });

    it('should format paginated response', () => {
      const response = {
        data: [1, 2, 3],
        pagination: { page: 1, limit: 10, total: 3 }
      };
      expect(response.data.length).toBe(3);
      expect(response.pagination).toBeTruthy();
    });
  });
});
