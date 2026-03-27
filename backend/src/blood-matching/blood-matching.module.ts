import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BloodUnitEntity } from '../blood-units/entities/blood-unit.entity';
import { BloodRequestEntity } from '../blood-requests/entities/blood-request.entity';
import { BloodRequestItemEntity } from '../blood-requests/entities/blood-request-item.entity';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';

import { BloodMatchingService } from './services/blood-matching.service';
import { BloodMatchingController } from './controllers/blood-matching.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BloodUnitEntity,
      BloodRequestEntity,
      BloodRequestItemEntity,
      InventoryStockEntity,
    ]),
  ],
  controllers: [BloodMatchingController],
  providers: [BloodMatchingService],
  exports: [BloodMatchingService],
})
export class BloodMatchingModule {}
