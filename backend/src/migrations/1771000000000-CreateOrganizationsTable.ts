import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOrganizationsTable1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'legal_name', type: 'varchar', length: '200' },
          { name: 'email', type: 'varchar', length: '255' },
          { name: 'phone', type: 'varchar', length: '32' },
          { name: 'address', type: 'text', isNullable: true },
          {
            name: 'license_number',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '40',
            default: `'pending_verification'`,
          },
          { name: 'license_document_path', type: 'varchar', length: '512' },
          { name: 'certificate_document_path', type: 'varchar', length: '512' },
          { name: 'rejection_reason', type: 'text', isNullable: true },
          { name: 'verified_at', type: 'timestamp', isNullable: true },
          { name: 'verified_by_user_id', type: 'uuid', isNullable: true },
          {
            name: 'blockchain_tx_hash',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'blockchain_address',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_organizations_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('organizations', 'IDX_organizations_status');
    await queryRunner.dropTable('organizations', true);
  }
}
