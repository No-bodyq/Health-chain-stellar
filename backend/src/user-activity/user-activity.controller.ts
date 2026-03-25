import { Controller, Get, Query } from '@nestjs/common';
import { UserActivityService } from './user-activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@Controller('activity-logs')
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  @RequirePermissions(Permission.VIEW_USERS)
  @Get()
  async queryActivities(@Query() query: ActivityQueryDto) {
    return this.userActivityService.queryActivities(query);
  }

  @RequirePermissions(Permission.VIEW_USERS)
  @Get('export')
  async exportActivities(@Query() query: ActivityQueryDto) {
    const csv = await this.userActivityService.exportActivities(query);
    return {
      fileName: `activity-export-${Date.now()}.csv`,
      mimeType: 'text/csv',
      data: csv,
    };
  }
}
