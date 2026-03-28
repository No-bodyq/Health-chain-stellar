import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('delivery_compliance')
@Index(['deliveryId'], { unique: true })
export class DeliveryComplianceEntity extends BaseEntity {
  @Column({ name: 'delivery_id', unique: true })
  deliveryId: string;

  @Column({ name: 'order_id', nullable: true, type: 'varchar' })
  orderId: string | null;

  @Column({ name: 'is_compliant', default: true })
  isCompliant: boolean;

  @Column({ name: 'excursion_count', default: 0 })
  excursionCount: number;

  @Column({ name: 'min_temp_celsius', type: 'float', nullable: true })
  minTempCelsius: number | null;

  @Column({ name: 'max_temp_celsius', type: 'float', nullable: true })
  maxTempCelsius: number | null;

  @Column({ name: 'compliance_hash', type: 'varchar', nullable: true })
  complianceHash: string | null;

  @Column({ name: 'evaluated_at', type: 'timestamptz', nullable: true })
  evaluatedAt: Date | null;
}
