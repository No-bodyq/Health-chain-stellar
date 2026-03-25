import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityType } from '../enums/activity-type.enum';

@Entity('user_activities')
@Index('IDX_USER_ACTIVITY_USER_ID', ['userId'])
@Index('IDX_USER_ACTIVITY_ACTIVITY_TYPE', ['activityType'])
@Index('IDX_USER_ACTIVITY_CREATED_AT', ['createdAt'])
@Index('IDX_USER_ACTIVITY_USER_TYPE_CREATED_AT', [
  'userId',
  'activityType',
  'createdAt',
])
export class UserActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 120, nullable: true })
  userId?: string | null;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 1024, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
