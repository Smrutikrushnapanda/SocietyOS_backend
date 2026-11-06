import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { CURRENCIES, TEMPLATE_KEYS, type CurrencyCode, type TemplateKey } from './settings.model';
export class ProfileSettingsDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @MaxLength(2000) address: string;
  @IsString() @MaxLength(150) registrationNumber: string;
  @IsIn(Object.keys(CURRENCIES)) currencyCode: CurrencyCode;
}
export class BrandingSettingsDto {
  @IsOptional() @IsUUID() campusImageFileId?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(100) campusTitle: string;
  @IsString() @MaxLength(300) campusDescription: string;
  @IsIn(['forest', 'blue', 'plum']) accent: 'forest' | 'blue' | 'plum';
  @IsString() @Matches(/^(?:[0-9]{10})?$/, { message: 'Office phone must contain exactly 10 digits' }) officePhone: string;
  @IsOptional() @MaxLength(254) @IsEmail() officeEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(150) officeHours?: string;
  @IsOptional() @IsString() @Matches(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$|^$/) officeOpenTime?: string;
  @IsOptional() @IsString() @Matches(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$|^$/) officeCloseTime?: string;
}
export class EmergencyContactDto {
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsString() @Matches(/^\+?[0-9][0-9 ()-]{1,28}[0-9]$/) phone: string;
  @IsString() @MaxLength(500) description: string;
  @IsIn(['Emergency', 'Urgent', 'Standard']) priority: 'Emergency' | 'Urgent' | 'Standard';
  @IsBoolean() is24x7: boolean;
  @IsBoolean() residentVisible: boolean;
  @IsBoolean() guardVisible: boolean;
  @IsBoolean() active: boolean;
}
export class TemplateSettingsDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) visitorArrival: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) maintenanceDue: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) maintenanceOverdue: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) notice: string;
}
export class TemplateTestDto {
  @IsIn(TEMPLATE_KEYS) template: TemplateKey;
  @IsString() @Matches(/^(?:\+?91[ -]?)?[6-9]\d{9}$/) recipientNumber: string;
}
