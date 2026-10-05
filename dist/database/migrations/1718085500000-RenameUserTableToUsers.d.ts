import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class RenameUserTableToUsers1718085500000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
