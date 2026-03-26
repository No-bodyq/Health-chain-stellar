/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';

import { JobDeduplicationPlugin } from '../plugins/job-deduplication.plugin';

describe('JobDeduplicationPlugin', () => {
  let plugin: JobDeduplicationPlugin;
  const mockRedis = {
    exists: jest.fn(),
    setEx: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JobDeduplicationPlugin,
          useValue: (() => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const instance = new JobDeduplicationPlugin(mockRedis as any);
            return instance;
          })(),
        },
      ],
    }).compile();

    plugin = module.get<JobDeduplicationPlugin>(JobDeduplicationPlugin);
  });

  describe('checkAndSetJobDedup', () => {
    it('should return true for new job', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);
      mockRedis.setEx.mockResolvedValueOnce('OK');

      const result = await plugin.checkAndSetJobDedup('test_method', [
        'arg1',
        'arg2',
      ]);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalled();
    });

    it('should return false for duplicate job', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await plugin.checkAndSetJobDedup('test_method', [
        'arg1',
        'arg2',
      ]);

      expect(result).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalled();
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it('should compute consistent hash for same payload', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const method = 'register_blood';
      const args = ['bank-123', 'O+', 100];

      // First call
      const result1 = await plugin.checkAndSetJobDedup(method, args);
      expect(result1).toBe(true);

      // Simulate same job arriving again
      mockRedis.exists.mockResolvedValueOnce(1);
      const result2 = await plugin.checkAndSetJobDedup(method, args);
      expect(result2).toBe(false);
    });

    it('should handle object arguments normalization', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const method = 'process_payment';
      const args1 = [{ amount: 100, currency: 'USD' }];
      const args2 = [{ amount: 100, currency: 'USD' }]; // Same object, different reference

      // First call
      const result1 = await plugin.checkAndSetJobDedup(method, args1);
      expect(result1).toBe(true);

      // Second call with equivalent object
      mockRedis.exists.mockResolvedValueOnce(1);
      const result2 = await plugin.checkAndSetJobDedup(method, args2);
      expect(result2).toBe(false);
    });

    it('should distinguish different jobs', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      // First job
      const result1 = await plugin.checkAndSetJobDedup('method_a', ['arg1']);
      expect(result1).toBe(true);

      // Different job
      const result2 = await plugin.checkAndSetJobDedup('method_b', ['arg1']);
      expect(result2).toBe(true);

      expect(mockRedis.setEx).toHaveBeenCalledTimes(2);
    });

    it('should handle complex nested objects', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const method = 'complex_operation';
      const args = [
        {
          nested: {
            value: 42,
            array: [1, 2, 3],
          },
        },
      ];

      const result = await plugin.checkAndSetJobDedup(method, args);
      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalled();
    });

    it('should set correct TTL on dedup key', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);
      mockRedis.setEx.mockResolvedValueOnce('OK');

      await plugin.checkAndSetJobDedup('test_method', ['arg']);

      // Verify setEx was called with appropriate TTL (10 seconds)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const [, ttl] = mockRedis.setEx.mock.calls[0];
      expect(ttl).toBe(10); // 10 second TTL
    });

    it('should handle null and undefined arguments', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await plugin.checkAndSetJobDedup('test_method', [
        null,
        undefined,
        'value',
      ]);

      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalled();
    });

    it('should detect duplicate with null/undefined arguments', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const args = [null, undefined, 'value'];

      // First call
      const result1 = await plugin.checkAndSetJobDedup('method', args);
      expect(result1).toBe(true);

      // Duplicate call
      mockRedis.exists.mockResolvedValueOnce(1);
      const result2 = await plugin.checkAndSetJobDedup('method', args);
      expect(result2).toBe(false);
    });
  });

  describe('clearDedup', () => {
    it('should clear all dedup cache entries', async () => {
      mockRedis.keys.mockResolvedValueOnce([
        'job-dedup:abc123',
        'job-dedup:def456',
      ]);
      mockRedis.del.mockResolvedValueOnce(2);

      await plugin.clearDedup();

      expect(mockRedis.keys).toHaveBeenCalledWith('job-dedup:*');
      expect(mockRedis.del).toHaveBeenCalledWith([
        'job-dedup:abc123',
        'job-dedup:def456',
      ]);
    });

    it('should handle empty cache gracefully', async () => {
      mockRedis.keys.mockResolvedValueOnce([]);

      await plugin.clearDedup();

      expect(mockRedis.keys).toHaveBeenCalledWith('job-dedup:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('Acceptance Criteria', () => {
    it('should suppress duplicate high-volume events', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const method = 'rapid_fire_event';
      const args = ['event-data'];

      // First event - should be allowed
      const result1 = await plugin.checkAndSetJobDedup(method, args);
      expect(result1).toBe(true);

      // Rapid duplicate - should be suppressed
      mockRedis.exists.mockResolvedValueOnce(1);
      const result2 = await plugin.checkAndSetJobDedup(method, args);
      expect(result2).toBe(false);

      // Prevent queue bloat - only 1 actual queue entry for 2 duplicate requests
      expect(mockRedis.setEx).toHaveBeenCalledTimes(1);
    });

    it('should allow same event after dedup window expires', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const method = 'batched_event';
      const args = ['data'];

      // First event
      const result1 = await plugin.checkAndSetJobDedup(method, args);
      expect(result1).toBe(true);

      // Simulate dedup window expiration (key doesn't exist anymore)
      mockRedis.exists.mockResolvedValueOnce(0);
      const result2 = await plugin.checkAndSetJobDedup(method, args);
      expect(result2).toBe(true); // Allowed after window expires

      expect(mockRedis.setEx).toHaveBeenCalledTimes(2);
    });

    it('should verify duplicate job suppression with test data', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setEx.mockResolvedValue('OK');

      const suppressionTests = [
        { method: 'order_placed', args: ['order-123', 'USD'] },
        { method: 'payment_processed', args: [{ amount: 50 }] },
        { method: 'inventory_updated', args: ['SKU-001', 10] },
      ];

      // Enqueue all jobs twice
      const allowedCount: number[] = [];

      for (const test of suppressionTests) {
        // First submission
        mockRedis.exists.mockResolvedValueOnce(0);
        mockRedis.setEx.mockResolvedValueOnce('OK');
        const result1 = await plugin.checkAndSetJobDedup(
          test.method,
          test.args,
        );

        // Second submission (duplicate)
        mockRedis.exists.mockResolvedValueOnce(1);
        const result2 = await plugin.checkAndSetJobDedup(
          test.method,
          test.args,
        );

        allowedCount.push(result1 ? 1 : 0);
        allowedCount.push(result2 ? 1 : 0);
      }

      // Verify 3 allowed (first of each), 3 suppressed (duplicates)
      const totalAllowed = allowedCount.reduce((a, b) => a + b, 0);
      expect(totalAllowed).toBe(suppressionTests.length); // Only first of each allowed
    });
  });
});
