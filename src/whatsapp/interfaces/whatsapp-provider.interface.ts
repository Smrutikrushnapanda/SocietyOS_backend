export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type WhatsAppSessionStatus =
  | 'WORKING'
  | 'CONNECTED'
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'STOPPED'
  | 'FAILED'
  | 'UNKNOWN';

export interface WhatsAppHealthResult {
  status: WhatsAppSessionStatus;
  provider: 'waha' | 'mock';
  session: string;
  me?: {
    id?: string;
    pushName?: string;
  };
  details?: Record<string, unknown>;
  lastChecked: Date;
}

export interface IWhatsAppProvider {
  sendMessage(to: string, text: string): Promise<SendWhatsAppMessageResult>;
  sendImage?(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<SendWhatsAppMessageResult>;
  checkHealth(): Promise<WhatsAppHealthResult>;
  getSessionName(): string;
  getProviderName(): 'waha' | 'mock';
}
