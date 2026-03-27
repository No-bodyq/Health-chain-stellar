import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { UserActivityModule } from '../user-activity/user-activity.module';

import { TwoFactorAuthEntity } from './entities/two-factor-auth.entity';
import { UserEntity } from './entities/user.entity';
import { ProfileActivityEntity } from './entities/profile-activity.entity';
import { UserRepository } from './user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageService } from './services/storage.service';
import { ImageValidationService } from './services/image-validation.service';
import { ProfileActivityService } from './services/profile-activity.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TwoFactorAuthEntity, ProfileActivityEntity]),
    UserActivityModule,
    MulterModule.register({
      dest: './uploads/temp',
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
    StorageService,
    ImageValidationService,
    ProfileActivityService,
  ],
  exports: [UsersService, UserRepository, TypeOrmModule],
})
export class UsersModule {}
