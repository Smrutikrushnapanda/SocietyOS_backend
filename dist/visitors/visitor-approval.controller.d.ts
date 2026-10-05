import { VisitorApprovalService } from './visitor-approval.service';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { CreateVisitorApprovalDto } from './dto/create-visitor-approval.dto';
import { UpdateVisitorApprovalDto } from './dto/update-visitor-approval.dto';
export declare class VisitorApprovalController {
    private readonly visitorApprovalService;
    constructor(visitorApprovalService: VisitorApprovalService);
    createVisitorApproval(createVisitorApprovalDto: CreateVisitorApprovalDto): Promise<VisitorApproval>;
    findAllVisitorApprovals(): Promise<VisitorApproval[]>;
    findVisitorApproval(id: string): Promise<VisitorApproval>;
    updateVisitorApproval(id: string, updateVisitorApprovalDto: UpdateVisitorApprovalDto): Promise<VisitorApproval>;
    removeVisitorApproval(id: string): Promise<VisitorApproval>;
}
