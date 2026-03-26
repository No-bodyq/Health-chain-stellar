import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { UserRole } from '../auth/enums/user-role.enum';

import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  findByEmailWithDeleted(email: string): Promise<UserEntity | null> {
    return this.findOne({
      where: { email: email.toLowerCase() },
      withDeleted: true,
    });
  }

  findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return this.find({ where: { organizationId } });
  }

  findWithTwoFactorAuth(userId: string): Promise<UserEntity | null> {
    return this.findOne({
      where: { id: userId },
      relations: ['twoFactorAuth'],
    });
  }

  async searchUsers(query: {
    search?: string;
    role?: UserRole;
    organizationId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<[UserEntity[], number]> {
    const qb = this.createQueryBuilder('user').where('user.deleted_at IS NULL');

    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.organizationId) {
      qb.andWhere('user.organization_id = :organizationId', {
        organizationId: query.organizationId,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: query.isActive });
    }

    return qb
      .take(query.limit ?? 20)
      .skip(query.offset ?? 0)
      .getManyAndCount();
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.softDelete(id);
  }

  async restoreUser(id: string): Promise<void> {
    await this.restore(id);
  }
}
