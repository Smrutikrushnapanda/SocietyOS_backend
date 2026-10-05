import { DataSource } from 'typeorm';
import { Notice } from '../database/entities/notice.entity';
import { CreateNoticeDto } from './dto';
import { AuditService } from '../audit/audit.service';
export declare class NoticeService {
    private readonly dataSource;
    private readonly auditService;
    constructor(dataSource: DataSource, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createDto: CreateNoticeDto, authenticatedUserId: string, orgContext: any): Promise<Notice>;
    findAll(orgContext: any): Promise<Notice[]>;
    findOne(id: string, orgContext: any): Promise<Notice | null>;
    publish(id: string, orgContext: any): Promise<Notice | null>;
    expire(id: string, orgContext: any): Promise<Notice | null>;
    archive(id: string, orgContext: any): Promise<Notice | null>;
}
