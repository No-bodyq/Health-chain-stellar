import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { IdempotencyService } from './idempotency.service';
import {
  SorobanTxJob,
  SorobanTxResult,
  QueueMetrics,
} from '../types/soroban-tx.types';

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly DEFAULT_MAX_RETRIES = 5;
  private readonly BASE_DELAY = 1000; // 1 second
  private readonly MAX_DELAY = 60000; // 60 seconds

  constructor(
    @InjectQueue('soroban-tx-queue') private txQueue: Queue,
    @InjectQueue('soroban-dlq') private dlq: Queue,
    private idempotencyService: IdempotencyService,
  ) {}

  /**
   * Submit a transaction to the queue with idempotency guarantee.
   * All Soroban contract calls must go through this method.
   *
   * @param job - Transaction job with contractMethod, args, and idempotencyKey
   * @returns Job ID for status tracking
   * @throws Error if idempotency key already exists (duplicate submission)
   */
  async submitTransaction(job: SorobanTxJob): Promise<string> {
    // Enforce idempotency: prevent duplicate submissions
    const isNew = await this.idempotencyService.checkAndSetIdempotencyKey(
      job.idempotencyKey,
    );

    if (!isNew) {
      this.logger.warn(
        `Duplicate submission detected for idempotency key: ${job.idempotencyKey}`,
      );
      throw new Error('Duplicate submission - idempotency key already exists');
    }

    const maxRetries = job.maxRetries ?? this.DEFAULT_MAX_RETRIES;

    // Add job to queue with exponential backoff and jitter
    const queueJob = await this.txQueue.add(job, {
      attempts: maxRetries,
      backoff: {
        type: 'exponential',
        delay: this.BASE_DELAY,
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for audit trail
      jobId: job.idempotencyKey,
    });

    this.logger.log(
      `Transaction queued: ${queueJob.id} (${job.contractMethod}) with ${maxRetries} max retries`,
    );
    return String(queueJob.id);
  }

  /**
   * Submit and block until the Soroban worker finishes (success or failure).
   * Used for flows that must persist on-chain proof before completing a workflow.
   */
  async submitTransactionAndWait(
    job: SorobanTxJob,
    timeoutMs = 120_000,
  ): Promise<{ transactionHash: string }> {
    const jobId = await this.submitTransaction(job);
    const bullJob = await this.txQueue.getJob(jobId);
    if (!bullJob) {
      throw new Error(`Queued Soroban job not found: ${jobId}`);
    }

    const completion = bullJob.finished() as Promise<{
      success: boolean;
      transactionHash: string;
    }>;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Soroban job ${jobId} timed out after ${timeoutMs}ms`,
            ),
          ),
        timeoutMs,
      ),
    );

    const result = await Promise.race([completion, timeout]);
    if (!result?.success || !result.transactionHash) {
      throw new Error('Soroban job completed without a transaction hash');
    }
    return { transactionHash: result.transactionHash };
  }

  /**
   * Get real-time queue metrics for admin monitoring.
   *
   * @returns Queue depth, failed jobs count, and DLQ count
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    const [queueDepth, failedJobs, dlqCount] = await Promise.all([
      this.txQueue.count(),
      this.txQueue.getFailedCount(),
      this.dlq.count(),
    ]);

    return {
      queueDepth,
      failedJobs,
      dlqCount,
      processingRate: 0, // Calculated separately if needed
    };
  }

  /**
   * Get status of a specific job.
   *
   * @param jobId - Job ID to check
   * @returns Job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<SorobanTxResult | null> {
    const job = await this.txQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      jobId: String(job.id),
      transactionHash: job.data.transactionHash,
      status: state as 'pending' | 'completed' | 'failed' | 'dlq',
      error: job.failedReason,
      retryCount: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  /**
   * Calculate exponential backoff delay with jitter.
   * Prevents thundering herd problem during retries.
   *
   * Formula: min(baseDelay * 2^(attempt-1) + jitter, maxDelay)
   * Jitter: random 0-10% of exponential delay
   *
   * @param attemptNumber - Attempt number (1-based)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attemptNumber: number): number {
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, this.MAX_DELAY);
    return Math.floor(delay);
  }
}
