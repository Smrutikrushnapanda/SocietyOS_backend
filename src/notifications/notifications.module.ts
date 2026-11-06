import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationService } from './notification.service';
import { PushTokenService } from './push-token.service';
import { NotificationController } from './notification.controller';
import { PushTokenController } from './push-token.controller';
import { FirebaseNotificationProvider } from './providers/firebase-notification.provider';
import { NOTIFICATION_PROVIDER } from './interfaces/INotificationProvider.interface';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';

@Module({
  imports: [
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    forwardRef(() => WhatsAppModule),
  ],
  providers: [
    NotificationPreferencesService,
    PushTokenService,
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: FirebaseNotificationProvider,
    },
    NotificationService,
  ],
  controllers: [
    NotificationController,
    PushTokenController,
    NotificationPreferencesController,
  ],
  exports: [NotificationService, PushTokenService, NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
