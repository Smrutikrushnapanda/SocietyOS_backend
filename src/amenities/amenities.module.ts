import { BusinessNotificationEventsModule } from '../notifications/delivery/business-notification-events';
import { Module } from '@nestjs/common';
import { AmenitiesController } from './amenities.controller';
import { AmenitiesService } from './amenities.service';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationModule } from '../organization/organization.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    BusinessNotificationEventsModule,
    DatabaseModule,
    AuthorizationModule,
    OrganizationModule,
    FilesModule,
  ],
  controllers: [AmenitiesController],
  providers: [AmenitiesService],
  exports: [AmenitiesService],
})
export class AmenitiesModule {}
