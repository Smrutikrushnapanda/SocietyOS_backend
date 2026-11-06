import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('file_metadata')
export class FileMetadata {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @Index()
  @Column({ type: 'uuid' })
  uploaded_by: string;

  @Column({ length: 255 })
  original_filename: string;

  @Column({ length: 512 })
  stored_key: string;

  @Column({ length: 100 })
  mime_type: string;

  @Column({ type: 'integer' })
  size_bytes: number;

  @Column({ length: 50, default: 'LOCAL' })
  storage_provider: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 30, default: 'DOCUMENT' })
  purpose: 'DOCUMENT' | 'PROFILE_PHOTO' | 'ATTACHMENT';

  @Column({ type: 'varchar', length: 50, default: 'SOCIETY' })
  document_scope: string;

  @Column({ type: 'varchar', length: 100, default: 'General' })
  category: string;

  @Column({ type: 'uuid', nullable: true })
  building_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  floor_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string | null;

  /**
   * Optional link to the resident a document belongs to (e.g. identity proof,
   * rental agreement, profile photo captured at onboarding). Nullable so
   * society-level documents are unaffected.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  resident_id: string | null;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Optional containing folder in the document repository. */
  @Column({ type: 'uuid', nullable: true })
  folder_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
