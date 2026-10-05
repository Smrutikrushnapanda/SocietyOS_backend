import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationContextService } from './organization-context.service';
export declare class OrganizationGuard implements CanActivate {
    private readonly reflector;
    private readonly organizationContextService;
    constructor(reflector: Reflector, organizationContextService: OrganizationContextService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
