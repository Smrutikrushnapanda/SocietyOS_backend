import { DataSource } from 'typeorm';
import { AuditLog } from './audit.entity';
import { AuditSanitizer } from './audit-sanitizer';
import { AuditLogFilters, AuditLogInput, AuditLogPage } from './audit.dto';
export declare class AuditService {
    private readonly dataSource;
    private readonly sanitizer;
    private readonly logger;
    constructor(dataSource: DataSource, sanitizer: AuditSanitizer);
    record(input: AuditLogInput): Promise<void>;
    findAll(organizationId: string, filters?: AuditLogFilters): Promise<AuditLogPage>;
    findOne(id: string, organizationId: string): Promise<AuditLog | null>;
    private parseEnumFilter;
    private parseDateFilter;
    private parsePositiveInt;
}
