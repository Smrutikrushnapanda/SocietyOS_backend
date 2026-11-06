import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('duty_rotas')
export class DutyRota {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 150 })
  guard_name: string;

  @Column({ length: 150 })
  shift_name: string;

  @Column({ length: 150, default: 'Gate 1 (Main ANPR)' })
  gate: string;

  @Column({ length: 50, default: 'Today' })
  date: string;

  @Column({ length: 30, default: 'Scheduled' })
  status: string; // 'On Duty' | 'Scheduled' | 'Completed'

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
