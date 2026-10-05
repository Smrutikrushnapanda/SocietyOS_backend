import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/IStorageProvider.interface';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, OrganizationModule, AuditModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
    FileService,
  ],
  controllers: [FileController],
  exports: [FileService],
})
export class FilesModule {}
