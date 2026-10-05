import { FileService } from './file.service';
export declare class FileController {
    private readonly fileService;
    constructor(fileService: FileService);
    upload(req: any, file: any): Promise<import("../database/entities/file-metadata.entity").FileMetadata>;
    retrieve(req: any, id: string, res: any): Promise<void>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
