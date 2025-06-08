import {
  cn,
  formatDate,
  formatDateTime,
  truncate,
  isAdmin,
  maskApiKey,
  generateRandomName,
} from '@/lib/utils';
import type { User } from '@/types';

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
      expect(cn('px-4', 'px-2')).toBe('px-2'); // Tailwind merge should work
    });
  });

  describe('formatDate', () => {
    it('should format date objects correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Jan 15, 2024/);
    });

    it('should format date strings correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const formatted = formatDate(dateString);
      expect(formatted).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('Jan 15, 2024');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('This is a long string', 10)).toBe('This is a ...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle exact length', () => {
      expect(truncate('Exactly10!', 10)).toBe('Exactly10!');
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      const adminUser: User = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(isAdmin(adminUser)).toBe(true);
    });

    it('should return false for regular users', () => {
      const regularUser: User = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(isAdmin(regularUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('should mask long API keys correctly', () => {
      const apiKey = 'abcd1234567890efgh';
      expect(maskApiKey(apiKey)).toBe('abcd...efgh');
    });

    it('should not mask short API keys', () => {
      const shortKey = 'abc123';
      expect(maskApiKey(shortKey)).toBe('abc123');
    });

    it('should handle exactly 8 character keys', () => {
      const key = 'abcd1234';
      expect(maskApiKey(key)).toBe('abcd1234');
    });
  });

  describe('generateRandomName', () => {
    it('should generate a name with correct format', () => {
      const name = generateRandomName();
      expect(name).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    });

    it('should generate different names', () => {
      const name1 = generateRandomName();
      const name2 = generateRandomName();
      // Very low probability they'll be the same
      expect(name1).not.toBe(name2);
    });
  });
});
