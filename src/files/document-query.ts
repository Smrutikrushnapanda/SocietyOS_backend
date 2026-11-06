import { SelectQueryBuilder } from 'typeorm';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { Resident } from '../database/entities/resident.entity';

export function documentsOnly(query: SelectQueryBuilder<FileMetadata>, includeResidentFiles = false): void {
  query.andWhere("f.purpose = 'DOCUMENT'");
  query.andWhere("f.document_scope IN ('SOCIETY', 'FLAT')");
  query.andWhere("COALESCE(f.category, '') NOT IN ('Society Amenity Photo', 'Profile Photo')");
  if (!includeResidentFiles) query.andWhere('f.resident_id IS NULL');
  // Legacy photos lack a purpose marker. Preserve rows while excluding verified profile links.
  query.andWhere(
    (builder) =>
      'NOT EXISTS ' +
      builder
        .subQuery()
        .select('1')
        .from(Resident, 'photo_owner')
        .where('photo_owner.organization_id = f.organization_id')
        .andWhere('photo_owner.profile_photo_file_id = f.id')
        .getQuery(),
  );
}
