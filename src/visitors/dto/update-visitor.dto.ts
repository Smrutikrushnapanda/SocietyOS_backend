import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateVisitorDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobile?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
