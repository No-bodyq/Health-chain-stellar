import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationVerificationStatus } from '../enums/organization-verification-status.enum';

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 200 })
  legalName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'license_number', type: 'varchar', length: 100, unique: true })
  licenseNumber: string;

  @Column({
    type: 'varchar',
    length: 40,
    default: OrganizationVerificationStatus.PENDING_VERIFICATION,
  })
  status: OrganizationVerificationStatus;

  @Column({ name: 'license_document_path', type: 'varchar', length: 512 })
  licenseDocumentPath: string;

  @Column({ name: 'certificate_document_path', type: 'varchar', length: 512 })
  certificateDocumentPath: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by_user_id', type: 'uuid', nullable: true })
  verifiedByUserId: string | null;

  /** Soroban / Stellar transaction hash recorded when the org is anchored on-chain. */
  @Column({ name: 'blockchain_tx_hash', type: 'varchar', length: 128, nullable: true })
  blockchainTxHash: string | null;

  /** Registry or contract identifier used for verified orgs (e.g. Soroban contract id). */
  @Column({ name: 'blockchain_address', type: 'varchar', length: 128, nullable: true })
  blockchainAddress: string | null;
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizationType } from '../enums/organization-type.enum';
import { VerificationStatus } from '../enums/verification-status.enum';

@Entity('organizations')
@Index('IDX_ORGANIZATIONS_TYPE', ['type'])
@Index('IDX_ORGANIZATIONS_VERIFICATION_STATUS', ['verificationStatus'])
@Index('IDX_ORGANIZATIONS_LOCATION', ['latitude', 'longitude'])
@Index('IDX_ORGANIZATIONS_CITY_COUNTRY', ['city', 'country'])
export class OrganizationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: OrganizationType,
  })
  type: OrganizationType;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'registration_number', type: 'varchar', length: 120, nullable: true })
  registrationNumber?: string | null;

  @Column({ name: 'license_number', type: 'varchar', length: 120, nullable: true })
  licenseNumber?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 40, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'address_line_1', type: 'varchar', length: 255 })
  addressLine1: string;

  @Column({ name: 'address_line_2', type: 'varchar', length: 255, nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'varchar', length: 120 })
  city: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 120 })
  country: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 30, nullable: true })
  postalCode?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @Column({ name: 'operating_hours', type: 'jsonb', nullable: true })
  operatingHours?: Record<string, unknown> | null;

  @Column({ name: 'verification_documents', type: 'jsonb', nullable: true })
  verificationDocuments?: Array<Record<string, unknown>> | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserEntity, (user) => user.organization)
  users: UserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
