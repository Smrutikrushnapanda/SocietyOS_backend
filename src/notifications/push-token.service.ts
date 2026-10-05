import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PushToken, PushTokenPlatform } from '../database/entities/push-token.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class PushTokenService {
  constructor(private readonly dataSource: DataSource) {}

  async register(
    userId: string,
    organizationId: string,
    token: string,
    platform: PushTokenPlatform,
  ): Promise<PushToken> {
    const repo = this.dataSource.getRepository(PushToken);

    // Upsert: if this (user_id, token) pair already exists, reactivate and update
    const existing = await repo.findOne({ where: { user_id: userId, token } });
    if (existing) {
      existing.is_active = true;
      existing.last_seen_at = new Date();
      existing.updated_at = new Date();
      existing.organization_id = organizationId;
      return repo.save(existing);
    }

    const pushToken = repo.create({
      id: randomUUID(),
      user_id: userId,
      organization_id: organizationId,
      token,
      platform,
      is_active: true,
      last_seen_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    return repo.save(pushToken);
  }

  async deactivate(tokenId: string, userId: string): Promise<void> {
    const repo = this.dataSource.getRepository(PushToken);
    const pushToken = await repo.findOne({ where: { id: tokenId } });

    if (!pushToken) {
      throw new NotFoundException('Push token not found');
    }
    if (pushToken.user_id !== userId) {
      throw new ForbiddenException('You can only deactivate your own push tokens');
    }

    pushToken.is_active = false;
    pushToken.updated_at = new Date();
    await repo.save(pushToken);
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

  async getActiveTokensForUser(userId: string, organizationId: string): Promise<string[]> {
    const repo = this.dataSource.getRepository(PushToken);
    const tokens = await repo.find({
      where: { user_id: userId, organization_id: organizationId, is_active: true },
    });
    return tokens.map((t) => t.token);
  }

  async getActiveTokensForOrganization(organizationId: string): Promise<string[]> {
    const repo = this.dataSource.getRepository(PushToken);
    const tokens = await repo.find({
      where: { organization_id: organizationId, is_active: true },
    });
    return tokens.map((t) => t.token);
  }
}
