import { IsNotEmpty, IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalFloors?: number;
}

export class UpdateBuildingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalFloors?: number;
}
