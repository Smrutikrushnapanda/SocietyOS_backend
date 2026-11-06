import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuthModule } from '../auth/auth.module';
import { RoleMasterService } from './role-master.service';
import { RoleMasterController } from './role-master.controller';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { MenuMasterService } from './menu-master.service';
import { MenuMasterController } from './menu-master.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule, AuthModule],
  controllers: [
    RoleMasterController,
    AdminUserController,
    MenuMasterController,
  ],
  providers: [
    RoleMasterService,
    AdminUserService,
    MenuMasterService,
  ],
  exports: [
    RoleMasterService,
    AdminUserService,
    MenuMasterService,
  ],
})
export class RoleAdminMenuModule {}
