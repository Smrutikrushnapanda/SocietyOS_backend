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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
