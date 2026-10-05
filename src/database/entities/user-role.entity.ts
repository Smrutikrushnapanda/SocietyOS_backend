import { Entity, Column, ManyToOne, Unique, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Organization } from './organization.entity';

@Entity()
@Unique(['userId', 'organization_id'])
export class UserRole {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @ManyToOne(() => User, (user) => user.userRoles)
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles)
  role: Role;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;
}
