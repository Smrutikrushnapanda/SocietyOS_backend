import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { RoleMaster } from './role-master.entity';
import { MenuMaster } from './menu-master.entity';

@Entity('role_menus')
@Unique(['roleId', 'menuId'])
@Index('idx_role_menus_role_id', ['roleId'])
@Index('idx_role_menus_menu_id', ['menuId'])
export class RoleMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'menu_id', type: 'uuid' })
  menuId: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ManyToOne(() => RoleMaster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleMaster;

  @ManyToOne(() => MenuMaster, (menu) => menu.roleMenus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: MenuMaster;
}
