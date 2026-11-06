import { Injectable } from '@nestjs/common';
import {
  IWhatsAppProvider,
  SendWhatsAppMessageResult,
  WhatsAppHealthResult,
} from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class MockWhatsAppProvider implements IWhatsAppProvider {
  public sentMessages: Array<{ to: string; text: string; timestamp: Date }> = [];
  public healthStatus: 'WORKING' | 'STOPPED' | 'FAILED' = 'WORKING';

  getProviderName(): 'mock' {
    return 'mock';
  }

  getSessionName(): string {
    return 'mock-session';
  }

  async sendMessage(to: string, text: string): Promise<SendWhatsAppMessageResult> {
    this.sentMessages.push({ to, text, timestamp: new Date() });
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<SendWhatsAppMessageResult> {
    this.sentMessages.push({
      to,
      text: `[IMAGE: ${imageUrl}] ${caption || ''}`,
      timestamp: new Date(),
    });
    return {
      success: true,
      messageId: `mock_img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  async checkHealth(): Promise<WhatsAppHealthResult> {
    return {
      status: this.healthStatus,
      provider: 'mock',
      session: 'mock-session',
      me: {
        id: '919999999999@c.us',
        pushName: 'MockSocietyOS',
      },
      lastChecked: new Date(),
    };
  }

  clear(): void {
    this.sentMessages = [];
  }
}
