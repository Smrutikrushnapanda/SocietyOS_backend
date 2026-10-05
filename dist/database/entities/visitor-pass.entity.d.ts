import { Visitor } from './visitor.entity';
import { VisitorVisit } from './visitor-visit.entity';
export declare class VisitorPass {
    id: string;
    organization_id: string;
    visitor_id: string;
    visitor_visit_id: string | null;
    issuer: string | null;
    pass_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    validity_start: Date;
    validity_end: Date;
    createdAt: Date;
    updatedAt: Date;
    visitor: Visitor;
    visitor_visit: VisitorVisit | null;
}
