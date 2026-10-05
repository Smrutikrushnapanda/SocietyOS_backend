import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateVisitorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  organization_id?: string;
}
