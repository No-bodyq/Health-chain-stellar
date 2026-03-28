import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { CompensationModule } from '../common/compensation/compensation.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MapsModule } from '../maps/maps.module';
import { OrganizationEntity } from '../organizations/entities/organization.entity';

import { BloodRequestsController } from './blood-requests.controller';
import { BloodRequestsService } from './blood-requests.service';
import { RequestQueryController } from './controllers/request-query.controller';
import { BloodRequestItemEntity } from './entities/blood-request-item.entity';
import { BloodRequestEntity } from './entities/blood-request.entity';
import { BloodRequestReservationEntity } from './entities/blood-request-reservation.entity';
import { RequestQueryService } from './services/request-query.service';
import { BloodBankAvailabilityService } from './services/blood-bank-availability.service';
import { BloodRequestReservationService } from './services/blood-request-reservation.service';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BloodRequestEntity,
      BloodRequestItemEntity,
      BloodRequestReservationEntity,
      InventoryStockEntity,
      OrganizationEntity,
    ]),
    InventoryModule,
    BlockchainModule,
    NotificationsModule,
    CompensationModule,
    MapsModule,
  ],
  controllers: [BloodRequestsController, RequestQueryController],
  providers: [
    BloodRequestsService,
    RequestQueryService,
    BloodBankAvailabilityService,
    BloodRequestReservationService,
  ],
  exports: [
    BloodRequestsService,
    RequestQueryService,
    BloodBankAvailabilityService,
    BloodRequestReservationService,
  ],
})
export class BloodRequestsModule {}
