import { Organization } from './organization.entity';
export declare class Visitor {
    id: string;
    organization_id: string;
    name: string;
    mobile: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    organization: Organization;
}
