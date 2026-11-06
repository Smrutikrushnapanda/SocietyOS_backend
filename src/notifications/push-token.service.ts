import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { isUUID } from 'class-validator';
import {
  PushToken,
  PushTokenPlatform,
} from '../database/entities/push-token.entity';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class PushTokenService {
  constructor(private readonly dataSource: DataSource) {}

  async register(
    userId: string,
    organizationId: string,
    token: string,
    platform: PushTokenPlatform,
    previousTokenId?: string,
  ): Promise<PushToken> {
    this.requireScope(userId, organizationId);
    if (
      typeof token !== 'string' ||
      !/^\S{1,500}$/.test(token) ||
      !Object.values(PushTokenPlatform).includes(platform)
    ) {
      throw new BadRequestException('Invalid push registration');
    }
    return this.dataSource
      .transaction(async (manager) => {
        // Serialize claims without putting the registration token in advisory-lock parameters.
        const digest = createHash('sha256')
          .update(token)
          .digest('hex')
          .slice(0, 16);
        await manager.query('SELECT pg_advisory_xact_lock($1::bigint)', [
          BigInt.asIntN(64, BigInt('0x' + digest)).toString(),
        ]);
        const repo = manager.getRepository(PushToken);
        const owners = await repo.find({ where: { token } });
        if (owners.some((owner) => owner.user_id !== userId)) {
          throw new ConflictException(
            'Push subscription cannot be claimed; reset browser push subscription',
          );
        }
        let record = owners[0];
        if (
          record &&
          record.organization_id !== organizationId &&
          record.is_active
        ) {
          throw new ConflictException(
            'Revoke current organization push binding before registering another',
          );
        }
        if (previousTokenId && previousTokenId !== record?.id) {
          await repo.update(
            {
              id: previousTokenId,
              user_id: userId,
              organization_id: organizationId,
            },
            { is_active: false, updated_at: new Date() },
          );
        }
        const now = new Date();
        record = repo.create({
          ...record,
          id: record?.id ?? randomUUID(),
          user_id: userId,
          organization_id: organizationId,
          token,
          platform,
          is_active: true,
          last_seen_at: now,
          updated_at: now,
          created_at: record?.created_at ?? now,
        });
        return repo.save(record);
      })
      .catch((error: unknown) => {
        if (error instanceof ConflictException) throw error;
        throw new ServiceUnavailableException('Push registration unavailable');
      });
  }

  private requireScope(userId: string, organizationId?: string): void {
    if (!userId || !organizationId)
      throw new ForbiddenException(
        'Authenticated organization context required',
      );
  }

  async deactivate(
    tokenId: string,
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    this.requireScope(userId, organizationId);
    if (!isUUID(tokenId)) throw new NotFoundException('Push token not found');
    const repo = this.dataSource.getRepository(PushToken);
    const pushToken = await repo.findOne({ where: { id: tokenId } });
    if (!pushToken) return;
    if (pushToken.organization_id !== organizationId)
      throw new NotFoundException('Push token not found');
    if (pushToken.user_id !== userId)
      throw new ForbiddenException(
        'You can only deactivate your own push tokens',
      );
    await repo.update(
      { id: tokenId, user_id: userId, organization_id: organizationId },
      { is_active: false, updated_at: new Date() },
    );
  }

  async deactivateByTokenValues(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    const repo = this.dataSource.getRepository(PushToken);
    for (const token of tokens) {
      await repo
        .createQueryBuilder()
        .update(PushToken)
        .set({ is_active: false, updated_at: new Date() })
        .where('token = :token', { token })
        .execute();
    }
  }

  private async excludeAmbiguousTokens(
    records: PushToken[],
  ): Promise<string[]> {
    if (!records.length) return [];
    const values = records.map((record) => record.token);
    const owners = await this.dataSource
      .getRepository(PushToken)
      .find({ where: { token: In(values) } });
    return [...new Set(values)].filter(
      (token) => owners.filter((owner) => owner.token === token).length === 1,
    );
  }

  async getActiveTokensForUser(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const repo = this.dataSource.getRepository(PushToken);
    const tokens = await repo.find({
      where: {
        user_id: userId,
        organization_id: organizationId,
        is_active: true,
      },
    });
    return this.excludeAmbiguousTokens(tokens);
  }

  async getActiveTokensForOrganization(
    organizationId: string,
  ): Promise<string[]> {
    const repo = this.dataSource.getRepository(PushToken);
    const tokens = await repo.find({
      where: { organization_id: organizationId, is_active: true },
    });
    return this.excludeAmbiguousTokens(tokens);
  }
}
