import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('delivery_proofs')
export class DeliveryProofEntity extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'rider_id' })
  riderId: string;

  @Column({ name: 'request_id', nullable: true, type: 'varchar' })
  requestId: string | null;

  @Column({ name: 'recipient_name' })
  recipientName: string;

  @Column({ name: 'recipient_signature_url', nullable: true, type: 'varchar' })
  recipientSignatureUrl: string | null;

  @Column({ name: 'photo_url', nullable: true, type: 'varchar' })
  photoUrl: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt: Date;

  @Column({ name: 'temperature_celsius', type: 'float', nullable: true })
  temperatureCelsius: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_temperature_compliant', default: true })
  isTemperatureCompliant: boolean;
}
