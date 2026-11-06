import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MaintenanceDue } from './maintenance-due.entity';
import { User } from './user.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';
import { Organization } from './organization.entity';

@Entity('payments')
export class Payment {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid', nullable: true })
  resident_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string | null;

  @Column({ type: 'uuid' })
  maintenance_due_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 20 })
  payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';

  @Column({ length: 20 })
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

  @Column({ type: 'timestamp' })
  payment_date: Date;

  @Column({ type: 'uuid', nullable: true })
  transaction_id: string | null;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => MaintenanceDue, (due) => due.id)
  @JoinColumn({ name: 'maintenance_due_id' })
  maintenance_due: MaintenanceDue;

  @ManyToOne(() => User, (user) => user.userRoles)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @ManyToOne(() => Resident, (resident) => resident.id)
  @JoinColumn({ name: 'resident_id' })
  resident: Resident | null;

  @ManyToOne(() => Flat, (flat) => flat.id)
  @JoinColumn({ name: 'flat_id' })
  flat: Flat | null;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
