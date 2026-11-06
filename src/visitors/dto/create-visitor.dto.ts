import { IsString, IsNotEmpty, IsBoolean, MaxLength } from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile: string;

  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}
