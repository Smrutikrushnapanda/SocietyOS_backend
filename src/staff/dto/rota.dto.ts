import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateRotaDto {
  @IsString()
  @IsNotEmpty()
  guard_name: string;

  @IsString()
  @IsNotEmpty()
  shift_name: string;

  @IsString()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @IsIn(['On Duty', 'Scheduled', 'Completed'])
  status?: string;
}

export class UpdateRotaDto {
  @IsString()
  @IsOptional()
  guard_name?: string;

  @IsString()
  @IsOptional()
  shift_name?: string;

  @IsString()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @IsIn(['On Duty', 'Scheduled', 'Completed'])
  status?: string;
}
