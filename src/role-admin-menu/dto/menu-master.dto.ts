import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuMasterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  menuName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  menuPath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  iconName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  orderIndex?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsOptional()
  roleId?: string;

  @IsArray()
  @IsOptional()
  roleIds?: string[];
}

export class UpdateMenuMasterDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  menuName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  menuPath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  iconName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  orderIndex?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsOptional()
  roleId?: string | null;

  @IsArray()
  @IsOptional()
  roleIds?: string[];
}
