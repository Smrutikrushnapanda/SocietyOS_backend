import { Reflector } from '@nestjs/core';
import { ExportAuthorizationGuard } from './exports.guard';
import { AuthorizationService } from '../authorization/authorization.service';
import { REQUIRED_PERMISSION_KEY } from '../authorization/require-permission.decorator';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';

/** Phase 10 Step 4: report:export RBAC. */
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

function makeContext(user: any, orgContext: any, permission?: string): any {
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

describe('ExportAuthorizationGuard (Phase 10 Step 4)', () => {
  const reflector = new Reflector();

  function buildGuard(
    roleName: string,
    permissions: string[],
    organizationId: string | null = 'org-1',
  ) {
    const authService = makeAuthorizationService(
      roleName,
      permissions,
      organizationId,
    );
    return {
      guard: new ExportAuthorizationGuard(reflector, authService),
      authService,
    };
  }

  it('allows SUPER_ADMIN (report:export)', async () => {
    const { guard } = buildGuard('SUPER_ADMIN', ['report:export'], null);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', targetOrganizationId: 'org-1', isSuperAdmin: true },
      'report:export',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows SOCIETY_ADMIN (report:export)', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['report:export']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'report:export',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies RESIDENT (no report:export)', async () => {
    const { guard } = buildGuard('RESIDENT', ['report:read', 'notice:read']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'report:export',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies GUARD (no report:export)', async () => {
    const { guard } = buildGuard('GUARD', ['push_token:manage']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1', isSuperAdmin: false },
      'report:export',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies a role that only has report:read (not export)', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['report:read']);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-1' },
      'report:export',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies when there is no authenticated user', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['report:export']);
    const ctx = makeContext(null, { organizationId: 'org-1' }, 'report:export');
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('denies by default when no permission metadata is declared', async () => {
    const { guard } = buildGuard('SOCIETY_ADMIN', ['report:export']);
    const ctx = makeContext({ id: 'user-1' }, { organizationId: 'org-1' }, undefined);
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('passes the resolved target organization to AuthorizationService', async () => {
    const { guard, authService } = buildGuard('SOCIETY_ADMIN', ['report:export']);
    const spy = jest.spyOn(authService, 'hasPermission').mockResolvedValue(true);
    const ctx = makeContext(
      { id: 'user-1' },
      { organizationId: 'org-resolved', targetOrganizationId: 'org-target' },
      'report:export',
    );
    await guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledWith('user-1', 'report:export', 'org-target');
  });

  it('checks report:export exactly once (no fallback permission)', async () => {
    const { guard, authService } = buildGuard('SOCIETY_ADMIN', ['report:export']);
    const spy = jest.spyOn(authService, 'hasPermission').mockResolvedValue(true);
    const ctx = makeContext({ id: 'user-1' }, { organizationId: 'org-1' }, 'report:export');
    await guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toBe('report:export');
  });
});
