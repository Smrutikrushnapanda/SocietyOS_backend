export enum PollStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export class CreatePollDto {
  title: string;
  description?: string;
  starts_at: Date;
  ends_at: Date;
  created_by: string;
  id?: string;
  options?: CreatePollOptionDto[];
}

export class CreatePollOptionDto {
  option_text: string;
  display_order?: number;
}

export class VotePollDto {
  poll_id: string;
  option_id: string;
  id?: string;
}

export class UpdatePollDto {
  status?: PollStatus;
  id?: string;
}