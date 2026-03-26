import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { CompensationModule } from '../common/compensation/compensation.module';

import { BlockchainController } from './controllers/blockchain.controller';
import { AdminGuard } from './guards/admin.guard';
import { SorobanDlqProcessor } from './processors/soroban-dlq.processor';
import { SorobanTxProcessor } from './processors/soroban-tx.processor';
import { IdempotencyService } from './services/idempotency.service';
import { SorobanService } from './services/soroban.service';
import { JobDeduplicationPlugin } from './plugins/job-deduplication.plugin';

@Module({
  imports: [
    CompensationModule,
    BullModule.registerQueue(
      {
        name: 'soroban-tx-queue',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
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
      },
      {
        name: 'soroban-dlq',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      },
    ),
  ],
  providers: [
    SorobanService,
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
