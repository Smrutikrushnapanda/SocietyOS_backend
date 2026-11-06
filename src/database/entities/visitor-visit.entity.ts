import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Visitor } from './visitor.entity';
import { Organization } from './organization.entity';
import { Resident } from './resident.entity';

@Entity('visitor_visits')
export class VisitorVisit {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  visitor_id: string;

  @Column({ type: 'uuid' })
  host_resident_id: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
  })
  visit_status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

  @Column({ type: 'varchar', length: 255, nullable: true })
  visit_purpose: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expected_entry_time: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_entry_time: Date | null;

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

  @ManyToOne(() => Resident, (resident) => resident.id)
  @JoinColumn({ name: 'host_resident_id' })
  host_resident: Resident;
}
