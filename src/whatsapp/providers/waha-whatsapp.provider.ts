import { Injectable, Logger } from '@nestjs/common';
import {
  IWhatsAppProvider,
  SendWhatsAppMessageResult,
  WhatsAppHealthResult,
  WhatsAppSessionStatus,
} from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class WahaWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(WahaWhatsAppProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sessionName: string;
  private readonly requestTimeoutMs = 30000;
  private readonly maxRetries = 2;

  constructor() {
    this.baseUrl = (
      process.env.WAHA_BASE_URL ||
      process.env.WHATSAPP_BASE_URL ||
      'http://127.0.0.1:3001'
    ).replace(/\/+$/, '');
    this.apiKey =
      process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY || '';
    this.sessionName =
      process.env.WAHA_SESSION_NAME ||
      process.env.WHATSAPP_SESSION_NAME ||
      'session_01m5amp8ak239hr4cs57ydvaqm';
  }

  getProviderName(): 'waha' {
    return 'waha';
  }

  getSessionName(): string {
    return this.sessionName;
  }

  private normalizeChatId(rawPhone: string): string {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `91${digits}@c.us`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `${digits}@c.us`;
    }
    if (rawPhone.endsWith('@c.us') || rawPhone.endsWith('@g.us')) {
      return rawPhone;
    }
    return `${digits}@c.us`;
  }

  async sendMessage(to: string, text: string): Promise<SendWhatsAppMessageResult> {
    const health = await this.checkHealth();
    if (!['WORKING', 'CONNECTED'].includes(health.status)) {
      return { success: false, error: String(health.details?.error || `WhatsApp session ${health.status}. Check gateway connection status.`) };
    }
    const chatId = this.normalizeChatId(to);
    const url = `${this.baseUrl}/api/sendText`;
    const payload = {
      chatId,
      text,
      session: this.sessionName,
    };

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });

        if (!response.ok) {
          const status = response.status;
          let errorMsg = `WhatsApp service responded with status ${status}`;
          try {
            const errData = await response.json();
            if (errData?.status === 'SCAN_QR_CODE') {
              errorMsg = 'WhatsApp session disconnected. Please scan QR code in Admin WhatsApp settings.';
            } else if (errData?.error) {
              errorMsg = String(errData.error);
            }
          } catch {
            // Use default errorMsg
          }

          if (status === 429 && attempt < this.maxRetries) {
            attempt++;
            await new Promise((res) => setTimeout(res, 300 * attempt));
            continue;
          }
          this.logger.warn(`WAHA message send failed HTTP ${status}: ${errorMsg}`);
          return {
            success: false,
            error: errorMsg,
          };
        }

        const data: any = await response.json();
        const messageId = typeof data?.id === 'string' ? data.id : data?.id?._serialized || data?._data?.id?._serialized;
        return {
          success: true,
          messageId: typeof messageId === 'string' ? messageId : undefined,
        };
      } catch (err: any) {
        const isAbort = ['AbortError', 'TimeoutError'].includes(err?.name);
        this.logger.warn(
          `WAHA message send error: ${isAbort ? 'Request timed out' : 'Connection failed'}`,
        );
        return {
          success: false,
          error: isAbort
            ? 'WhatsApp gateway response timed out. Delivery is unconfirmed; check WhatsApp before sending again.'
            : 'WhatsApp provider connection unavailable',
        };
      }
    }

    return {
      success: false,
      error: 'WhatsApp delivery retries exhausted',
    };
  }

  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<SendWhatsAppMessageResult> {
    const health = await this.checkHealth();
    if (!['WORKING', 'CONNECTED'].includes(health.status)) {
      return { success: false, error: String(health.details?.error || `WhatsApp session ${health.status}. Check gateway connection status.`) };
    }
    const chatId = this.normalizeChatId(to);
    const url = `${this.baseUrl}/api/sendImage`;
    const payload = {
      chatId,
      session: this.sessionName,
      file: {
        url: imageUrl,
      },
      caption: caption || '',
    };

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });

        if (!response.ok) {
          const status = response.status;
          let errorMsg = `WhatsApp service responded with status ${status}`;
          try {
            const errData = await response.json();
            if (errData?.status === 'SCAN_QR_CODE') {
              errorMsg = 'WhatsApp session disconnected. Please scan QR code in Admin WhatsApp settings.';
            } else if (errData?.error) {
              errorMsg = String(errData.error);
            }
          } catch {}

          if (status === 429 && attempt < this.maxRetries) {
            attempt++;
            await new Promise((res) => setTimeout(res, 300 * attempt));
            continue;
          }
          this.logger.warn(`WAHA sendImage failed HTTP ${status}: ${errorMsg}`);
          return {
            success: false,
            error: errorMsg,
          };
        }

        const data: any = await response.json();
        const messageId = typeof data?.id === 'string' ? data.id : data?.id?._serialized || data?._data?.id?._serialized;
        return {
          success: true,
          messageId: typeof messageId === 'string' ? messageId : undefined,
        };
      } catch (err: any) {
        const isAbort = ['AbortError', 'TimeoutError'].includes(err?.name);
        this.logger.warn(
          `WAHA sendImage error: ${isAbort ? 'Request timed out' : 'Connection failed'}`,
        );
        return {
          success: false,
          error: isAbort
            ? 'WhatsApp gateway response timed out. Delivery is unconfirmed; check WhatsApp before sending again.'
            : 'WhatsApp provider connection unavailable',
        };
      }
    }

    return {
      success: false,
      error: 'WhatsApp delivery retries exhausted',
    };
  }

  async checkHealth(): Promise<WhatsAppHealthResult> {
    const now = new Date();
    try {
      const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(this.sessionName)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const sessionData: any = await response.json();
        const rawStatus = (sessionData?.status || 'UNKNOWN').toUpperCase();
        let status: WhatsAppSessionStatus = 'UNKNOWN';
        if (rawStatus === 'WORKING') status = 'WORKING';
        else if (rawStatus === 'CONNECTED') status = 'CONNECTED';
        else if (rawStatus === 'STARTING') status = 'STARTING';
        else if (rawStatus === 'SCAN_QR_CODE') status = 'SCAN_QR_CODE';
        else if (rawStatus === 'STOPPED') status = 'STOPPED';
        else if (rawStatus === 'FAILED') status = 'FAILED';

        return {
          status,
          provider: 'waha',
          session: this.sessionName,
          me: sessionData?.me
            ? {
                id: sessionData.me.id,
                pushName: sessionData.me.pushName,
              }
            : undefined,
          details: {
            error: rawStatus === 'FAILED'
              ? 'WhatsApp session failed inside the gateway. Restart the session in WAHA, then refresh status.'
              : rawStatus === 'SCAN_QR_CODE'
                ? 'WhatsApp pairing required. Scan the session QR code in WAHA.'
                : undefined,
            uptime: sessionData?.timestamps?.activity,
            engine: sessionData?.engine?.engine,
          },
          lastChecked: now,
        };
      }

      return {
        status: 'FAILED',
        provider: 'waha',
        session: this.sessionName,
        details: {
          httpStatus: response.status,
          error: response.status === 401 || response.status === 403
            ? 'WhatsApp gateway rejected API credentials. Check backend WAHA API key.'
            : response.status === 404
              ? 'Configured WhatsApp session was not found in WAHA.'
              : `WhatsApp gateway status check failed (HTTP ${response.status}).`,
        },
        lastChecked: now,
      };
    } catch (error: any) {
      return {
        status: 'UNKNOWN',
        provider: 'waha',
        session: this.sessionName,
        details: { error: ['AbortError', 'TimeoutError'].includes(error?.name)
          ? 'WhatsApp gateway status check timed out. Session state is unknown.'
          : 'Cannot reach WhatsApp gateway. Check backend gateway address and service.' },
        lastChecked: now,
      };
    }
  }
}
