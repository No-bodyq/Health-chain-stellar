import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivityEntity } from './entities/user-activity.entity';
import { UserActivityService } from './user-activity.service';
import { UserActivityController } from './user-activity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserActivityEntity])],
  providers: [UserActivityService],
  controllers: [UserActivityController],
  exports: [UserActivityService],
})
export class UserActivityModule {}
