import { VisitorService } from './visitor.service';
import { Visitor } from '../database/entities/visitor.entity';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
export declare class VisitorController {
    private readonly visitorService;
    constructor(visitorService: VisitorService);
    createVisitor(createVisitorDto: CreateVisitorDto): Promise<Visitor>;
    findAllVisitors(): Promise<Visitor[]>;
    findVisitor(id: string): Promise<Visitor>;
    updateVisitor(id: string, updateVisitorDto: UpdateVisitorDto): Promise<Visitor>;
    removeVisitor(id: string): Promise<Visitor>;
}
