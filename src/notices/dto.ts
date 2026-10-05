export enum NoticeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateNoticeDto {
  title: string;
  content: string;
  status?: NoticeStatus;
  expires_at?: Date;
  created_by: string;
  id?: string;
}

export class UpdateNoticeDto {
  title?: string;
  content?: string;
  status?: NoticeStatus;
  expires_at?: Date;
  id?: string;
}