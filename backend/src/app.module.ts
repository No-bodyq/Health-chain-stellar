import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnomalyModule } from './anomaly/anomaly.module';
import { ApprovalModule } from './approvals/approval.module';
import { BatchImportModule } from './batch-import/batch-import.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { BlockchainModule } from './blockchain/blockchain.module';
import { BloodRequestsModule } from './blood-requests/blood-requests.module';
import { BloodUnitsModule } from './blood-units/blood-units.module';
import { EventsModule } from './events/events.module';
import { CorrelationIdService } from './common/middleware/correlation-id.service';
import { AppConfigModule } from './config/config.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DonationModule } from './donations/donation.module';
import { DonorImpactModule } from './donor-impact/donor-impact.module';
import { FeePolicyModule } from './fee-policy/fee-policy.module';
import { LocationHistoryModule } from './location-history/location-history.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { InventoryModule } from './inventory/inventory.module';
import { MapsModule } from './maps/maps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { RetentionModule } from './retention/retention.module';
import { SorobanModule } from './soroban/soroban.module';
import { SurgeSimulationModule } from './surge-simulation/surge-simulation.module';
import { TrackingModule } from './tracking/tracking.module';
import { TransparencyModule } from './transparency/transparency.module';
import { UserActivityModule } from './user-activity/user-activity.module';
import { ActivityLoggingInterceptor } from './user-activity/interceptors/activity-logging.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
          {
            name: 'auth',
            ttl: config.get<number>('THROTTLE_AUTH_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_AUTH_LIMIT', 10),
          },
        ],
        storage: config.get<boolean>('THROTTLER_USE_REDIS', true)
          ? new ThrottlerStorageRedisService({
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
            })
          : undefined,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_DATABASE', 'health_chain'),
        autoLoadEntities: true,
        synchronize: true, // DEV ONLY
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),
    AppConfigModule,
    SorobanModule,
    ApprovalModule,
    DonationModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    InventoryModule,
    BlockchainModule,
    BloodRequestsModule,
    BloodUnitsModule,
    DispatchModule,
    DonorImpactModule,
    HospitalsModule,
    LocationHistoryModule,
    MapsModule,
    TransparencyModule,
    NotificationsModule,
    UserActivityModule,
    EventsModule,
    RetentionModule,
    TrackingModule,
    FeePolicyModule,
    AnomalyModule,
    BatchImportModule,
    WorkflowModule,
    SurgeSimulationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    /** JWT authentication applied globally; use @Public() to opt-out */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    /**
     * Runs after JWT so throttling can use `req.user` on protected routes (IP otherwise).
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    /** Permission enforcement applied globally; use @RequirePermissions() to specify */
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityLoggingInterceptor },
    CorrelationIdService,
  ],
})
export class AppModule {}
