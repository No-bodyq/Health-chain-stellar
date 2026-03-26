import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CompensationAction, FailureDomain } from '../errors/app-errors';

export enum FailureRecordStatus {
  PENDING_REVIEW = 'pending_review',
  COMPENSATED = 'compensated',
  RESOLVED = 'resolved',
}

@Entity('failure_records')
export class FailureRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable summary of what failed. */
  @Column({ type: 'text' })
  message: string;

  /** Domain that produced the failure (blockchain, inventory, etc.). */
  @Column({ type: 'varchar', length: 64 })
  domain: FailureDomain;

  /** Compensating actions that were applied. */
  @Column({ type: 'simple-array' })
  compensationsApplied: CompensationAction[];

  /** Compensating actions that failed to apply (requires manual intervention). */
  @Column({ type: 'simple-array', default: '' })
  compensationsFailed: CompensationAction[];

  /** Structured context captured at failure time (IDs, payloads, etc.). */
  @Column({ type: 'jsonb', default: '{}' })
  context: Record<string, unknown>;

  /** Original stack trace for debugging. */
  @Column({ type: 'text', nullable: true })
  stackTrace: string | null;

  /** Correlation ID for tracing across services. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  correlationId: string | null;

  /** Current review status. */
  @Column({
    type: 'varchar',
    length: 32,
    default: FailureRecordStatus.PENDING_REVIEW,
  })
  status: FailureRecordStatus;

  /** Notes added by the operator during manual review. */
  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
