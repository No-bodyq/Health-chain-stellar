import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAccountSecurityColumns1708000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'password_hash',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'failed_login_attempts',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'locked_until',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'password_history',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password_history');
    await queryRunner.dropColumn('users', 'locked_until');
    await queryRunner.dropColumn('users', 'failed_login_attempts');
    await queryRunner.dropColumn('users', 'password_hash');
  }
}
