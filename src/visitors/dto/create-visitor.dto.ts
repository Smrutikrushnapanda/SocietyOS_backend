import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsBoolean()
  @IsNotEmpty()
  active: boolean;

  @IsString()
  @IsNotEmpty()
  organization_id: string;
}
