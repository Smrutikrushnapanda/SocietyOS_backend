import { DataSource } from 'typeorm';
import { Complaint } from '../database/entities/complaint.entity';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import { AuditService } from '../audit/audit.service';
export declare class ComplaintService {
    private readonly dataSource;
    private readonly auditService;
    constructor(dataSource: DataSource, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createDto: CreateComplaintDto, authenticatedResidentId: string, orgContext: any): Promise<Complaint>;
    findAll(orgContext: any): Promise<Complaint[]>;
    findOne(id: string, orgContext: any): Promise<Complaint | null>;
    update(id: string, updateDto: UpdateComplaintDto, orgContext: any): Promise<Complaint | null>;
    assign(id: string, assignedTo: string, orgContext: any): Promise<Complaint | null>;
    resolve(id: string, reason: string, orgContext: any): Promise<Complaint | null>;
}
