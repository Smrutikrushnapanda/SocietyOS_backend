import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FilesModule } from '../files/files.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SocietySettingsService } from './settings.service';
import { SocietySettingsController } from './settings.controller';
@Module({ imports: [DatabaseModule, OrganizationModule, AuthorizationModule, FilesModule, WhatsAppModule], providers: [SocietySettingsService], controllers: [SocietySettingsController], exports: [SocietySettingsService] })
export class SocietySettingsModule {}
