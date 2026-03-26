import { Module } from '@nestjs/common';

import { UssdSessionStore, REDIS_CLIENT } from './ussd-session.store';
import { UssdStateMachine } from './ussd-state-machine.service';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';

/**
 * UssdModule wires together the USSD flow.
 *
 * Consumers must provide:
 *  1. REDIS_CLIENT token (ioredis Redis instance) – typically via a shared RedisModule
 *  2. ORDER_SERVICE token (IOrderService) – typically by importing OrdersModule
 *
 * Example registration in AppModule:
 *
 * @Module({
 *   imports: [
 *     RedisModule,   // must export REDIS_CLIENT
 *     OrdersModule,  // must export ORDER_SERVICE
 *     UssdModule,
 *   ],
 * })
 */
@Module({
  controllers: [UssdController],
  providers: [
    UssdService,
    UssdStateMachine,
    UssdSessionStore,
    // REDIS_CLIENT and ORDER_SERVICE are expected to be provided by the importing module.
    // Register them in your root/feature module before importing UssdModule, or use
    // forRootAsync() pattern if you prefer self-contained configuration.
  ],
  exports: [UssdService],
})
export class UssdModule {}
