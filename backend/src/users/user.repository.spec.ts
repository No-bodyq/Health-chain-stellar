import { DataSource, SelectQueryBuilder } from 'typeorm';

import { UserRole } from '../../auth/enums/user-role.enum';
import { UserEntity } from '../entities/user.entity';
import { UserRepository } from '../user.repository';

const mockUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'uuid-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'donor',
    isActive: true,
    organizationId: 'org-1',
    deletedAt: null,
    ...overrides,
  }) as UserEntity;

describe('UserRepository', () => {
  let repo: UserRepository;
  let findOneMock: jest.Mock;
  let findMock: jest.Mock;
  let softDeleteMock: jest.Mock;
  let restoreMock: jest.Mock;
  let qbMock: Partial<SelectQueryBuilder<UserEntity>>;

  beforeEach(() => {
    findOneMock = jest.fn();
    findMock = jest.fn();
    softDeleteMock = jest.fn();
    restoreMock = jest.fn();

    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const mockEntityManager = {
      getRepository: jest.fn().mockReturnValue({
        metadata: { target: UserEntity, columns: [], relations: [] },
      }),
    };

    const mockDataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    } as unknown as DataSource;

    repo = new UserRepository(mockDataSource);

    // Override inherited Repository methods
    repo.findOne = findOneMock;
    repo.find = findMock;
    repo.softDelete = softDeleteMock;
    repo.restore = restoreMock;
    repo.createQueryBuilder = jest.fn().mockReturnValue(qbMock);
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = mockUser();
      findOneMock.mockResolvedValue(user);

      const result = await repo.findByEmail('TEST@EXAMPLE.COM');

      expect(findOneMock).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBe(user);
    });

    it('returns null when not found', async () => {
      findOneMock.mockResolvedValue(null);
      const result = await repo.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithDeleted', () => {
    it('queries with withDeleted flag', async () => {
      findOneMock.mockResolvedValue(null);
      await repo.findByEmailWithDeleted('test@example.com');
      expect(findOneMock).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        withDeleted: true,
      });
    });
  });

  describe('findByOrganization', () => {
    it('returns users for given organization', async () => {
      const users = [mockUser(), mockUser({ id: 'uuid-2' })];
      findMock.mockResolvedValue(users);

      const result = await repo.findByOrganization('org-1');

      expect(findMock).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findWithTwoFactorAuth', () => {
    it('loads twoFactorAuth relation', async () => {
      const user = mockUser();
      findOneMock.mockResolvedValue(user);

      const result = await repo.findWithTwoFactorAuth('uuid-1');

      expect(findOneMock).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['twoFactorAuth'],
      });
      expect(result).toBe(user);
    });
  });

  describe('searchUsers', () => {
    it('applies search filter', async () => {
      (qbMock.getManyAndCount as jest.Mock).mockResolvedValue([
        [mockUser()],
        1,
      ]);

      const [users, count] = await repo.searchUsers({ search: 'john' });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%john%' },
      );
      expect(count).toBe(1);
      expect(users).toHaveLength(1);
    });

    it('applies role filter', async () => {
      await repo.searchUsers({ role: UserRole.DONOR });
      expect(qbMock.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.DONOR,
      });
    });

    it('applies organizationId filter', async () => {
      await repo.searchUsers({ organizationId: 'org-1' });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'user.organization_id = :organizationId',
        {
          organizationId: 'org-1',
        },
      );
    });

    it('applies isActive filter', async () => {
      await repo.searchUsers({ isActive: false });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'user.is_active = :isActive',
        {
          isActive: false,
        },
      );
    });

    it('uses default pagination', async () => {
      await repo.searchUsers({});
      expect(qbMock.take).toHaveBeenCalledWith(20);
      expect(qbMock.skip).toHaveBeenCalledWith(0);
    });

    it('respects custom limit and offset', async () => {
      await repo.searchUsers({ limit: 5, offset: 10 });
      expect(qbMock.take).toHaveBeenCalledWith(5);
      expect(qbMock.skip).toHaveBeenCalledWith(10);
    });
  });

  describe('softDeleteUser', () => {
    it('calls softDelete with user id', async () => {
      softDeleteMock.mockResolvedValue({ affected: 1 });
      await repo.softDeleteUser('uuid-1');
      expect(softDeleteMock).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('restoreUser', () => {
    it('calls restore with user id', async () => {
      restoreMock.mockResolvedValue({ affected: 1 });
      await repo.restoreUser('uuid-1');
      expect(restoreMock).toHaveBeenCalledWith('uuid-1');
    });
  });
});
