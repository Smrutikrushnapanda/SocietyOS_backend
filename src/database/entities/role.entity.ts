import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { RolePermission } from './role-permission.entity';
import { AdminUser } from './admin-user.entity';
import { MenuMaster } from './menu-master.entity';

@Entity('role_master')
@Index('idx_role_master_name', ['name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'access_type', type: 'varchar', length: 50, default: 'Full Access' })
  accessType: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => AdminUser, (adminUser) => adminUser.role)
  adminUsers: AdminUser[];

  @OneToMany(() => MenuMaster, (menu) => menu.role)
  menus: MenuMaster[];
}

export { Role as RoleMaster };
