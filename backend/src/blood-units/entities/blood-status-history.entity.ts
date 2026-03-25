import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BaseEntity,
} from 'typeorm';
import { BloodStatus } from '../enums/blood-status.enum';
import { BloodUnit } from './blood-unit.entity';

@Entity('blood_status_history')
@Index('idx_blood_status_history_unit_id', ['bloodUnitId'])
export class BloodStatusHistory extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_unit_id', type: 'varchar' })
  bloodUnitId: string;

  @ManyToOne(() => BloodUnit, (unit) => unit.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blood_unit_id' })
  bloodUnit: BloodUnit;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: BloodStatus,
    nullable: true,
  })
  previousStatus: BloodStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: BloodStatus,
  })
  newStatus: BloodStatus;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ name: 'changed_by', type: 'varchar', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
