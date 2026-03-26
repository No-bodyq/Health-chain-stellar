import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { UsersModule } from '../users/users.module';

import { InventoryEntity } from './entities/inventory.entity';
import { InventoryEventListener } from './inventory-event.listener';
import { InventoryForecastingService } from './inventory-forecasting.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DonorOutreachProcessor } from './processors/donor-outreach.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, InventoryEntity]),
    BullModule.registerQueue({
      name: 'donor-outreach',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryForecastingService,
    InventoryEventListener,
    DonorOutreachProcessor,
  ],
  exports: [InventoryService, InventoryForecastingService],
})
export class InventoryModule {}
