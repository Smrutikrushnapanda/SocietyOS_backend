import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Inject,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Redis } from 'ioredis';

@Controller('whatsapp')
@ApiTags('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-webhook-hmac-sha256') signature?: string,
    @Headers('x-hmac-signature') altSignature?: string,
    @Req() req?: { rawBody?: Buffer },
    @Headers('x-webhook-hmac') wahaSignature?: string,
    @Headers('x-webhook-hmac-algorithm') wahaAlgorithm?: string,
  ) {
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;

    if (!webhookSecret?.trim() && process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
      throw new ServiceUnavailableException('Webhook verification is not configured');
    }
    if (webhookSecret?.trim()) {
      const sigToVerify = wahaSignature || signature || altSignature;
      if (wahaSignature && wahaAlgorithm?.toLowerCase() !== 'sha512') {
        throw new UnauthorizedException('Unsupported webhook HMAC algorithm');
      }
      if (!sigToVerify) {
        throw new UnauthorizedException('Missing webhook HMAC signature');
      }

      if (!req?.rawBody) {
        throw new UnauthorizedException('Missing webhook raw body');
      }
      const expectedHmac = createHmac(wahaSignature ? 'sha512' : 'sha256', webhookSecret)
        .update(req.rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedHmac, 'utf8');
      const actualBuf = Buffer.from(sigToVerify, 'utf8');

      if (
        expectedBuf.length !== actualBuf.length ||
        !timingSafeEqual(expectedBuf, actualBuf)
      ) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const eventId = body?.id;
    if (eventId && typeof eventId === 'string') {
      const dedupeKey = `wa:webhook:seen:${eventId}`;
      const isDuplicate = await this.redis.set(
        dedupeKey,
        '1',
        'EX',
        86400,
        'NX',
      );
      if (!isDuplicate) {
        // Event was already processed
        return { success: true, deduplicated: true };
      }
    }

    const eventType = body?.event;
    if (eventType === 'session.status') {
      this.logger.log(`WAHA session status event received`);
    } else if (eventType === 'message.ack') {
      const ack = body?.payload?.ack;
      this.logger.log(`WAHA message delivery ack received: ${ack}`);
    }

    return { success: true };
  }
}
