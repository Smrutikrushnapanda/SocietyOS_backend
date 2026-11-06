import { Inject, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { isUUID } from 'class-validator';
import { DataSource, IsNull } from 'typeorm';
import type { Redis } from 'ioredis';
import { UserRole } from '../../database/entities/user-role.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Resident } from '../../database/entities/resident.entity';
import { VisitorVisit } from '../../database/entities/visitor-visit.entity';
import { AuthorizationService } from '../../authorization/authorization.service';
import type { VisitorLiveEvent } from './visitor-live.events';

export interface LiveCredentials {
  accessToken: string;
  organizationId: string;
}
export interface LiveIdentity extends LiveCredentials {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class VisitorLiveAuthorization {
  constructor(
    private readonly source: DataSource,
    private readonly jwt: JwtService,
    private readonly authorization: AuthorizationService,
    @Inject('REDIS_CLIENT') private readonly redis: Pick<Redis, 'get'>,
    @Optional() private readonly auth?: AuthService,
  ) {}

  async authenticate(input: unknown): Promise<LiveIdentity> {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('LIVE_AUTH_DENIED');
    const allowed = ['accessToken', 'organizationId'];
    if (
      Object.keys(input).some((key) => !allowed.includes(key)) ||
      !('accessToken' in input) ||
      typeof input.accessToken !== 'string' ||
      input.accessToken.length > 4096 ||
      !('organizationId' in input) ||
      typeof input.organizationId !== 'string' ||
      !isUUID(input.organizationId)
    )
      throw new Error('LIVE_AUTH_DENIED');
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) throw new Error('LIVE_AUTH_DENIED');
    const payload: unknown = this.jwt.verify(input.accessToken, {
      secret,
      algorithms: ['HS256'],
    });
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub) ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= Date.now()
    )
      throw new Error('LIVE_AUTH_DENIED');
    if (!('sid' in payload) || typeof payload.sid !== 'string' || !this.auth) throw new Error('LIVE_AUTH_DENIED');
    await this.auth.validateAccessSession(payload.sid, payload.sub, input.organizationId);
    const identity = {
      accessToken: input.accessToken,
      organizationId: input.organizationId,
      userId: payload.sub,
      expiresAt: payload.exp * 1000,
    };
    if (!(await this.access(identity))) throw new Error('LIVE_AUTH_DENIED');
    return identity;
  }

  private async access(
    identity: LiveIdentity,
  ): Promise<'staff' | 'resident' | null> {
    const { userId, organizationId } = identity;
    const [user, organization, membership, platform] = await Promise.all([
      this.source.getRepository(User).findOneBy({ id: userId }),
      this.source
        .getRepository(Organization)
        .findOneBy({ id: organizationId, isActive: true }),
      this.source.getRepository(UserRole).findOne({
        where: { userId, organization_id: organizationId },
        relations: { role: true },
      }),
      this.source.getRepository(UserRole).findOne({
        where: { userId, organization_id: IsNull() },
        relations: { role: true },
      }),
    ]);
    if (!user || !organization) return null;
    const scoped =
      platform?.role?.name === 'SUPER_ADMIN' && platform.role.isActive
        ? platform
        : membership;
    if (!scoped?.role?.isActive) return null;
    const permissions = await this.authorization.getRolePermissions(
      scoped.roleId,
    );
    if (
      ['SUPER_ADMIN', 'SOCIETY_ADMIN', 'GUARD'].includes(scoped.role.name) &&
      permissions.includes('visitor:read')
    )
      return 'staff';
    if (scoped.role.name === 'RESIDENT' && permissions.includes('visitor:my'))
      return 'resident';
    return null;
  }

  async canReceive(
    identity: LiveIdentity,
    event: VisitorLiveEvent,
  ): Promise<boolean> {
    if (
      identity.organizationId !== event.organizationId ||
      identity.expiresAt <= Date.now()
    )
      return false;
    const access = await this.access(identity);
    if (!access) return false;
    const visit = await this.source.getRepository(VisitorVisit).findOneBy({
      id: event.visitId,
      organization_id: identity.organizationId,
    });
    if (!visit) return false;
    if (access === 'staff') return true;
    return !!(await this.source.getRepository(Resident).findOneBy({
      id: visit.host_resident_id,
      user_id: identity.userId,
      organization_id: identity.organizationId,
      isActive: true,
    }));
  }
}
