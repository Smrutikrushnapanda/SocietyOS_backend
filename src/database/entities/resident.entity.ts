import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Flat } from './flat.entity';

@Entity()
export class Resident {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
  })
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  app_access_status: boolean;

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

  @ManyToOne(() => User, (user) => user.userRoles)
  user: User;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;

  @ManyToOne(() => Flat, (flat) => flat.id)
  flat: Flat;
}
