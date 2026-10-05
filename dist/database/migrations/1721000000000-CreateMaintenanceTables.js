"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMaintenanceTables1721000000000 = void 0;
class CreateMaintenanceTables1721000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_configurations (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        base_maintenance_amount decimal(10,2) NOT NULL DEFAULT 2000.00,
        due_day_of_month integer NOT NULL DEFAULT 10,
        late_charge_type varchar(20) NOT NULL DEFAULT 'FIXED',
        late_charge_value decimal(10,2) NOT NULL DEFAULT 100.00,
        late_charge_grace_days integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_mc_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_dues (
        id uuid PRIMARY KEY,
        flat_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        base_maintenance_amount decimal(10,2) NOT NULL,
        maintenance_multiplier decimal(10,2) NOT NULL,
        calculated_amount decimal(10,2) NOT NULL,
        billing_period_start date NOT NULL,
        billing_period_end date NOT NULL,
        due_date date NOT NULL,
        late_charge decimal(10,2) NOT NULL DEFAULT 0,
        late_charge_waived decimal(10,2) NOT NULL DEFAULT 0,
        late_charge_waived_by uuid,
        late_charge_waived_at timestamp,
        late_charge_waiver_reason text,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        payment_received_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_md_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
        CONSTRAINT fk_md_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_md_waived_by FOREIGN KEY (late_charge_waived_by) REFERENCES users(id),
        CONSTRAINT uq_md_org_flat_period UNIQUE (organization_id, flat_id, billing_period_start, billing_period_end)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        resident_id uuid,
        flat_id uuid,
        maintenance_due_id uuid NOT NULL,
        amount decimal(10,2) NOT NULL,
        payment_method varchar(20) NOT NULL DEFAULT 'UPI',
        payment_status varchar(20) NOT NULL DEFAULT 'PENDING',
        payment_date timestamp NOT NULL,
        transaction_id varchar(255),
        created_by uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pay_maintenance_due FOREIGN KEY (maintenance_due_id) REFERENCES maintenance_dues(id),
        CONSTRAINT fk_pay_resident FOREIGN KEY (resident_id) REFERENCES residents(id),
        CONSTRAINT fk_pay_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
        CONSTRAINT fk_pay_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS payments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS maintenance_dues CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS maintenance_configurations CASCADE`);
    }
}
exports.CreateMaintenanceTables1721000000000 = CreateMaintenanceTables1721000000000;
//# sourceMappingURL=1721000000000-CreateMaintenanceTables.js.map