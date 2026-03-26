import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserEntity } from '../users/entities/user.entity';

import { AuthService } from './auth.service';
import { hashPassword } from './utils/password.util';

describe('AuthService - Refresh Token Race Condition (Integration)', () => {
  let authService: AuthService;
  let redis: Redis;
  let jwtService: JwtService;
  let userRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeAll(async () => {
    const passwordHash = await hashPassword('password');
    const mockUser: UserEntity = {
      id: 'placeholder-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'donor',
      region: '',
      phoneNumber: '',
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userRepository = {
      findOne: jest.fn(async ({ where }) => {
        if (where?.email === mockUser.email || where?.id === mockUser.id) {
          return mockUser;
        }
        return null;
      }),
      save: jest.fn(async (entity) => entity),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        {
          provide: REDIS_CLIENT,
          useFactory: () => {
            return new RedisMock();
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    redis = module.get<Redis>(REDIS_CLIENT);
    jwtService = module.get<JwtService>(JwtService);

    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  afterEach(async () => {
    await redis.flushdb();
  });

  describe('Concurrent Refresh Token Requests', () => {
    it('should only allow one concurrent request to succeed', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      const refreshToken = loginResult.refresh_token;

      // Simulate two simultaneous refresh requests
      const [result1, result2] = await Promise.allSettled([
        authService.refreshToken(refreshToken),
        authService.refreshToken(refreshToken),
      ]);

      // One should succeed, one should fail
      const succeeded = [result1, result2].filter(
        (r) => r.status === 'fulfilled',
      );
      const failed = [result1, result2].filter((r) => r.status === 'rejected');

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);

      // Verify the failed one has the correct error
      const failedResult = failed[0];
      expect(failedResult.reason).toBeInstanceOf(UnauthorizedException);
      expect(failedResult.reason.message).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should rotate refresh token on successful use', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      const oldRefreshToken = loginResult.refresh_token;
      const refreshResult = await authService.refreshToken(oldRefreshToken);

      expect(refreshResult.access_token).toBeDefined();
      expect(refreshResult.refresh_token).toBeDefined();
      expect(refreshResult.refresh_token).not.toBe(oldRefreshToken);

      // Old token should not work anymore
      await expect(authService.refreshToken(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // New token should work
      const secondRefresh = await authService.refreshToken(
        refreshResult.refresh_token,
      );
      expect(secondRefresh.access_token).toBeDefined();
      expect(secondRefresh.refresh_token).toBeDefined();
    });

    it('should prevent replay attacks with used tokens', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      const refreshToken = loginResult.refresh_token;

      // First use succeeds
      const firstRefresh = await authService.refreshToken(refreshToken);
      expect(firstRefresh.access_token).toBeDefined();

      // Second use with same token fails
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'INVALID_REFRESH_TOKEN',
      );

      // Third use also fails
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'INVALID_REFRESH_TOKEN',
      );
    });

    it('should handle 10 concurrent requests with only one succeeding', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      const refreshToken = loginResult.refresh_token;

      // Simulate 10 simultaneous requests
      const promises = Array(10)
        .fill(null)
        .map(() => authService.refreshToken(refreshToken));

      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(9);

      // All failures should have the correct error
      failed.forEach((result) => {
        const failedResult = result;
        expect(failedResult.reason).toBeInstanceOf(UnauthorizedException);
      });
    });

    it('should maintain payload integrity after token rotation', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      const refreshResult = await authService.refreshToken(
        loginResult.refresh_token,
      );

      // Decode the new access token
      const decoded = jwtService.decode(refreshResult.access_token);

      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('donor');
      expect(decoded.sub).toBe('placeholder-user-id');
    });
  });
});
