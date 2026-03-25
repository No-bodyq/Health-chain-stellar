import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivityService } from './user-activity.service';
import { UserActivityEntity } from './entities/user-activity.entity';
import { ActivityType } from './enums/activity-type.enum';

describe('UserActivityService', () => {
  let service: UserActivityService;
  let repository: jest.Mocked<Partial<Repository<UserActivityEntity>>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityService,
        {
          provide: getRepositoryToken(UserActivityEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UserActivityService>(UserActivityService);
  });

  it('logs activities with ip and user-agent', async () => {
    const createdAt = new Date();
    (repository.create as jest.Mock).mockImplementation((value) => value);
    (repository.save as jest.Mock).mockImplementation(async (value) => ({
      id: 'activity-1',
      createdAt,
      ...value,
    }));

    const result = await service.logActivity({
      userId: 'user-1',
      activityType: ActivityType.AUTH_LOGIN_SUCCESS,
      description: 'User logged in successfully',
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(result.activityType).toBe(ActivityType.AUTH_LOGIN_SUCCESS);
    expect(result.ipAddress).toBe('127.0.0.1');
    expect(result.userAgent).toBe('jest-agent');
  });

  it('queries activities with pagination metadata', async () => {
    (repository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    const result = await service.queryActivities({
      page: 2,
      limit: 10,
      userId: 'user-1',
    });

    expect(repository.findAndCount).toHaveBeenCalled();
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
  });

  it('exports activity logs as CSV', async () => {
    const now = new Date();
    jest.spyOn(service, 'queryActivities').mockResolvedValue({
      data: [
        {
          id: 'activity-1',
          userId: 'user-1',
          activityType: ActivityType.AUTH_LOGOUT,
          description: 'User logged out',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          createdAt: now,
        } as UserActivityEntity,
      ],
      meta: { total: 1, page: 1, limit: 5000, totalPages: 1 },
    });

    const csv = await service.exportActivities({});

    expect(csv).toContain('activityType');
    expect(csv).toContain('AUTH_LOGOUT');
    expect(csv).toContain('user-1');
  });

  it('deletes activities older than retention window', async () => {
    (repository.delete as jest.Mock).mockResolvedValue({ affected: 4 });

    const deleted = await service.cleanupOldActivities();

    expect(deleted).toBe(4);
    expect(repository.delete).toHaveBeenCalled();
  });
});
