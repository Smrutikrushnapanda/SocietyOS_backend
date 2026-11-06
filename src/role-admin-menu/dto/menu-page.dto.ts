import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MenuPageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsIn([10, 20, 50]) limit: number = 10;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
}
