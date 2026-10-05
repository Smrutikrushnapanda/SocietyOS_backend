import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity()
export class Organization {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  identifier: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

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

  @OneToMany(() => UserRole, (userRole) => userRole.organization)
  userRoles: UserRole[];
}
