import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { RiderEntity } from '../riders/entities/rider.entity';

import { SurgeSimulationController } from './surge-simulation.controller';
import { SurgeSimulationService } from './surge-simulation.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryStockEntity, RiderEntity])],
  controllers: [SurgeSimulationController],
  providers: [SurgeSimulationService],
})
export class SurgeSimulationModule {}
