import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { NotificationCategory } from '../notification-preferences.policy';

export class NotificationPreferenceUpdateDto {
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceUpdateDto)
  updates: NotificationPreferenceUpdateDto[];
}
