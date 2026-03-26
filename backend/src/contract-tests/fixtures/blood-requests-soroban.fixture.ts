/**
 * BloodRequests ↔ SorobanService Contract Fixture
 *
 * Contract: BloodRequests must submit immutable on-chain records
 * - Consumer: BloodRequests service
 * - Provider: SorobanService (blockchain)
 *
 * This contract ensures all blood requests create an immutable on-chain
 * proof that cannot be modified or deleted on-chain.
 */

import {
  createInteraction,
  createServiceContract,
} from '../utils/interaction-matcher';

/**
 * Submit transaction to blockchain
 */
export const SubmitBloodRequestBlockchainInteraction = createInteraction(
  'Submit blood request to blockchain',
  'BloodRequests',
  'SorobanService',
  {
    method: 'POST',
    path: '/blockchain/submit-transaction',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-jwt-token',
    },
    body: {
      idempotencyKey: 'BR-12345-ABC-idempotent',
      contractMethod: 'register_request',
      args: [
        'hospital-uuid',
        ['A+'], // blood types needed
        [5], // quantities
        Math.floor(Date.now() / 1000) + 86400, // requiredBy (24h from now)
      ],
      maxRetries: 5,
    },
  },
  {
    status: 202, // Accepted (async)
    body: {
      jobId: 'JOB-12345-soroban-tx',
      status: 'QUEUED',
      idempotencyKey: 'BR-12345-ABC-idempotent',
      createdAt: '2026-03-26T10:00:00Z',
    },
  },
);

/**
 * Duplicate submission (idempotency enforcement)
 */
export const DuplicateSubmissionErrorInteraction = createInteraction(
  'Duplicate submission error',
  'BloodRequests',
  'SorobanService',
  {
    method: 'POST',
    path: '/blockchain/submit-transaction',
    body: {
      idempotencyKey: 'BR-12345-ABC-idempotent', // Same key
      contractMethod: 'register_request',
      args: ['hospital-uuid', ['A+'], [5]],
    },
  },
  {
    status: 409, // Conflict
    body: {
      error: 'DUPLICATE_SUBMISSION',
      message: 'Idempotency key already processed',
      previousJobId: 'JOB-12345-soroban-tx',
    },
  },
);

/**
 * Get transaction status
 */
export const GetTransactionStatusInteraction = createInteraction(
  'Get transaction status',
  'BloodRequests',
  'SorobanService',
  {
    method: 'GET',
    path: '/blockchain/submit-transaction/JOB-12345-soroban-tx',
    headers: {
      Authorization: 'Bearer valid-jwt-token',
    },
  },
  {
    status: 200,
    body: {
      jobId: 'JOB-12345-soroban-tx',
      status: 'COMPLETED',
      result: {
        success: true,
        transactionHash: 'aa1122334455...', // Real tx hash
        requestId: 123, // On-chain request ID
        timestamp: 1711430400,
      },
      attempts: 1,
      createdAt: '2026-03-26T10:00:00Z',
      completedAt: '2026-03-26T10:02:30Z',
    },
  },
);

export const BloodRequestsSorobanContract = createServiceContract(
  'BloodRequests-Soroban',
  '1.0.0',
  [
    SubmitBloodRequestBlockchainInteraction,
    DuplicateSubmissionErrorInteraction,
    GetTransactionStatusInteraction,
  ],
);
