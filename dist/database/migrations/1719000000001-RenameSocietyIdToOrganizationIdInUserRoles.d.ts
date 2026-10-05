import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class RenameSocietyIdToOrganizationIdInUserRoles1719000000001 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
