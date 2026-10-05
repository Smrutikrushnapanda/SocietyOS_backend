import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { NotificationService } from './notification.service';
import { PushTokenService } from './push-token.service';
import { NotificationController } from './notification.controller';
import { PushTokenController } from './push-token.controller';
import { FirebaseNotificationProvider } from './providers/firebase-notification.provider';
import { NOTIFICATION_PROVIDER } from './interfaces/INotificationProvider.interface';

@Module({
  imports: [DatabaseModule, OrganizationModule],
  providers: [
    PushTokenService,
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: FirebaseNotificationProvider,
    },
    NotificationService,
  ],
  controllers: [NotificationController, PushTokenController],
  exports: [NotificationService, PushTokenService],
})
export class NotificationsModule {}
