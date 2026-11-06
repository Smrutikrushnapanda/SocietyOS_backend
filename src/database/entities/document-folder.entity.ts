import { Entity, PrimaryColumn, Column, Index, BeforeInsert } from 'typeorm';
import { randomUUID } from 'crypto';

/**
 * Document Repository folder.
 *
 * A folder is a logical container inside an organization used to group
 * `file_metadata` records. Two folder types exist:
 *   - SOCIETY : society-wide compliance repository folders.
 *   - FLAT    : confidential per-flat vault folders (scoped to one flat).
 *
 * Nested folders are supported through `parent_id`. Organization isolation is
 * guaranteed by `organization_id` on every row and every query.
 */
@Entity('document_folders')
@Index('idx_document_folders_org_parent', ['organization_id', 'parent_id'])
@Index('idx_document_folders_org_flat', ['organization_id', 'flat_id'])
export class DocumentFolder {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  private ensureId(): void {
    if (!this.id) {
      this.id = randomUUID();
    }
  }

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @Index()
  @Column({ type: 'uuid' })
  created_by: string;

  /** Self-referencing parent; NULL means a root-level folder. */
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 30, default: 'SOCIETY' })
  folder_type: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  building_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  floor_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
