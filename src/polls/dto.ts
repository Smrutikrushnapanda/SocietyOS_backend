import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PollStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export enum PollType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
}

export class CreatePollOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  option_text: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class CreatePollDto {
  @IsOptional()
  @IsEnum(PollType)
  poll_type?: PollType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  starts_at: Date | string;

  @IsDateString()
  @IsNotEmpty()
  ends_at: Date | string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  options?: CreatePollOptionDto[];
}

export class VotePollDto {
  @IsUUID()
  @IsNotEmpty()
  poll_id: string;

  @IsOptional()
  @IsUUID()
  option_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  option_ids?: string[];
}

export class UpdatePollDto {
  @IsOptional()
  @IsEnum(PollStatus)
  status?: PollStatus;
}

export class EditPollOptionDto extends CreatePollOptionDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class EditPollDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(PollType) poll_type?: PollType;
  @IsOptional() @IsDateString() starts_at?: string;
  @IsOptional() @IsDateString() ends_at?: string;
  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => EditPollOptionDto)
  options?: EditPollOptionDto[];
}
