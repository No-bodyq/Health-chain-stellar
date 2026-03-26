import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateOrganizationTable1708000005000 implements MigrationInterface {
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
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['BLOOD_BANK', 'HOSPITAL', 'COLLECTION_CENTER'],
          },
          {
            name: 'verification_status',
            type: 'enum',
            enum: ['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'],
            default: "'PENDING'",
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'license_number',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '40',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'address_line_1',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'address_line_2',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'state',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'operating_hours',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'verification_documents',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'review_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    await queryRunner.createIndices('organizations', [
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_TYPE',
        columnNames: ['type'],
      }),
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_VERIFICATION_STATUS',
        columnNames: ['verification_status'],
      }),
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_LOCATION',
        columnNames: ['latitude', 'longitude'],
      }),
      new TableIndex({
        name: 'IDX_ORGANIZATIONS_CITY_COUNTRY',
        columnNames: ['city', 'country'],
      }),
    ]);

    const usersTable = await queryRunner.getTable('users');
    const hasOrganizationId = usersTable?.findColumnByName('organization_id');
    if (!hasOrganizationId) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'organization_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_USERS_ORGANIZATION_ID',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const organizationFk = usersTable?.foreignKeys.find(
      (fk) => fk.name === 'FK_USERS_ORGANIZATION_ID',
    );
    if (organizationFk) {
      await queryRunner.dropForeignKey('users', organizationFk);
    }

    const hasOrganizationId = usersTable?.findColumnByName('organization_id');
    if (hasOrganizationId) {
      await queryRunner.dropColumn('users', 'organization_id');
    }

    await queryRunner.dropIndex(
      'organizations',
      'IDX_ORGANIZATIONS_CITY_COUNTRY',
    );
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATIONS_LOCATION');
    await queryRunner.dropIndex(
      'organizations',
      'IDX_ORGANIZATIONS_VERIFICATION_STATUS',
    );
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATIONS_TYPE');
    await queryRunner.dropTable('organizations');
  }
}
