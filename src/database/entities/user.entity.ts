import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'mobilenumber', length: 255, unique: true })
  mobileNumber: string;

  @Column({ name: 'isauthenticated', default: false })
  isAuthenticated: boolean;

  @Column({ name: 'refreshtokenid', length: 255, nullable: true })
  refreshTokenId: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({
    name: 'lastloginat',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastLoginAt: Date;

  @Column({
    name: 'createdat',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updatedat',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
