import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateRoleMasterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accessType: string;
}

export class UpdateRoleMasterDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  accessType?: string;
}
