import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { BloodUnitTrail } from '../soroban/entities/blood-unit-trail.entity';
import { SorobanModule } from '../soroban/soroban.module';

import { BloodUnitsController } from './blood-units.controller';
import { BloodUnitsService } from './blood-units.service';
import { BloodUnitEntity } from './entities/blood-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BloodUnitTrail, BloodUnitEntity]),
    SorobanModule,
    NotificationsModule,
  ],
  controllers: [BloodUnitsController],
  providers: [BloodUnitsService],
  exports: [BloodUnitsService],
})
export class BloodUnitsModule {}
