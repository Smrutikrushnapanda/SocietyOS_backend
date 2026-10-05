import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import { Complaint } from '../database/entities/complaint.entity';
export declare class ComplaintController {
    private readonly complaintService;
    constructor(complaintService: ComplaintService);
    create(createDto: CreateComplaintDto, req: any): Promise<Complaint>;
    findAll(req: any): Promise<Complaint[]>;
    findOne(req: any, id: string): Promise<Complaint | null>;
    update(req: any, id: string, updateDto: UpdateComplaintDto): Promise<Complaint | null>;
    assign(req: any, id: string, assignedTo: string): Promise<Complaint | null>;
    resolve(req: any, id: string, reason: string): Promise<Complaint | null>;
}
