import { Entity, Column, ManyToOne, Unique, PrimaryColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Organization } from './organization.entity';

@Entity('user_roles')
@Unique(['userId', 'organization_id'])
export class UserRole {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @PrimaryColumn('uuid', { name: 'role_id' })
  roleId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id: string;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

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

  @ManyToOne(() => User, (user) => user.userRoles)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
