import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization/authorization.service';
export declare class ReportAuthorizationGuard implements CanActivate {
    private readonly reflector;
    private readonly authorizationService;
    constructor(reflector: Reflector, authorizationService: AuthorizationService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
