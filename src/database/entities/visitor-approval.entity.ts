import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VisitorVisit } from './visitor-visit.entity';
import { Organization } from './organization.entity';

@Entity('visitor_approvals')
export class VisitorApproval {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  visitor_visit_id: string;

  @Column({ type: 'uuid', nullable: true })
  approver_id: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date | null;

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

  @ManyToOne(() => VisitorVisit, (visit) => visit.id)
  @JoinColumn({ name: 'visitor_visit_id' })
  visitor_visit: VisitorVisit;
}
