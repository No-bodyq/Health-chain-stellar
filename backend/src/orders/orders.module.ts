import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderStateMachine } from './state-machine/order-state-machine';
import { OrderEventStoreService } from './services/order-event-store.service';
import { RequestStatusService } from './services/request-status.service';
import { OrdersGateway } from './gateways/orders.gateway';
import { OrderEntity } from './entities/order.entity';
import { OrderEventEntity } from './entities/order-event.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlockchainEvent } from '../soroban/entities/blockchain-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderEventEntity, BlockchainEvent]),
    EventEmitterModule.forRoot(),
    InventoryModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderStateMachine,
    OrderEventStoreService,
    RequestStatusService,
    OrdersGateway,
  ],
  exports: [OrdersService, OrderStateMachine, OrderEventStoreService],
})
export class OrdersModule {}
