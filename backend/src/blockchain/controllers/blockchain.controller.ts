import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

import { AdminGuard } from '../guards/admin.guard';
import { SorobanService } from '../services/soroban.service';
import { BlockchainCallbackDto } from '../dto/blockchain-callback.dto';

import type {
  SorobanTxJob,
  QueueMetrics,
  SorobanTxResult,
} from '../types/soroban-tx.types';

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(private sorobanService: SorobanService) {}

  /**
   * Submit a transaction to the Soroban queue.
   *
   * All contract calls must go through this endpoint.
   * Returns immediately with job ID for async status tracking.
   *
   * @param job - Transaction job with contractMethod, args, and idempotencyKey
   * @returns Job ID for status tracking
   * @throws 400 if idempotency key already exists (duplicate submission)
   */
  @Post('submit-transaction')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitTransaction(
    @Body() job: SorobanTxJob,
  ): Promise<{ jobId: string }> {
    const jobId = await this.sorobanService.submitTransaction(job);
    return { jobId };
  }

  private canonicalizePayload(payload: Record<string, unknown>): string {
    const sorted = Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const value = payload[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          acc[key] = this.canonicalizePayload(value as Record<string, unknown>);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});

    return JSON.stringify(sorted);
  }

  private verifyWebhookSignature(
    payload: Record<string, unknown>,
    providedSignature?: string,
  ): void {
    if (!providedSignature) {
      this.logger.warn('Missing webhook signature header');
      throw new UnauthorizedException('Missing signature');
    }

    const secret = process.env.BLOCKCHAIN_CALLBACK_SECRET;
    if (!secret) {
      this.logger.error('BLOCKCHAIN_CALLBACK_SECRET is not configured');
      throw new BadRequestException('Server misconfiguration');
    }

    const canonicalized = this.canonicalizePayload(payload);
    const expectedSignature = createHmac('sha256', secret)
      .update(canonicalized)
      .digest('hex');

    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      this.logger.warn('Blockchain callback signature verification failed', {
        eventId: payload.eventId,
        ip: 'unknown',
        endpoint: '/blockchain/webhook/callback',
      });
      throw new UnauthorizedException('Invalid signature');
    }
  }

  @Post('webhook/callback')
  @HttpCode(HttpStatus.OK)
  async processCallback(
    @Body() callback: BlockchainCallbackDto,
    @Req() request: Request,
  ): Promise<{ success: boolean }> {
    this.verifyWebhookSignature(callback, request.headers['x-webhook-signature'] as string);

    const eventTime = Date.parse(callback.timestamp);
    if (isNaN(eventTime)) {
      throw new BadRequestException('Invalid timestamp');
    }

    const ageMs = Math.abs(Date.now() - eventTime);
    const maxAgeMs = 5 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      this.logger.warn('Blockchain callback rejected due to stale timestamp', {
        eventId: callback.eventId,
        timestamp: callback.timestamp,
        ageMs,
      });
      throw new BadRequestException('Callback is stale');
    }

    const replayAllowed = await this.sorobanService.checkAndSetCallbackIdempotency(
      callback.eventId,
    );

    if (!replayAllowed) {
      this.logger.warn('Blockchain callback replay detected', {
        eventId: callback.eventId,
      });
      throw new ConflictException('Replay callback detected');
    }

    await this.sorobanService.processWebhookCallback(callback);

    this.logger.log('Blockchain callback processed successfully', {
      eventId: callback.eventId,
      transactionHash: callback.transactionHash,
      status: callback.status,
    });

    return { success: true };
  }

  /**
   * Get real-time queue metrics (admin only).
   *
   * Protected by AdminGuard - requires admin authentication.
   * Returns current queue depth, failed jobs, and DLQ count.
   *
   * @returns Queue metrics
   * @throws 403 if not authenticated as admin
   */
  @Get('queue/status')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getQueueStatus(): Promise<QueueMetrics> {
    return this.sorobanService.getQueueMetrics();
  }

  /**
   * Get status of a specific job.
   *
   * Returns current job state, error details, and retry count.
   *
   * @param jobId - Job ID to check
   * @returns Job status or null if not found
   */
  @Get('job/:jobId')
  @HttpCode(HttpStatus.OK)
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<SorobanTxResult | null> {
    return this.sorobanService.getJobStatus(jobId);
  }
}
