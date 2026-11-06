import type { MasterSettings } from '../../society-settings/settings.model';
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('organizations')
export class Organization {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  identifier: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

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

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb", select: false })
  master_settings: Partial<MasterSettings>;

  @OneToMany(() => UserRole, (userRole) => userRole.organization)
  userRoles: UserRole[];
}
