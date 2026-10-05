import { VisitorVisitService } from './visitor-visit.service';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { CreateVisitorVisitDto } from './dto/create-visitor-visit.dto';
import { UpdateVisitorVisitDto } from './dto/update-visitor-visit.dto';
export declare class VisitorVisitController {
    private readonly visitorVisitService;
    constructor(visitorVisitService: VisitorVisitService);
    createVisitorVisit(createVisitorVisitDto: CreateVisitorVisitDto): Promise<VisitorVisit>;
    findAllVisitorVisits(): Promise<VisitorVisit[]>;
    findVisitorVisit(id: string): Promise<VisitorVisit>;
    updateVisitorVisit(id: string, updateVisitorVisitDto: UpdateVisitorVisitDto): Promise<VisitorVisit>;
    removeVisitorVisit(id: string): Promise<VisitorVisit>;
}
