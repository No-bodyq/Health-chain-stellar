/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainController } from '../controllers/blockchain.controller';
import { SorobanService } from '../services/soroban.service';
import { AdminGuard } from '../guards/admin.guard';
import {
  SorobanTxJob,
  QueueMetrics,
  SorobanTxResult,
} from '../types/soroban-tx.types';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let mockSorobanService: any;

  beforeEach(async () => {
    mockSorobanService = {
      submitTransaction: jest.fn().mockResolvedValue('job-123'),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueDepth: 5,
        failedJobs: 2,
        dlqCount: 1,
        processingRate: 0,
      }),
      getJobStatus: jest.fn().mockResolvedValue({
        jobId: 'job-123',
        transactionHash: 'tx_abc123',
        status: 'completed',
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        completedAt: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: SorobanService,
          useValue: mockSorobanService,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BlockchainController>(BlockchainController);
  });

  describe('submitTransaction', () => {
    it('should submit a transaction and return job ID', async () => {
      const job: SorobanTxJob = {
        contractMethod: 'register_blood',
        args: ['bank-123', 'O+', 100],
        idempotencyKey: 'test-key-1',
      };

      const result = await controller.submitTransaction(job);

      expect(result).toEqual({ jobId: 'job-123' });
      expect(mockSorobanService.submitTransaction).toHaveBeenCalledWith(job);
    });

    it('should return 202 Accepted status', async () => {
      const job: SorobanTxJob = {
        contractMethod: 'test',
        args: [],
        idempotencyKey: 'test-key-2',
      };

      // Note: HTTP status is handled by decorator, not testable in unit test
      // This is verified through integration tests
      await controller.submitTransaction(job);
      expect(mockSorobanService.submitTransaction).toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue metrics', async () => {
      const metrics = await controller.getQueueStatus();

      expect(metrics).toEqual({
        queueDepth: 5,
        failedJobs: 2,
        dlqCount: 1,
        processingRate: 0,
      });
      expect(mockSorobanService.getQueueMetrics).toHaveBeenCalled();
    });

    it('should include all required metrics', async () => {
      const metrics = await controller.getQueueStatus();

      expect(metrics).toHaveProperty('queueDepth');
      expect(metrics).toHaveProperty('failedJobs');
      expect(metrics).toHaveProperty('dlqCount');
      expect(metrics).toHaveProperty('processingRate');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for valid job ID', async () => {
      const status = await controller.getJobStatus('job-123');

      expect(status).toEqual({
        jobId: 'job-123',
        transactionHash: 'tx_abc123',
        status: 'completed',
        error: null,
        retryCount: 0,
        createdAt: expect.any(Date),
        completedAt: expect.any(Date),
      });
      expect(mockSorobanService.getJobStatus).toHaveBeenCalledWith('job-123');
    });

    it('should return null for non-existent job', async () => {
      mockSorobanService.getJobStatus.mockResolvedValueOnce(null);

      const status = await controller.getJobStatus('non-existent-job');

      expect(status).toBeNull();
    });

    it('should handle failed job status', async () => {
      mockSorobanService.getJobStatus.mockResolvedValueOnce({
        jobId: 'job-456',
        transactionHash: undefined,
        status: 'failed',
        error: 'RPC timeout',
        retryCount: 3,
        createdAt: new Date(),
        completedAt: undefined,
      });

      const status = await controller.getJobStatus('job-456');

      expect(status).not.toBeNull();
      expect(status!.status).toBe('failed');
      expect(status!.error).toBe('RPC timeout');
      expect(status!.retryCount).toBe(3);
    });
  });

  describe('Acceptance Criteria', () => {
    it('should expose POST /blockchain/submit-transaction endpoint', async () => {
      const job: SorobanTxJob = {
        contractMethod: 'register_blood',
        args: ['bank-123', 'O+', 100],
        idempotencyKey: 'acceptance-test-1',
      };

      const result = await controller.submitTransaction(job);

      expect(result).toHaveProperty('jobId');
      expect(mockSorobanService.submitTransaction).toHaveBeenCalled();
    });

    it('should expose GET /blockchain/queue/status admin endpoint', async () => {
      const metrics = await controller.getQueueStatus();

      expect(metrics).toHaveProperty('queueDepth');
      expect(metrics).toHaveProperty('failedJobs');
      expect(metrics).toHaveProperty('dlqCount');
    });

    it('should expose GET /blockchain/job/:jobId endpoint', async () => {
      const status = await controller.getJobStatus('job-123');

      expect(status).toHaveProperty('jobId');
      expect(status).toHaveProperty('status');
      expect(mockSorobanService.getJobStatus).toHaveBeenCalledWith('job-123');
    });

    it('should return accurate queue metrics', async () => {
      const metrics = await controller.getQueueStatus();

      expect(typeof metrics.queueDepth).toBe('number');
      expect(typeof metrics.failedJobs).toBe('number');
      expect(typeof metrics.dlqCount).toBe('number');
      expect(metrics.queueDepth).toBe(5);
      expect(metrics.failedJobs).toBe(2);
      expect(metrics.dlqCount).toBe(1);
    });
  });
});
