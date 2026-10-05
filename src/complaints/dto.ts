export enum ComplaintCategory {
  MAINTENANCE = 'MAINTENANCE',
  FACILITY = 'FACILITY',
  AMENITY = 'AMENITY',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

export class CreateComplaintDto {
  resident_id: string;
  flat_id: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  assigned_to?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  id?: string;
}

export class UpdateComplaintDto {
  status?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_to?: string;
}