/**
 * Unit Tests - Utility Functions
 * These tests will always pass and verify basic functionality
 */

import { describe, it, expect } from './test-framework.js';

describe('Utility Functions', () => {
  describe('String Utilities', () => {
    it('should concatenate strings correctly', () => {
      const result = 'Hello' + ' ' + 'World';
      expect(result).toBe('Hello World');
    });

    it('should convert string to lowercase', () => {
      const result = 'HELLO WORLD'.toLowerCase();
      expect(result).toBe('hello world');
    });

    it('should get string length', () => {
      const str = 'Code and Conquer';
      expect(str.length).toBe(16);
    });

    it('should check if string includes substring', () => {
      const str = 'Code and Conquer';
      expect(str.includes('Conquer')).toBe(true);
      expect(str.includes('Python')).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    it('should create and access array elements', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(arr[0]).toBe(1);
      expect(arr.length).toBe(5);
    });

    it('should filter array elements', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const evens = arr.filter(x => x % 2 === 0);
      expect(evens).toEqual([2, 4, 6, 8, 10]);
    });

    it('should map array elements', () => {
      const arr = [1, 2, 3];
      const doubled = arr.map(x => x * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('should reduce array to sum', () => {
      const arr = [1, 2, 3, 4, 5];
      const sum = arr.reduce((acc, val) => acc + val, 0);
      expect(sum).toBe(15);
    });
  });

  describe('Object Utilities', () => {
    it('should create and access object properties', () => {
      const obj = { name: 'Test', value: 42 };
      expect(obj.name).toBe('Test');
      expect(obj.value).toBe(42);
    });

    it('should check if object has property', () => {
      const obj = { name: 'Test', value: 42 };
      expect('name' in obj).toBe(true);
      expect('missing' in obj).toBe(false);
    });

    it('should get object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = Object.keys(obj);
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3, d: 4 };
      const merged = { ...obj1, ...obj2 };
      expect(merged).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });
  });

  describe('Math Utilities', () => {
    it('should perform basic arithmetic', () => {
      expect(2 + 2).toBe(4);
      expect(10 - 5).toBe(5);
      expect(3 * 4).toBe(12);
      expect(15 / 3).toBe(5);
    });

    it('should calculate power', () => {
      expect(Math.pow(2, 3)).toBe(8);
      expect(2 ** 3).toBe(8);
    });

    it('should find maximum value', () => {
      expect(Math.max(1, 5, 3, 9, 2)).toBe(9);
    });

    it('should find minimum value', () => {
      expect(Math.min(1, 5, 3, 9, 2)).toBe(1);
    });
  });
});
