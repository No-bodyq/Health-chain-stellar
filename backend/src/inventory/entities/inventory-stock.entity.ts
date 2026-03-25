import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('inventory_stocks')
@Index(
  'idx_inventory_stocks_bank_blood_type_unique',
  ['bloodBankId', 'bloodType'],
  {
    unique: true,
  },
)
export class InventoryStockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_bank_id', type: 'varchar' })
  bloodBankId: string;

  @Column({ name: 'blood_type', type: 'varchar' })
  bloodType: string;

  @Column({ name: 'available_units', type: 'int', default: 0 })
  availableUnits: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
