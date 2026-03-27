import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { BlockchainEvent } from '../soroban/entities/blockchain-event.entity';
import { BloodUnitTrail } from '../soroban/entities/blood-unit-trail.entity';
import { SorobanModule } from '../soroban/soroban.module';

import { BloodInventoryQueryService } from './blood-inventory-query.service';
import { BloodStatusService } from './blood-status.service';
import { BloodUnitsController } from './blood-units.controller';
import { BloodUnitsService } from './blood-units.service';
import { QrVerificationService } from './qr-verification.service';
import { BloodUnit, BloodUnitEntity } from './entities/blood-unit.entity';
import { BloodStatusHistory } from './entities/blood-status-history.entity';
import { QrVerificationLogEntity } from './entities/qr-verification-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BloodUnitTrail,
      BloodUnitEntity,
      BloodUnit,
      BloodStatusHistory,
      BlockchainEvent,
      QrVerificationLogEntity,
      OrderEntity,
    ]),
    SorobanModule,
    NotificationsModule,
  ],
  controllers: [BloodUnitsController],
  providers: [
    BloodUnitsService,
    BloodStatusService,
    BloodInventoryQueryService,
  ],
  exports: [BloodUnitsService, BloodStatusService, BloodInventoryQueryService],
})
export class BloodUnitsModule {}
