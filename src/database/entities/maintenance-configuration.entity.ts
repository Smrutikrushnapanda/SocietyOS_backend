import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('maintenance_configurations')
export class MaintenanceConfiguration {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 2000.0 })
  base_maintenance_amount: number;

  @Column({ type: 'integer' })
  due_day_of_month: number;

  @Column({ length: 20 })
  late_charge_type: 'FIXED' | 'PERCENTAGE';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100.0 })
  late_charge_value: number;

  @Column({ type: 'integer', default: 0 })
  late_charge_grace_days: number;

  @Column({ type: 'varchar', length: 10, default: 'ONCE' })
  late_charge_frequency: 'ONCE' | 'DAILY' | 'WEEKLY';

  @Column({ type: 'varchar', length: 20, default: 'FIRST_DAY' })
  late_charge_start: 'FIRST_DAY' | 'AFTER_PERIOD';

  @Column({ default: true })
  is_active: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
