import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FileController } from './file.controller';
import { FolderController } from './folder.controller';
import { FileService } from './file.service';
import { FolderService } from './folder.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/IStorageProvider.interface';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    OrganizationModule,
    AuthorizationModule,
    AuditModule,
  ],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
    FileService,
    FolderService,
  ],
  controllers: [FolderController, FileController],
  exports: [FileService, FolderService, STORAGE_PROVIDER],
})
export class FilesModule {}
