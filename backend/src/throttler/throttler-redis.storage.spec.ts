import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

const maybeDescribe =
  process.env.RUN_REDIS_THROTTLE_TESTS === 'true' ? describe : describe.skip;

/**
 * Set `RUN_REDIS_THROTTLE_TESTS=true` and run a Redis on `REDIS_URL` (default
 * redis://127.0.0.1:6379) to verify distributed storage against a real server.
 */
maybeDescribe(
  'ThrottlerStorageRedisService (RUN_REDIS_THROTTLE_TESTS=true)',
  () => {
    let redis: Redis;

    beforeAll(async () => {
      const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
      redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
      });
      await redis.connect();
      await redis.ping();
    });

    afterAll(async () => {
      await redis?.quit().catch(() => undefined);
    });

    it('increments counters in Redis', async () => {
      const storage = new ThrottlerStorageRedisService(redis);
      const key = `throttle-redis-spec-${Date.now()}`;
      const hitKey = `{${key}:default}:hits`;
      const blockKey = `{${key}:default}:blocked`;
      await redis.del(hitKey, blockKey);

      const first = await storage.increment(key, 60_000, 5, 60_000, 'default');
      expect(first.isBlocked).toBe(false);
      expect(first.totalHits).toBe(1);
    });
  },
);
