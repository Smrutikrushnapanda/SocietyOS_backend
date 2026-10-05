import { Visitor } from './visitor.entity';
export declare class VisitorVisit {
    id: string;
    organization_id: string;
    visitor_id: string;
    visit_status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
    visit_purpose: string | null;
    expected_entry_time: Date | null;
    actual_entry_time: Date | null;
    createdAt: Date;
    updatedAt: Date;
    visitor: Visitor;
}
