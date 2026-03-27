import { Test, TestingModule } from '@nestjs/testing';
import { RedisCircuitBreaker } from './redis-circuit-breaker';

describe('RedisCircuitBreaker', () => {
  let circuitBreaker: RedisCircuitBreaker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisCircuitBreaker],
    }).compile();

    circuitBreaker = module.get<RedisCircuitBreaker>(RedisCircuitBreaker);
  });

  afterEach(() => {
    circuitBreaker.reset();
  });

  describe('CLOSED state (normal operation)', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn().mockReturnValue('fallback');

      const result = await circuitBreaker.execute(operation, fallback);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
      expect(circuitBreaker.isCircuitOpen()).toBe(false);
    });

    it('should use fallback on first failure but keep circuit closed', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Redis error'));
      const fallback = jest.fn().mockReturnValue('fallback');

      const result = await circuitBreaker.execute(operation, fallback);

      expect(result).toBe('fallback');
      expect(operation).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
      expect(circuitBreaker.isCircuitOpen()).toBe(false);
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
  });

  describe('OPEN state (Redis unavailable)', () => {
    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Redis error'));
      const fallback = jest.fn().mockReturnValue('fallback');

      // Trigger 5 failures to open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      expect(circuitBreaker.isCircuitOpen()).toBe(true);
      expect(circuitBreaker.getFailureCount()).toBe(5);
    });

    it('should use fallback without calling operation when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Redis error'));
      const fallback = jest.fn().mockReturnValue('fallback');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      operation.mockClear();
      fallback.mockClear();

      // Next call should use fallback without trying operation
      const result = await circuitBreaker.execute(operation, fallback);

      expect(result).toBe('fallback');
      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN state (testing recovery)', () => {
    it('should attempt operation after reset timeout', async () => {
      jest.useFakeTimers();

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce('recovered');

      const fallback = jest.fn().mockReturnValue('fallback');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      expect(circuitBreaker.isCircuitOpen()).toBe(true);

      // Advance time past reset timeout (30 seconds)
      jest.advanceTimersByTime(31_000);

      // Should attempt operation again (HALF_OPEN)
      const result = await circuitBreaker.execute(operation, fallback);

      expect(result).toBe('recovered');
      expect(circuitBreaker.isCircuitOpen()).toBe(false);
      expect(circuitBreaker.getFailureCount()).toBe(0);

      jest.useRealTimers();
    });

    it('should reopen circuit if operation fails in HALF_OPEN state', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockRejectedValue(new Error('Redis error'));
      const fallback = jest.fn().mockReturnValue('fallback');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      // Advance time to HALF_OPEN
      jest.advanceTimersByTime(31_000);

      // Operation still fails - should increment failure count
      await circuitBreaker.execute(operation, fallback);

      expect(circuitBreaker.getFailureCount()).toBe(1);
      expect(circuitBreaker.isCircuitOpen()).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Recovery', () => {
    it('should reset failure count on successful operation', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce('success');

      const fallback = jest.fn().mockReturnValue('fallback');

      // 2 failures
      await circuitBreaker.execute(operation, fallback);
      await circuitBreaker.execute(operation, fallback);

      expect(circuitBreaker.getFailureCount()).toBe(2);

      // Success should reset
      await circuitBreaker.execute(operation, fallback);

      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.isCircuitOpen()).toBe(false);
    });
  });

  describe('Manual reset', () => {
    it('should allow manual circuit reset', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Redis error'));
      const fallback = jest.fn().mockReturnValue('fallback');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      expect(circuitBreaker.isCircuitOpen()).toBe(true);

      // Manual reset
      circuitBreaker.reset();

      expect(circuitBreaker.isCircuitOpen()).toBe(false);
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });
  });

  describe('Graceful degradation', () => {
    it('should continue serving requests via fallback when Redis is down', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Connection refused'));
      const fallback = jest.fn().mockReturnValue('degraded-mode-data');

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation, fallback);
      }

      // Service should continue working with fallback
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await circuitBreaker.execute(operation, fallback));
      }

      expect(results).toEqual(Array(10).fill('degraded-mode-data'));
      expect(operation).toHaveBeenCalledTimes(5); // Only called before circuit opened
    });
  });
});
