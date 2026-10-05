import { DataSource } from 'typeorm';
import { Payment } from '../database/entities/payment.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class PaymentService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createDto: {
        organization_id: string;
        resident_id?: string;
        flat_id?: string;
        maintenance_due_id: string;
        amount: number;
        payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
    }, creatorUserId: string): Promise<Payment>;
    findOne(id: string, orgContext: any): Promise<Payment>;
    findAllByOrganization(organizationId: string, orgContext: any): Promise<Payment[]>;
    findAllByResident(residentId: string, orgContext: any): Promise<Payment[]>;
    markCompleted(paymentId: string, orgContext: any): Promise<Payment>;
    markFailed(paymentId: string, orgContext: any): Promise<Payment>;
}
