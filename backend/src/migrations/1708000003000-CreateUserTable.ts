import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserTable1708000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            default: "'donor'",
          },
          {
            name: 'region',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
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

    // Seed some admin users
    await queryRunner.query(`
      INSERT INTO users (id, email, name, role, region, phone_number, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), 'admin.nairobi@donorhub.com', 'Nairobi Admin', 'admin', 'Nairobi', '+254700000001', now(), now()),
        (uuid_generate_v4(), 'admin.mombasa@donorhub.com', 'Mombasa Admin', 'admin', 'Mombasa', '+254700000002', now(), now()),
        (uuid_generate_v4(), 'global.admin@donorhub.com', 'Global Admin', 'admin', 'Global', '+254700000003', now(), now())
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
