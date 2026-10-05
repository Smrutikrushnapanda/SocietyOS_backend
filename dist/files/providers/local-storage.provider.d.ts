import { IStorageProvider, StoredFile } from '../interfaces/IStorageProvider.interface';
export declare class LocalStorageProvider implements IStorageProvider {
    private readonly logger;
    constructor();
    store(key: string, buffer: Buffer, _mimeType: string): Promise<StoredFile>;
    retrieve(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
}
