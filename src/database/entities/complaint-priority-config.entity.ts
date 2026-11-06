import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('complaint_priority_configs')
export class ComplaintPriorityConfig {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 30 })
  priority: string; // 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 3 })
  order_severity: number;

  @Column({ type: 'int', default: 60 })
  response_deadline_minutes: number;

  @Column({ type: 'int', default: 720 })
  resolution_deadline_minutes: number;

  @Column({ type: 'int', default: 360 })
  escalation_window_minutes: number;

  @Column({ length: 255, default: 'Facility Desk' })
  escalation_recipient: string;

  @Column({ length: 20, default: 'Active' })
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
