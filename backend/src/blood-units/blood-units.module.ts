import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { BlockchainEvent } from '../soroban/entities/blockchain-event.entity';
import { BloodUnitTrail } from '../soroban/entities/blood-unit-trail.entity';
import { SorobanModule } from '../soroban/soroban.module';

import { BloodStatusService } from './blood-status.service';
import { BloodUnitsController } from './blood-units.controller';
import { BloodUnitsService } from './blood-units.service';
import { BloodUnit, BloodUnitEntity } from './entities/blood-unit.entity';
import { BloodStatusHistory } from './entities/blood-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BloodUnitTrail,
      BloodUnitEntity,
      BloodUnit,
      BloodStatusHistory,
      BlockchainEvent,
    ]),
    SorobanModule,
    NotificationsModule,
  ],
  controllers: [BloodUnitsController],
  providers: [BloodUnitsService, BloodStatusService],
  exports: [BloodUnitsService, BloodStatusService],
})
export class BloodUnitsModule {}
