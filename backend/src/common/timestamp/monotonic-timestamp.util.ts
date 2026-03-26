import { BadRequestException } from '@nestjs/common';

/**
 * Throws BadRequestException when `next` is not strictly after `previous`.
 * Use this at every point where a new timestamp is committed to ensure the
 * temporal sequence is monotonically increasing and logically consistent.
 *
 * @param previous - The already-persisted reference timestamp.
 * @param next     - The incoming timestamp that must come after `previous`.
 * @param label    - Human-readable context for the error message.
 */
export function assertMonotonicTimestamp(
  previous: Date,
  next: Date,
  label: string,
): void {
  if (next.getTime() <= previous.getTime()) {
    throw new BadRequestException(
      `Invalid temporal sequence: ${label} timestamp (${next.toISOString()}) ` +
        `must be strictly after the previous timestamp (${previous.toISOString()}).`,
    );
  }
}

/**
 * Throws BadRequestException when `timestamp` is not strictly in the future
 * relative to `now` (defaults to the current wall-clock time).
 */
export function assertTimestampInFuture(
  timestamp: Date,
  label: string,
  now: Date = new Date(),
): void {
  if (timestamp.getTime() <= now.getTime()) {
    throw new BadRequestException(
      `Invalid timestamp: ${label} (${timestamp.toISOString()}) must be in the future.`,
    );
  }
}
