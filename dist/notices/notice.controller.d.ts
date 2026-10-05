import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto';
import { Notice } from '../database/entities/notice.entity';
export declare class NoticeController {
    private readonly noticeService;
    constructor(noticeService: NoticeService);
    create(createDto: CreateNoticeDto, req: any): Promise<Notice>;
    findAll(req: any): Promise<Notice[]>;
    findOne(req: any, id: string): Promise<Notice | null>;
    publish(req: any, id: string): Promise<Notice | null>;
    expire(req: any, id: string): Promise<Notice | null>;
}
