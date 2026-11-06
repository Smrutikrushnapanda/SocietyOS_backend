import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { VisitorLiveAuthorization } from './visitor-live.authorization';
import { VisitorLiveEvents } from './visitor-live.events';
import { VisitorLiveGateway } from './visitor-live.gateway';

@Module({
  imports: [AuthModule, DatabaseModule, AuthorizationModule],
  providers: [VisitorLiveEvents, VisitorLiveAuthorization, VisitorLiveGateway],
  exports: [VisitorLiveEvents],
})
export class VisitorLiveModule {}
