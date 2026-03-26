/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';

import { IdempotencyService } from '../services/idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn(),
      exists: jest.fn(),
      quit: jest.fn(),
    };

    // Mock Redis module
    jest.mock('redis', () => ({
      Redis: jest.fn(() => mockRedis),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    // Override redis instance with mock
    (service as any).redis = mockRedis;
  });

  describe('checkAndSetIdempotencyKey', () => {
    it('should return true for new idempotency key', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      const result = await service.checkAndSetIdempotencyKey('new-key');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'idempotency:new-key',
        '1',
        'EX',
        86400 * 7,
        'NX',
      );
    });

    it('should return false for duplicate idempotency key', async () => {
      mockRedis.set.mockResolvedValueOnce(null);

      const result = await service.checkAndSetIdempotencyKey('duplicate-key');

      expect(result).toBe(false);
    });

    it('should set 7-day TTL on idempotency key', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      await service.checkAndSetIdempotencyKey('ttl-test-key');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        '1',
        'EX',
        86400 * 7, // 7 days in seconds
        'NX',
      );
    });

    it('should use NX flag to prevent overwriting existing keys', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      await service.checkAndSetIdempotencyKey('nx-test-key');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX', // NX flag ensures atomic check-and-set
      );
    });
  });

  describe('getIdempotencyKey', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await service.getIdempotencyKey('existing-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('idempotency:existing-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await service.getIdempotencyKey('non-existing-key');

      expect(result).toBe(false);
    });
  });

  describe('Acceptance Criteria', () => {
    it('should prevent duplicate submissions with concurrent requests', async () => {
      // Simulate concurrent requests with same idempotency key
      mockRedis.set
        .mockResolvedValueOnce('OK') // First request succeeds
        .mockResolvedValueOnce(null); // Second request fails (key already exists)

      const key = 'concurrent-test-key';

      const result1 = await service.checkAndSetIdempotencyKey(key);
      const result2 = await service.checkAndSetIdempotencyKey(key);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should use atomic Redis operations for idempotency', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      await service.checkAndSetIdempotencyKey('atomic-test-key');

      // Verify SET with NX flag (atomic check-and-set)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX',
      );
    });

    it('should store idempotency keys with proper prefix', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      const testKey = 'test-key-123';
      await service.checkAndSetIdempotencyKey(testKey);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `idempotency:${testKey}`,
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
      );
    });
  });
});
