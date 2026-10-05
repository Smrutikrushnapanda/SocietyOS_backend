import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider, StoredFile } from '../interfaces/IStorageProvider.interface';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async store(key: string, buffer: Buffer, _mimeType: string): Promise<StoredFile> {
    // key is always server-generated (UUID-based) — never derived from user input
    const safeName = path.basename(key); // strip any path components defensively
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Stored file: ${safeName}`);
    return { key: safeName, provider: 'LOCAL', sizeBytes: buffer.length };
  }

  async retrieve(key: string): Promise<Buffer> {
    const safeName = path.basename(key);
    const filePath = path.join(UPLOADS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${safeName}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const safeName = path.basename(key);
    const filePath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
