import { Injectable } from '@nestjs/common';
import { UserActivityService } from '../user-activity/user-activity.service';
import { ActivityType } from '../user-activity/enums/activity-type.enum';

@Injectable()
export class UsersService {
  constructor(private readonly userActivityService: UserActivityService) {}

  async findAll() {
    // TODO: Implement find all users logic
    return {
      message: 'Users retrieved successfully',
      data: [],
    };
  }

  async findOne(id: string) {
    // TODO: Implement find user by id logic
    return {
      message: 'User retrieved successfully',
      data: { id },
    };
  }

  async update(
    id: string,
    updateUserDto: any,
    context?: {
      actorId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    await this.userActivityService.logActivity({
      userId: context?.actorId ?? id,
      activityType: ActivityType.PROFILE_UPDATED,
      description: `Profile updated for user ${id}`,
      metadata: {
        targetUserId: id,
        changedFields: Object.keys(updateUserDto ?? {}),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // TODO: Implement update user logic
    return {
      message: 'User updated successfully',
      data: { id, ...updateUserDto },
    };
  }

  async remove(id: string) {
    // TODO: Implement delete user logic
    return {
      message: 'User deleted successfully',
      data: { id },
    };
  }

  async getProfile(userId: string) {
    // TODO: Implement get user profile logic
    return {
      message: 'Profile retrieved successfully',
      data: { id: userId },
    };
  }
}
