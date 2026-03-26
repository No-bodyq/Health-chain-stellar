/**
 * Auth ↔ All Protected APIs Contract Fixture
 *
 * Contract: All protected routes must enforce JWT authentication
 * - Consumer: Any client
 * - Provider: Auth guards on all controllers
 *
 * This ensures that authentication is consistently enforced across
 * all protected API endpoints without exception.
 */

import {
  createInteraction,
  createServiceContract,
} from '../utils/interaction-matcher';

/**
 * Missing authorization header
 */
export const MissingAuthHeaderErrorInteraction = createInteraction(
  'Missing auth header',
  'Client',
  'Auth',
  {
    method: 'GET',
    path: '/blood-requests',
    headers: {
      // NO Authorization header
    },
  },
  {
    status: 401,
    body: {
      error: 'UNAUTHORIZED',
      message: 'Missing authorization header',
    },
  },
);

/**
 * Invalid JWT token
 */
export const InvalidJWTTokenErrorInteraction = createInteraction(
  'Invalid JWT token',
  'Client',
  'Auth',
  {
    method: 'GET',
    path: '/blood-requests',
    headers: {
      Authorization: 'Bearer invalid.jwt.token',
    },
  },
  {
    status: 401,
    body: {
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    },
  },
);

/**
 * Valid JWT with insufficient permissions
 */
export const InsufficientPermissionsErrorInteraction = createInteraction(
  'Insufficient permissions',
  'Client',
  'Auth',
  {
    method: 'POST',
    path: '/blood-requests',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-nurse-token', // Nurse role without CREATE permission
    },
    body: {
      hospitalId: 'hospital-001',
      requiredBy: '2026-03-27T10:00:00Z',
      items: [{ bloodType: 'A+', quantity: 5 }],
    },
  },
  {
    status: 403,
    body: {
      error: 'FORBIDDEN',
      message: 'Insufficient permissions: CREATE_BLOOD_REQUEST required',
      requiredPermission: 'CREATE_BLOOD_REQUEST',
      grantedPermissions: ['VIEW_BLOOD_REQUESTS', 'VIEW_INVENTORY'],
    },
  },
);

/**
 * Valid authorization
 */
export const ValidAuthorizationInteraction = createInteraction(
  'Valid authorization',
  'Client',
  'Auth',
  {
    method: 'GET',
    path: '/blood-requests',
    headers: {
      Authorization: 'Bearer valid-admin-token',
    },
  },
  {
    status: 200,
    body: {
      data: [], // Actual response depends on service
    },
  },
);

export const AuthContract = createServiceContract('Auth', '1.0.0', [
  MissingAuthHeaderErrorInteraction,
  InvalidJWTTokenErrorInteraction,
  InsufficientPermissionsErrorInteraction,
  ValidAuthorizationInteraction,
]);
