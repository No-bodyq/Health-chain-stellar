/**
 * Dispatch ↔ Riders Contract Fixture
 *
 * Contract: Dispatch.assignOrder() must call Riders to update availability
 * - Consumer: Dispatch service
 * - Provider: Riders service
 *
 * This ensures riders cannot be double-assigned and their state stays coherent.
 */

import {
  createInteraction,
  createServiceContract,
} from '../utils/interaction-matcher';

/**
 * Assign order to rider (reserve rider)
 */
export const AssignOrderToRiderInteraction = createInteraction(
  'Assign order to rider',
  'Dispatch',
  'Riders',
  {
    method: 'PATCH',
    path: '/riders/rider-001/status',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-jwt-token',
    },
    body: {
      status: 'busy',
      reason: 'Assigned to order ORD-12345',
      orderId: 'ORD-12345',
    },
  },
  {
    status: 200,
    body: {
      id: 'rider-001',
      status: 'busy',
      lastUpdated: '2026-03-26T10:00:00Z',
      currentOrderId: 'ORD-12345',
    },
  },
);

/**
 * Rider already busy error
 */
export const RiderAlreadyBusyErrorInteraction = createInteraction(
  'Rider busy error',
  'Dispatch',
  'Riders',
  {
    method: 'PATCH',
    path: '/riders/rider-001/status',
    body: {
      status: 'busy',
      orderId: 'ORD-12346',
    },
  },
  {
    status: 409,
    body: {
      error: 'RIDER_UNAVAILABLE',
      message: 'Rider is already assigned to order ORD-12345',
      currentStatus: 'busy',
      currentOrderId: 'ORD-12345',
    },
  },
);

/**
 * Release rider from order
 */
export const ReleaseRiderFromOrderInteraction = createInteraction(
  'Release rider from order',
  'Dispatch',
  'Riders',
  {
    method: 'PATCH',
    path: '/riders/rider-001/status',
    body: {
      status: 'available',
      reason: 'Order ORD-12345 completed',
    },
  },
  {
    status: 200,
    body: {
      id: 'rider-001',
      status: 'available',
      lastUpdated: '2026-03-26T10:05:00Z',
      currentOrderId: null,
    },
  },
);

export const DispatchRidersContract = createServiceContract(
  'Dispatch-Riders',
  '1.0.0',
  [
    AssignOrderToRiderInteraction,
    RiderAlreadyBusyErrorInteraction,
    ReleaseRiderFromOrderInteraction,
  ],
);
