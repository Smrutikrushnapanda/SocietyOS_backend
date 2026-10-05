import type { IStorageProvider } from './interfaces/IStorageProvider.interface';
import { DataSource } from 'typeorm';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { AuditService } from '../audit/audit.service';
import { AuditCallContext } from '../audit/audit-context';
export declare class FileService {
    private readonly dataSource;
    private readonly storageProvider;
    private readonly auditService;
    constructor(dataSource: DataSource, storageProvider: IStorageProvider, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    upload(organizationId: string, uploadedBy: string, originalFilename: string, mimeType: string, buffer: Buffer, auditOptions?: AuditCallContext): Promise<FileMetadata>;
    retrieve(id: string, organizationId: string): Promise<{
        buffer: Buffer;
        metadata: FileMetadata;
    }>;
    remove(id: string, organizationId: string, userId: string, auditOptions?: AuditCallContext): Promise<void>;
    private findAuthorized;
}
