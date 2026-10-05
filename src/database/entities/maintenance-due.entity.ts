import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Flat } from './flat.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class MaintenanceDue {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  flat_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_maintenance_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  maintenance_multiplier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  calculated_amount: number;

  @Column({ type: 'date' })
  billing_period_start: Date;

  @Column({ type: 'date' })
  billing_period_end: Date;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  late_charge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  late_charge_waived: number;

  @Column({ type: 'uuid', nullable: true })
  late_charge_waived_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  late_charge_waived_at: Date | null;

  @Column({ type: 'text', nullable: true })
  late_charge_waiver_reason: string | null;

  @Column({ length: 20, default: 'PENDING' })
  status: 'PENDING' | 'OVERDUE' | 'PAID';

  @Column({ type: 'timestamp', nullable: true })
  payment_received_at: Date | null;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Flat, (flat) => flat.id)
  flat: Flat;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;

  @ManyToOne(() => User, (user) => user.userRoles)
  waivedByUser: User | null;
}
