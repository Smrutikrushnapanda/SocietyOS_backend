import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Flat } from './flat.entity';

@Entity('residents')
export class Resident {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string;

  /**
   * Resident profile fields. Stored on the resident record (not the global
   * auth identity) so that several residents (owner + tenant + family) can
   * share a single flat with their own details.
   */
  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string;

  @Column({
    name: 'resident_type',
    type: 'varchar',
    length: 20,
    default: 'OWNER',
  })
  resident_type: 'OWNER' | 'TENANT' | 'FAMILY';

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  is_primary: boolean;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
  })
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  app_access_status: boolean;

  /**
   * Onboard New Resident profile fields.
   *
   * All nullable so existing residents (and residents created through the
   * minimal `POST /residents` path) keep working. `resident_type` continues to
   * use OWNER | TENANT | FAMILY; the UI labels FAMILY as "Family Member".
   */

  /** Reference to a private file_metadata row used as the profile photo. */
  @Column({ name: 'profile_photo_file_id', type: 'uuid', nullable: true })
  profile_photo_file_id: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth: string | null;

  @Column({
    name: 'emergency_contact_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  emergency_contact_name: string | null;

  @Column({
    name: 'emergency_contact_relationship',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  emergency_contact_relationship: string | null;

  @Column({
    name: 'emergency_contact_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  emergency_contact_phone: string | null;

  @Column({ name: 'move_in_date', type: 'date', nullable: true })
  move_in_date: string | null;

  /** For FAMILY residents: relationship to the flat's owner / primary resident. */
  @Column({
    name: 'relationship_to_primary',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  relationship_to_primary: string | null;

  /** For TENANT residents: the flat owner's name and contact. */
  @Column({ name: 'owner_name', type: 'varchar', length: 150, nullable: true })
  owner_name: string | null;

  @Column({ name: 'owner_contact', type: 'varchar', length: 20, nullable: true })
  owner_contact: string | null;

  /** Optional vehicle details captured at onboarding. */
  @Column({ name: 'vehicle_details', type: 'jsonb', nullable: true })
  vehicle_details:
    | Array<{
        type?: string;
        make?: string;
        model?: string;
        registration?: string;
      }>
    | null;

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

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Flat, (flat) => flat.id)
  @JoinColumn({ name: 'flat_id' })
  flat: Flat;
}
