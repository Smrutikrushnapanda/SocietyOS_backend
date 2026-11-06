import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAmenityBookingDto {
  @IsUUID() @IsOptional() resident_id?: string;
  @IsUUID() @IsOptional() amenity_id?: string;
  @IsString() @IsNotEmpty() amenity: string;
  @IsString() @IsOptional() resident?: string;
  @IsString() @IsOptional() flat?: string;
  @IsString() @IsNotEmpty() date: string;
  @IsString() @IsNotEmpty() slot: string;
  @IsInt() @Min(1) guests: number;
  @IsNumber() @IsOptional() @Min(0) amount?: number;
}

export class UpdateBookingStatusDto {
  @IsString() @IsNotEmpty() @IsIn(['Approved', 'Rejected', 'Cancelled', 'Revoked']) status: 'Approved' | 'Rejected' | 'Cancelled' | 'Revoked';
}
