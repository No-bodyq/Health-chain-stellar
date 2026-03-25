import { of, throwError } from 'rxjs';
import { ExecutionContext } from '@nestjs/common';
import { ActivityLoggingInterceptor } from './activity-logging.interceptor';
import { UserActivityService } from '../user-activity.service';
import { ActivityType } from '../enums/activity-type.enum';

describe('ActivityLoggingInterceptor', () => {
  const mockUserActivityService: jest.Mocked<Partial<UserActivityService>> = {
    logActivity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createHttpContext(request: Record<string, unknown>): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('logs successful login events with ip and user-agent', (done) => {
    const interceptor = new ActivityLoggingInterceptor(
      mockUserActivityService as UserActivityService,
    );
    const context = createHttpContext({
      method: 'POST',
      route: { path: '/login' },
      headers: { 'user-agent': 'jest', 'x-forwarded-for': '10.0.0.1' },
      user: { id: 'user-1' },
    });

    interceptor.intercept(context, { handle: () => of({ ok: true }) }).subscribe({
      complete: () => {
        expect(mockUserActivityService.logActivity).toHaveBeenCalledWith(
          expect.objectContaining({
            activityType: ActivityType.AUTH_LOGIN_SUCCESS,
            ipAddress: '10.0.0.1',
            userAgent: 'jest',
          }),
        );
        done();
      },
    });
  });

  it('logs failed login attempts', (done) => {
    const interceptor = new ActivityLoggingInterceptor(
      mockUserActivityService as UserActivityService,
    );
    const context = createHttpContext({
      method: 'POST',
      route: { path: '/login' },
      headers: { 'user-agent': 'jest', 'x-forwarded-for': '10.0.0.1' },
    });

    interceptor
      .intercept(context, {
        handle: () => throwError(() => new Error('bad credentials')),
      })
      .subscribe({
        error: () => {
          expect(mockUserActivityService.logActivity).toHaveBeenCalledWith(
            expect.objectContaining({
              activityType: ActivityType.AUTH_LOGIN_FAILED,
            }),
          );
          done();
        },
      });
  });
});
