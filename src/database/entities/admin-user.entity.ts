import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RoleMaster } from './role-master.entity';

@Entity('admin_user')
@Index('idx_admin_user_role_id', ['roleId'])
@Index('idx_admin_user_whatsapp', ['whatsappNumber'], { unique: true })
@Index('idx_admin_user_email', ['email'], { unique: true })
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 20, unique: true })
  whatsappNumber: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

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

  @ManyToOne(() => RoleMaster, (role) => role.adminUsers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_id' })
  role: RoleMaster;
}
