export interface StoredFile {
  key: string;
  provider: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  store(key: string, buffer: Buffer, mimeType: string): Promise<StoredFile>;
  retrieve(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
