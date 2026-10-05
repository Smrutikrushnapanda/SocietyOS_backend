import { DataSource } from 'typeorm';
import { PushToken, PushTokenPlatform } from '../database/entities/push-token.entity';
export declare class PushTokenService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    register(userId: string, organizationId: string, token: string, platform: PushTokenPlatform): Promise<PushToken>;
    deactivate(tokenId: string, userId: string): Promise<void>;
    deactivateByTokenValues(tokens: string[]): Promise<void>;
    getActiveTokensForUser(userId: string, organizationId: string): Promise<string[]>;
    getActiveTokensForOrganization(organizationId: string): Promise<string[]>;
}
