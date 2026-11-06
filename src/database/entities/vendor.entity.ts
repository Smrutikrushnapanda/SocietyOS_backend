import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  service_category: string;

  @Column({ length: 100 })
  contact_person: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ length: 100, default: '24 Hours' })
  sla: string;

  @Column({ length: 20, default: 'Active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
