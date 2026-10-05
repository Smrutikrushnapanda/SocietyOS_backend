import { VisitorPassService } from './visitor-pass.service';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { CreateVisitorPassDto } from './dto/create-visitor-pass.dto';
import { UpdateVisitorPassDto } from './dto/update-visitor-pass.dto';
export declare class VisitorPassController {
    private readonly visitorPassService;
    constructor(visitorPassService: VisitorPassService);
    createVisitorPass(createVisitorPassDto: CreateVisitorPassDto): Promise<VisitorPass>;
    findAllVisitorPasses(): Promise<VisitorPass[]>;
    findVisitorPass(id: string): Promise<VisitorPass>;
    updateVisitorPass(id: string, updateVisitorPassDto: UpdateVisitorPassDto): Promise<VisitorPass>;
    removeVisitorPass(id: string): Promise<VisitorPass>;
}
