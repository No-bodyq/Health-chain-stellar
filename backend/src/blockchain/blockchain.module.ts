import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CompensationModule } from '../common/compensation/compensation.module';

import { BlockchainController } from './controllers/blockchain.controller';
import { AdminGuard } from './guards/admin.guard';
import { JobDeduplicationPlugin } from './plugins/job-deduplication.plugin';
import { SorobanDlqProcessor } from './processors/soroban-dlq.processor';
import { SorobanTxProcessor } from './processors/soroban-tx.processor';
import { ConfirmationService } from './services/confirmation.service';
import { IdempotencyService } from './services/idempotency.service';
import { QueueMetricsService } from './services/queue-metrics.service';
import { SorobanService } from './services/soroban.service';

@Module({
  imports: [
    CompensationModule,
    BullModule.registerQueueAsync(
      {
        name: 'soroban-tx-queue',
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'soroban-dlq',
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    SorobanService,
    ConfirmationService,
    IdempotencyService,
    JobDeduplicationPlugin,
    SorobanTxProcessor,
    SorobanDlqProcessor,
    AdminGuard,
  ],
  controllers: [BlockchainController],
  exports: [SorobanService],
})
export class BlockchainModule {}
