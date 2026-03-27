import { Test, TestingModule } from '@nestjs/testing';
import { AuthSessionFallbackStore } from './auth-session-fallback.store';

describe('AuthSessionFallbackStore', () => {
  let store: AuthSessionFallbackStore;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthSessionFallbackStore],
    }).compile();

    store = module.get<AuthSessionFallbackStore>(AuthSessionFallbackStore);
  });

  afterEach(() => {
    store.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve session data', async () => {
      await store.set('session:user-123', '{"userId":"123"}', 3600);

      const value = await store.get('session:user-123');

      expect(value).toBe('{"userId":"123"}');
    });

    it('should return null for non-existent key', async () => {
      const value = await store.get('session:nonexistent');

      expect(value).toBeNull();
    });

    it('should return null for expired key', async () => {
      jest.useFakeTimers();

      await store.set('session:user-123', '{"userId":"123"}', 1); // 1 second TTL

      // Advance time past expiration
      jest.advanceTimersByTime(2000);

      const value = await store.get('session:user-123');

      expect(value).toBeNull();

      jest.useRealTimers();
    });

    it('should delete expired key on access', async () => {
      jest.useFakeTimers();

      await store.set('session:user-123', '{"userId":"123"}', 1);

      expect(store.size()).toBe(1);

      jest.advanceTimersByTime(2000);

      await store.get('session:user-123');

      expect(store.size()).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      await store.set('session:user-123', '{"userId":"123"}', 3600);

      expect(await store.exists('session:user-123')).toBe(true);

      await store.delete('session:user-123');

      expect(await store.exists('session:user-123')).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing non-expired key', async () => {
      await store.set('session:user-123', '{"userId":"123"}', 3600);

      expect(await store.exists('session:user-123')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await store.exists('session:nonexistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      jest.useFakeTimers();

      await store.set('session:user-123', '{"userId":"123"}', 1);

      jest.advanceTimersByTime(2000);

      expect(await store.exists('session:user-123')).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      jest.useFakeTimers();

      await store.set('session:user-1', '{"userId":"1"}', 1);
      await store.set('session:user-2', '{"userId":"2"}', 3600);
      await store.set('session:user-3', '{"userId":"3"}', 1);

      expect(store.size()).toBe(3);

      jest.advanceTimersByTime(2000);

      const cleaned = await store.cleanup();

      expect(cleaned).toBe(2);
      expect(store.size()).toBe(1);
      expect(await store.exists('session:user-2')).toBe(true);

      jest.useRealTimers();
    });

    it('should return 0 if no entries expired', async () => {
      await store.set('session:user-1', '{"userId":"1"}', 3600);
      await store.set('session:user-2', '{"userId":"2"}', 3600);

      const cleaned = await store.cleanup();

      expect(cleaned).toBe(0);
      expect(store.size()).toBe(2);
    });
  });

  describe('capacity limits (LRU eviction)', () => {
    it('should evict oldest entry when at capacity', async () => {
      // Mock maxSize to 3 for testing
      const smallStore = new AuthSessionFallbackStore();
      (smallStore as any).maxSize = 3;

      await smallStore.set('session:1', 'data1', 3600);
      await smallStore.set('session:2', 'data2', 3600);
      await smallStore.set('session:3', 'data3', 3600);

      expect(smallStore.size()).toBe(3);

      // Adding 4th should evict oldest (session:1)
      await smallStore.set('session:4', 'data4', 3600);

      expect(smallStore.size()).toBe(3);
      expect(await smallStore.exists('session:1')).toBe(false);
      expect(await smallStore.exists('session:2')).toBe(true);
      expect(await smallStore.exists('session:3')).toBe(true);
      expect(await smallStore.exists('session:4')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await store.set('session:1', 'data1', 3600);
      await store.set('session:2', 'data2', 3600);
      await store.set('session:3', 'data3', 3600);

      expect(store.size()).toBe(3);

      store.clear();

      expect(store.size()).toBe(0);
    });
  });

  describe('degraded mode behavior', () => {
    it('should handle high volume of session operations', async () => {
      const sessionCount = 1000;

      // Create many sessions
      for (let i = 0; i < sessionCount; i++) {
        await store.set(`session:user-${i}`, `{"userId":"${i}"}`, 3600);
      }

      expect(store.size()).toBe(sessionCount);

      // Verify random sessions
      expect(await store.get('session:user-0')).toBe('{"userId":"0"}');
      expect(await store.get('session:user-500')).toBe('{"userId":"500"}');
      expect(await store.get('session:user-999')).toBe('{"userId":"999"}');
    });

    it('should maintain session integrity during concurrent operations', async () => {
      const operations = [];

      // Simulate concurrent set/get operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          store.set(`session:${i}`, `data-${i}`, 3600).then(() =>
            store.get(`session:${i}`),
          ),
        );
      }

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach((result, i) => {
        expect(result).toBe(`data-${i}`);
      });
    });
  });
});
