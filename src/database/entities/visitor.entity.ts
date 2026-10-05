import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { VisitorVisit } from './visitor-visit.entity';

@Entity()
export class Visitor {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  mobile: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

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

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;
}
