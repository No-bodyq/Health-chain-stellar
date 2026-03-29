import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { PolicyVersionStatus } from '../enums/policy-version-status.enum';
import { OperationalPolicyRules } from '../policy-config.types';

@Entity('policy_versions')
@Index(['policyName', 'version'], { unique: true })
export class PolicyVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'policy_name', default: 'operational-core' })
  policyName: string;

  @Column({ type: 'int' })
  version: number;

  @Column({
    type: 'enum',
    enum: PolicyVersionStatus,
    default: PolicyVersionStatus.DRAFT,
  })
  status: PolicyVersionStatus;

  @Column({ type: 'jsonb' })
  rules: OperationalPolicyRules;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ name: 'effective_from', type: 'timestamptz', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ name: 'activated_by', nullable: true })
  activatedBy: string | null;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'rollback_from_version_id', nullable: true })
  rollbackFromVersionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
