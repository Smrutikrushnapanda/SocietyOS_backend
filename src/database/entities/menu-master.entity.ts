import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { RoleMaster } from './role-master.entity';
import { AdminUser } from './admin-user.entity';
import { RoleMenu } from './role-menu.entity';

@Entity('menu_master')
@Index('idx_menu_master_role_id', ['roleId'])
@Index('idx_menu_master_parent_id', ['parentId'])
@Index('idx_menu_master_is_active', ['isActive'])
@Index('idx_menu_master_order_index', ['orderIndex'])
export class MenuMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_name', type: 'varchar', length: 150 })
  menuName: string;

  @Column({ name: 'menu_path', type: 'varchar', length: 255, nullable: true })
  menuPath: string | null;

  @Column({ name: 'icon_name', type: 'varchar', length: 100, nullable: true })
  iconName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  orderIndex: number;

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

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById?: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string;

  @ManyToOne(() => MenuMaster, (menu) => menu.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: MenuMaster;

  @OneToMany(() => MenuMaster, (menu) => menu.parent)
  children?: MenuMaster[];

  @ManyToOne(() => AdminUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: AdminUser;

  @ManyToOne(() => AdminUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy?: AdminUser;

  @ManyToOne(() => RoleMaster, (role) => role.menus, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role?: RoleMaster;

  @OneToMany(() => RoleMenu, (rm) => rm.menu)
  roleMenus?: RoleMenu[];
}
