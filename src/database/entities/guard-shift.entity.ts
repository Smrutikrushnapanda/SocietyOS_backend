import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('guard_shifts')
export class GuardShift {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 30, default: '06:00 AM' })
  start_time: string;

  @Column({ length: 30, default: '02:00 PM' })
  end_time: string;

  @Column({ type: 'int', default: 2 })
  required_guards: number;

  @Column({ type: 'int', default: 2 })
  assigned_guards: number;

  @Column({ length: 255, default: 'Gate 1, Gate 2' })
  assigned_gates: string;

  @Column({ length: 30, default: 'Active' })
  status: string;

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

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
