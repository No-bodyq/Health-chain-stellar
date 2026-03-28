import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DisputeReasonTaxonomy, DisputeSeverity, DisputeStatus } from '../enums/dispute.enum';

@Entity('disputes')
@Index(['orderId'])
@Index(['status'])
export class DisputeEntity extends BaseEntity {
  @Column({ name: 'order_id', nullable: true, type: 'varchar' })
  orderId: string | null;

  @Column({ name: 'payment_id', nullable: true, type: 'varchar' })
  paymentId: string | null;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'enum', enum: DisputeSeverity, default: DisputeSeverity.MEDIUM })
  severity: DisputeSeverity;

  @Column({ type: 'enum', enum: DisputeReasonTaxonomy })
  reason: DisputeReasonTaxonomy;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'opened_by' })
  openedBy: string;

  @Column({ name: 'assigned_to', nullable: true, type: 'varchar' })
  assignedTo: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'evidence', type: 'jsonb', nullable: true })
  evidence: Array<{ type: string; url: string; addedAt: string }> | null;

  @Column({ name: 'contract_dispute_id', nullable: true, type: 'varchar' })
  contractDisputeId: string | null;
}
