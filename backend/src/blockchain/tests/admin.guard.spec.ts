/// <reference types="jest" />
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminGuard } from '../guards/admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockExecutionContext: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminGuard],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
  });

  describe('canActivate', () => {
    it('should allow access with valid admin key', () => {
      const validAdminKey = 'test-admin-key';
      process.env.ADMIN_KEY = validAdminKey;

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': validAdminKey,
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access with invalid admin key', () => {
      process.env.ADMIN_KEY = 'correct-key';

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': 'wrong-key',
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when admin key header is missing', () => {
      process.env.ADMIN_KEY = 'test-key';

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when ADMIN_KEY env var is not set', () => {
      delete process.env.ADMIN_KEY;

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': 'any-key',
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException with correct message', () => {
      process.env.ADMIN_KEY = 'correct-key';

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': 'wrong-key',
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      try {
        guard.canActivate(mockExecutionContext);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Admin permission required');
      }
    });
  });

  describe('Acceptance Criteria', () => {
    it('should protect admin endpoints with authentication', () => {
      process.env.ADMIN_KEY = 'admin-secret';

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': 'admin-secret',
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should reject unauthorized access', () => {
      process.env.ADMIN_KEY = 'admin-secret';

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-admin-key': 'wrong-secret',
            },
            ip: '127.0.0.1',
            path: '/blockchain/queue/status',
            method: 'GET',
          }),
        }),
      };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });
  });
});
