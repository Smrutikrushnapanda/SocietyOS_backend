import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Visitor } from './visitor.entity';
import { VisitorVisit } from './visitor-visit.entity';
import { Organization } from './organization.entity';

@Entity('visitor_passes')
export class VisitorPass {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  visitor_id: string;

  @Column({ type: 'uuid', nullable: true })
  visitor_visit_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuer: string | null;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE',
  })
  pass_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';

  @Column({ type: 'timestamp' })
  validity_start: Date;

  @Column({ type: 'timestamp' })
  validity_end: Date;

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

  @ManyToOne(() => Visitor, (visitor) => visitor.id)
  @JoinColumn({ name: 'visitor_id' })
  visitor: Visitor;

  @ManyToOne(() => VisitorVisit, (visit) => visit.id, { nullable: true })
  @JoinColumn({ name: 'visitor_visit_id' })
  visitor_visit: VisitorVisit | null;
}
