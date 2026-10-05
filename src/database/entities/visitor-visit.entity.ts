import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Visitor } from './visitor.entity';
import { Organization } from './organization.entity';

@Entity()
export class VisitorVisit {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  visitor_id: string;

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
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Visitor, (visitor) => visitor.id)
  visitor: Visitor;
}
