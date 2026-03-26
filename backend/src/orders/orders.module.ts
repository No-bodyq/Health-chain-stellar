import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryModule } from '../inventory/inventory.module';

import { OrderEventEntity } from './entities/order-event.entity';
import { OrderEntity } from './entities/order.entity';
import { OrdersGateway } from './gateways/orders.gateway';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEventStoreService } from './services/order-event-store.service';
import { OrderStateMachine } from './state-machine/order-state-machine';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderEventEntity]),
    EventEmitterModule.forRoot(),
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderStateMachine,
    OrderEventStoreService,
    OrdersGateway,
  ],
  exports: [OrdersService, OrderStateMachine, OrderEventStoreService],
})
export class OrdersModule {}
