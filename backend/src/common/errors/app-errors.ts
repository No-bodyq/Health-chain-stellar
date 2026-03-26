/**
 * Base class for all application errors.
 * Carries structured context for logging and auditing.
 */
export abstract class AppError extends Error {
  abstract readonly isRecoverable: boolean;

  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {},
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Preserve original stack when wrapping a cause
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Recoverable errors: transient failures that can be retried.
 * Examples: network timeouts, temporary DB unavailability.
 */
export class RecoverableError extends AppError {
  readonly isRecoverable = true;
}

/**
 * Irrecoverable errors: permanent failures requiring compensating action.
 * The system must revert state, notify operators, and flag for manual review.
 */
export class IrrecoverableError extends AppError {
  readonly isRecoverable = false;

  constructor(
    message: string,
    public readonly domain: FailureDomain,
    public readonly compensations: CompensationAction[],
    context: Record<string, unknown> = {},
    cause?: unknown,
  ) {
    super(message, context, cause);
  }
}

/** High-level domain where the failure occurred — used for routing and alerting. */
export enum FailureDomain {
  BLOCKCHAIN = 'blockchain',
  INVENTORY = 'inventory',
  BLOOD_REQUEST = 'blood_request',
  BLOOD_UNIT = 'blood_unit',
  DISPATCH = 'dispatch',
  NOTIFICATION = 'notification',
  ORDER = 'order',
}

/** Compensating actions that must be applied after an irrecoverable failure. */
export enum CompensationAction {
  REVERT_INVENTORY = 'revert_inventory',
  CANCEL_BLOOD_REQUEST = 'cancel_blood_request',
  CANCEL_ORDER = 'cancel_order',
  NOTIFY_ADMIN = 'notify_admin',
  NOTIFY_USER = 'notify_user',
  FLAG_FOR_REVIEW = 'flag_for_review',
  PERSIST_DLQ = 'persist_dlq',
}

// ─── Concrete domain errors ───────────────────────────────────────────────────

export class BlockchainTxIrrecoverableError extends IrrecoverableError {
  constructor(
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(
      message,
      FailureDomain.BLOCKCHAIN,
      [
        CompensationAction.PERSIST_DLQ,
        CompensationAction.NOTIFY_ADMIN,
        CompensationAction.FLAG_FOR_REVIEW,
      ],
      context,
      cause,
    );
  }
}

export class InventoryReservationIrrecoverableError extends IrrecoverableError {
  constructor(
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(
      message,
      FailureDomain.INVENTORY,
      [
        CompensationAction.REVERT_INVENTORY,
        CompensationAction.NOTIFY_ADMIN,
        CompensationAction.FLAG_FOR_REVIEW,
      ],
      context,
      cause,
    );
  }
}

export class BloodRequestIrrecoverableError extends IrrecoverableError {
  constructor(
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(
      message,
      FailureDomain.BLOOD_REQUEST,
      [
        CompensationAction.REVERT_INVENTORY,
        CompensationAction.CANCEL_BLOOD_REQUEST,
        CompensationAction.NOTIFY_USER,
        CompensationAction.NOTIFY_ADMIN,
        CompensationAction.FLAG_FOR_REVIEW,
      ],
      context,
      cause,
    );
  }
}

export class DispatchIrrecoverableError extends IrrecoverableError {
  constructor(
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(
      message,
      FailureDomain.DISPATCH,
      [
        CompensationAction.CANCEL_ORDER,
        CompensationAction.NOTIFY_ADMIN,
        CompensationAction.FLAG_FOR_REVIEW,
      ],
      context,
      cause,
    );
  }
}
