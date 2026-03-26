import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserActivityModule } from '../user-activity/user-activity.module';

import { TwoFactorAuthEntity } from './entities/two-factor-auth.entity';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TwoFactorAuthEntity]),
    UserActivityModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService, UserRepository, TypeOrmModule],
})
export class UsersModule {}
