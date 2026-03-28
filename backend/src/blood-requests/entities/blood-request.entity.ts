import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { BloodRequestStatus } from '../enums/blood-request-status.enum';

import { BloodRequestItemEntity } from './blood-request-item.entity';
import { BloodRequestReservationEntity } from './blood-request-reservation.entity';

export enum RequestUrgency {
  CRITICAL = 'CRITICAL', // < 2 hours
  URGENT = 'URGENT', // 2-6 hours
  ROUTINE = 'ROUTINE', // 6-24 hours
  SCHEDULED = 'SCHEDULED', // > 24 hours
}

// Backward compatibility export
export const Urgency = RequestUrgency;

export interface BloodRequestValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FulfillmentProgress {
  totalRequestedMl: number;
  totalFulfilledMl: number;
  totalRemainingMl: number;
  percentage: number;
  itemsCount: number;
  itemsFulfilledCount: number;
}

@Entity('blood_requests')
@Index('idx_blood_requests_hospital', ['hospitalId'])
@Index('idx_blood_requests_status', ['status'])
@Index('idx_blood_requests_urgency', ['urgency'])
@Index('idx_blood_requests_required_by', ['requiredByTimestamp'])
export class BloodRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_number', type: 'varchar', length: 64, unique: true })
  requestNumber: string;

  @Column({ name: 'hospital_id', type: 'varchar', length: 64 })
  hospitalId: string;

  @Column({
    type: 'enum',
    enum: RequestUrgency,
    default: RequestUrgency.ROUTINE,
  })
  urgency: RequestUrgency;

  @Column({ name: 'created_timestamp', type: 'bigint' })
  createdTimestamp: number;

  @Column({ name: 'required_by_timestamp', type: 'bigint' })
  requiredByTimestamp: number;

  @Column({
    type: 'varchar',
    length: 24,
    default: BloodRequestStatus.PENDING,
  })
  status: BloodRequestStatus;

  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    name: 'blockchain_tx_hash',
    type: 'varchar',
    length: 256,
    nullable: true,
  })
  blockchainTxHash: string | null;

  @Column({
    name: 'created_by_user_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  createdByUserId: string | null;

  @OneToMany(() => BloodRequestItemEntity, (item) => item.request, {
    cascade: true,
    eager: true,
  })
  items: BloodRequestItemEntity[];

  @OneToMany(() => BloodRequestReservationEntity, (res) => res.request, {
    cascade: true,
  })
  reservations: BloodRequestReservationEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Get total requested quantity across all items
   */
  getTotalRequestedMl(): number {
    return this.items?.reduce((sum, item) => sum + item.quantityMl, 0) ?? 0;
  }

  /**
   * Get total fulfilled quantity across all items
   */
  getTotalFulfilledMl(): number {
    return this.items?.reduce((sum, item) => sum + item.fulfilledQuantityMl, 0) ?? 0;
  }

  /**
   * Get total remaining to fulfill
   */
  getTotalRemainingMl(): number {
    return this.getTotalRequestedMl() - this.getTotalFulfilledMl();
  }

  /**
   * Check if the request is completely fulfilled
   */
  isFulfilled(): boolean {
    if (!this.items || this.items.length === 0) return false;
    return this.items.every((item) => item.isFulfilled());
  }

  /**
   * Get fulfillment progress across all items
   */
  getProgress(): FulfillmentProgress {
    const totalRequestedMl = this.getTotalRequestedMl();
    const totalFulfilledMl = this.getTotalFulfilledMl();
    const percentage = totalRequestedMl > 0 ? (totalFulfilledMl / totalRequestedMl) * 100 : 0;
    const itemsFulfilledCount = this.items?.filter((i) => i.isFulfilled()).length ?? 0;

    return {
      totalRequestedMl,
      totalFulfilledMl,
      totalRemainingMl: totalRequestedMl - totalFulfilledMl,
      percentage,
      itemsCount: this.items?.length ?? 0,
      itemsFulfilledCount,
    };
  }

  /**
   * Get the time remaining until required by timestamp (in seconds)
   */
  timeRemaining(currentTimestamp: number): number {
    if (this.requiredByTimestamp > currentTimestamp) {
      return this.requiredByTimestamp - currentTimestamp;
    }
    return 0;
  }

  /**
   * Check if the request is overdue
   */
  isOverdue(currentTimestamp: number): boolean {
    return this.requiredByTimestamp < currentTimestamp && !this.isFulfilled();
  }

  /**
   * Get the urgency level based on time remaining
   */
  getUrgencyLevel(currentTimestamp: number): Urgency {
    const timeRemainingHours = this.timeRemaining(currentTimestamp) / 3600;

    if (timeRemainingHours < 2) {
      return Urgency.CRITICAL;
    } else if (timeRemainingHours < 6) {
      return Urgency.URGENT;
    } else if (timeRemainingHours < 24) {
      return Urgency.ROUTINE;
    } else {
      return Urgency.SCHEDULED;
    }
  }

  /**
   * Validate the blood request data
   */
  validate(): BloodRequestValidationResult {
    const errors: string[] = [];

    // Validate quantity
    if (this.quantityMl <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    // Validate required by timestamp
    if (this.requiredByTimestamp <= this.createdTimestamp) {
      errors.push('Required by timestamp must be after creation timestamp');
    }

    // Validate blood type
    if (!Object.values(BloodType).includes(this.bloodType)) {
      errors.push('Invalid blood type');
    }

    // Validate component
    if (!Object.values(BloodComponent).includes(this.component)) {
      errors.push('Invalid blood component');
    }

    // Validate urgency
    if (!Object.values(Urgency).includes(this.urgency)) {
      errors.push('Invalid urgency level');
    }

    // Validate status
    if (!Object.values(BloodRequestStatus).includes(this.status)) {
      errors.push('Invalid request status');
    }

    // Validate fulfilled quantity
    if (this.fulfilledQuantityMl < 0) {
      errors.push('Fulfilled quantity cannot be negative');
    }

    if (this.fulfilledQuantityMl > this.quantityMl) {
      errors.push('Fulfilled quantity cannot exceed requested quantity');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get fulfillment progress
   */
  getFulfillmentProgress(): FulfillmentProgress {
    const remainingMl = Math.max(0, this.quantityMl - this.fulfilledQuantityMl);
    const percentage =
      this.quantityMl > 0
        ? Math.min(100, (this.fulfilledQuantityMl / this.quantityMl) * 100)
        : 0;

    return {
      requestedMl: this.quantityMl,
      fulfilledMl: this.fulfilledQuantityMl,
      remainingMl,
      percentage,
    };
  }

  /**
   * Add fulfilled quantity
   */
  addFulfilledQuantity(quantityMl: number): void {
    this.fulfilledQuantityMl = Math.min(
      this.quantityMl,
      this.fulfilledQuantityMl + quantityMl,
    );
  }

  /**
   * Assign a blood unit to this request
   */
  assignUnit(unitId: string): void {
    if (!this.assignedUnits) {
      this.assignedUnits = [];
    }
    if (!this.assignedUnits.includes(unitId)) {
      this.assignedUnits.push(unitId);
    }
  }

  /**
   * Remove a blood unit from this request
   */
  removeUnit(unitId: string): void {
    if (this.assignedUnits) {
      this.assignedUnits = this.assignedUnits.filter((id) => id !== unitId);
    }
  }

  /**
   * Check if a unit is assigned to this request
   */
  isUnitAssigned(unitId: string): boolean {
    return this.assignedUnits?.includes(unitId) ?? false;
  }

  /**
   * Get the number of assigned units
   */
  getAssignedUnitsCount(): number {
    return this.assignedUnits?.length ?? 0;
  }

  /**
   * Update the request status
   */
  updateStatus(newStatus: BloodRequestStatus): void {
    this.status = newStatus;
  }

  /**
   * Mark the request as fulfilled
   */
  markAsFulfilled(): void {
    this.status = BloodRequestStatus.FULFILLED;
    this.fulfilledQuantityMl = this.quantityMl;
  }

  /**
   * Mark the request as cancelled
   */
  markAsCancelled(): void {
    this.status = BloodRequestStatus.CANCELLED;
  }

  /**
   * Get a summary of the request
   */
  getSummary(currentTimestamp: number): Record<string, unknown> {
    const progress = this.getFulfillmentProgress();
    const timeRemaining = this.timeRemaining(currentTimestamp);

    return {
      id: this.id,
      requestNumber: this.requestNumber,
      hospitalId: this.hospitalId,
      bloodType: this.bloodType,
      component: this.component,
      quantityMl: this.quantityMl,
      urgency: this.urgency,
      status: this.status,
      requiredByTimestamp: this.requiredByTimestamp,
      timeRemainingSeconds: timeRemaining,
      isOverdue: this.isOverdue(currentTimestamp),
      isFulfilled: this.isFulfilled(),
      fulfillmentProgress: progress,
      assignedUnitsCount: this.getAssignedUnitsCount(),
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Check equality with another blood request
   */
  equals(other: BloodRequestEntity): boolean {
    return this.id === other.id;
  }

  /**
   * Create a plain object representation
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      requestNumber: this.requestNumber,
      hospitalId: this.hospitalId,
      bloodType: this.bloodType,
      component: this.component,
      quantityMl: this.quantityMl,
      urgency: this.urgency,
      createdTimestamp: this.createdTimestamp,
      requiredByTimestamp: this.requiredByTimestamp,
      status: this.status,
      assignedUnits: this.assignedUnits,
      fulfilledQuantityMl: this.fulfilledQuantityMl,
      deliveryAddress: this.deliveryAddress,
      notes: this.notes,
      blockchainTxHash: this.blockchainTxHash,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
