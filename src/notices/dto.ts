import { NoticePriority } from './notice-policy';
import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength, IsDateString, IsBoolean, Matches } from 'class-validator';

export enum NoticeStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateNoticeDto {
  @IsOptional()
  @IsEnum(NoticePriority)
  priority?: NoticePriority;
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @IsOptional()
  @IsDateString()
  expires_at?: Date | string;
}

export class UpdateNoticeDto {
  @IsOptional()
  @IsEnum(NoticePriority)
  priority?: NoticePriority;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @IsOptional()
  @IsDateString()
  expires_at?: Date | string;
}
export class PublishNoticeDto {
  @IsOptional()
  @IsBoolean()
  confirmEmergency?: boolean;
}
export class ScheduleNoticeDto extends PublishNoticeDto {
  @IsDateString()
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  publishAt: string;
}
