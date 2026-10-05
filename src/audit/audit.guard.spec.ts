import { Reflector } from '@nestjs/core';
import { AuditAuthorizationGuard } from './audit.guard';
import { AuthorizationService } from '../authorization/authorization.service';
import { REQUIRED_PERMISSION_KEY } from '../authorization/require-permission.decorator';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';

function makeAuthorizationService(
  roleName: string,
  permissions: string[],
  organizationId: string | null,
): AuthorizationService {
  const userRole = {
    userId: 'user-1',
    roleId: 'role-1',
    organization_id: organizationId,
  };
  const role = { id: 'role-1', name: roleName };

  const dataSource: any = {
    getRepository: (entity: any) => {
      if (entity === UserRole) {
        return { findOneBy: async () => userRole };
      }
      if (entity === Role) {
        return { findOneBy: async () => role };
      }
      // 'RolePermission'
      return {
        query: async () =>
          permissions.map((name) => ({
            permission_name: name,
            permission_is_active: 1,
          })),
      };
    },
  };

  return new AuthorizationService(dataSource);
}

function makeContext(
  user: any,
  orgContext: any,
  permission?: string,
): any {
  const handler = () => undefined;
  if (permission) {
    Reflect.defineMetadata(REQUIRED_PERMISSION_KEY, permission, handler);
  }
  const request = { user, orgContext };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => handler,
  };
}

describe('AuditAuthorizationGuard (Phase 10)', () => {
  const reflector = new Reflector();

  function buildGuard(
    roleName: string,
    permissions: string[],
    organizationId: string | null = 'org-1',
  ): { guard: AuditAuthorizationGuard; authService: AuthorizationService } {
    const authService = makeAuthorizationService(
      roleName,
      permissions,
      organizationId,
    );
    const guard = new AuditAuthorizationGuard(reflector, authService);
    return { guard, authService };
  }

  it('allows SUPER_ADMIN (audit:read)', async () => {
    const { guard } = buildGuard('SUPER_ADMIN', ['audit:read'], null);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', targetOrganizationId: 'org-1', isSuperAdmin: true },
      'audit:read',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows SOCIETY_ADMIN (audit:read)', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['audit:read']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'audit:read',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies RESIDENT (no audit:read)', async () => {
    const { guard } = buildGuard('RESIDENT', ['complaint:create', 'notice:read']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'audit:read',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies GUARD (no audit:read)', async () => {
    const { guard } = buildGuard('GUARD', ['push_token:manage']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'audit:read',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies when there is no authenticated user', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['audit:read']);
    const ctx = makeContext(null, { organizationId: 'org-1' }, 'audit:read');
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies by default when no permission metadata is declared', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['audit:read']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1' },
      undefined,
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('passes the resolved target organization to AuthorizationService', async () => {
    const { guard, authService } = buildGuard('SOCIETY_ADMIN', ['audit:read']);
    const spy = jest.spyOn(authService, 'hasPermission').mockResolvedValue(true);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-resolved', targetOrganizationId: 'org-target' },
      'audit:read',
    );
    await guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledWith('user-1', 'audit:read', 'org-target');
  });
});
