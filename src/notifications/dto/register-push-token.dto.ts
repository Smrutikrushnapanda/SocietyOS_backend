import { PushTokenPlatform } from '../../database/entities/push-token.entity';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S+$/, { message: 'Invalid push registration' })
  @MaxLength(500)
  token: string;

  @IsEnum(PushTokenPlatform)
  @IsNotEmpty()
  platform: PushTokenPlatform;

  @IsOptional()
  @IsUUID()
  previousTokenId?: string;
}
