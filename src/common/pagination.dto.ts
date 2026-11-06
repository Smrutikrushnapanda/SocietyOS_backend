import { Type } from 'class-transformer';
import { IsInt, Max, Min, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CollectionPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

export class NoticePageDto extends CollectionPageDto {
  @IsOptional() @IsUUID() recordId?: string;
  @IsOptional() @IsIn(['all', 'NORMAL', 'IMPORTANT', 'EMERGENCY'])
  priority?: string;
}
export class PollPageDto extends CollectionPageDto {
  @IsOptional() @IsIn(['all', 'PUBLISHED', 'CLOSED'])
  status?: string;
}
